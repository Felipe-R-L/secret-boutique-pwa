"use server";

import {
  initializeCheckoutSchema,
  HOME_DELIVERY_FEE,
  isInPersonPayment,
} from "@/lib/schemas";
import {
  createPixOrder,
  extractPixData,
  getOrderById,
} from "@/lib/mercadopago/client";
import {
  decrementOrderStockByVariants,
  parsePersistedProductVariants,
} from "@/lib/server/product-variants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPushToAdmins } from "@/lib/push/server";
import { describeInPersonPayment } from "@/lib/payment-labels";
import { randomBytes } from "node:crypto";

// Email "de fachada" para montar o pedido Pix no Mercado Pago quando o pedido
// não tem email (venda lançada pela recepção). Configurável via env.
const FALLBACK_PIX_PAYER_EMAIL =
  process.env.RECEPTION_PIX_EMAIL || "vendas@thesecretboutique.com.br";

// Anti-trote: pedidos com pagamento na entrega ainda não pagos por quarto.
// Passou disso, o hóspede fala com a recepção.
const MAX_OPEN_IN_PERSON_ORDERS_PER_ROOM = 2;
const OPEN_ORDER_WINDOW_MS = 3 * 60 * 60 * 1000;

function generatePickupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

type CheckoutResult =
  | {
      ok: true;
      orderId: string;
      totalAmount: number;
      pickupCode: string;
      paymentMethod: "PIX" | "CARD" | "CASH";
    }
  | { ok: false; error: string };

export async function initializeCheckout(
  input: unknown,
): Promise<CheckoutResult> {
  const parsed = initializeCheckoutSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors.join(", ") ||
        "Invalid checkout payload",
    };
  }

  const supabase = createServiceRoleClient();

  const productIds = parsed.data.items.map((item) => item.productId);
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,price,in_stock,stock_quantity,variants")
    .in("id", productIds);

  if (productError || !products) {
    return {
      ok: false,
      error: productError?.message ?? "Could not fetch product prices",
    };
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  let totalAmount = 0;
  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return { ok: false, error: `Product not found: ${item.productId}` };
    }

    const variants = parsePersistedProductVariants(product.variants);
    const selectedVariant = item.variantId
      ? variants.find((variant) => variant.id === item.variantId)
      : undefined;

    if (variants.length > 0 && !selectedVariant) {
      return {
        ok: false,
        error: `Selecione uma variante válida para o produto ${item.productId}`,
      };
    }

    const availableStock = selectedVariant
      ? selectedVariant.stock_quantity
      : product.stock_quantity;
    const available = selectedVariant
      ? selectedVariant.in_stock
      : product.in_stock !== false;

    if (!available) {
      return {
        ok: false,
        error: `Produto fora de estoque: ${item.productId}`,
      };
    }

    if (typeof availableStock === "number" && availableStock < item.quantity) {
      return {
        ok: false,
        error: `Estoque insuficiente para o produto. Disponível: ${availableStock}, solicitado: ${item.quantity}`,
      };
    }

    totalAmount +=
      Number(selectedVariant?.price ?? product.price) * item.quantity;
  }

  // Taxa fixa para entrega a domicílio; retirada/quarto não têm frete.
  const deliveryFee =
    parsed.data.deliveryMethod === "HOME_DELIVERY" ? HOME_DELIVERY_FEE : 0;
  totalAmount += deliveryFee;

  totalAmount = Number(totalAmount.toFixed(2));

  const paymentMethod = parsed.data.paymentMethod;
  const inPerson = isInPersonPayment(paymentMethod);
  const roomNumber =
    parsed.data.deliveryMethod === "ROOM_DELIVERY"
      ? (parsed.data.roomNumber?.trim() ?? null)
      : null;

  if (
    parsed.data.cashChangeFor !== undefined &&
    parsed.data.cashChangeFor < totalAmount
  ) {
    return {
      ok: false,
      error: "O valor para troco precisa ser maior ou igual ao total do pedido.",
    };
  }

  if (inPerson && roomNumber) {
    const since = new Date(Date.now() - OPEN_ORDER_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("room_number", roomNumber)
      .eq("status", "PENDING")
      .in("payment_method", ["CARD", "CASH"])
      .gte("created_at", since);

    if ((count ?? 0) >= MAX_OPEN_IN_PERSON_ORDERS_PER_ROOM) {
      return {
        ok: false,
        error:
          "Este quarto já tem pedidos aguardando entrega. Para pedir mais, fale com a recepção.",
      };
    }
  }

  // Generate a unique pickup code
  let pickupCode = generatePickupCode();
  let retries = 0;
  while (retries < 5) {
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("pickup_code", pickupCode)
      .maybeSingle();

    if (!existing) break;
    pickupCode = generatePickupCode();
    retries++;
  }

  const isHomeDelivery = parsed.data.deliveryMethod === "HOME_DELIVERY";

  // Pagamento presencial não pede nome: identifica o pedido pelo quarto.
  const customerName =
    parsed.data.customerName?.trim() ||
    (roomNumber ? `Quarto ${roomNumber}` : "Cliente na recepção");

  const orderInsert = {
    customer_name: customerName,
    customer_email: inPerson ? null : (parsed.data.customerEmail ?? null),
    delivery_method: parsed.data.deliveryMethod,
    room_number: roomNumber,
    delivery_fee: deliveryFee,
    delivery_cep: isHomeDelivery
      ? ((parsed.data.deliveryCep ?? "").replace(/\D/g, "") || null)
      : null,
    delivery_street: isHomeDelivery
      ? (parsed.data.deliveryStreet?.trim() ?? null)
      : null,
    delivery_number: isHomeDelivery
      ? (parsed.data.deliveryNumber?.trim() ?? null)
      : null,
    delivery_complement: isHomeDelivery
      ? (parsed.data.deliveryComplement?.trim() || null)
      : null,
    delivery_neighborhood: isHomeDelivery
      ? (parsed.data.deliveryNeighborhood?.trim() ?? null)
      : null,
    delivery_city: isHomeDelivery
      ? (parsed.data.deliveryCity?.trim() ?? null)
      : null,
    delivery_state: isHomeDelivery
      ? (parsed.data.deliveryState?.trim().toUpperCase() ?? null)
      : null,
    payment_method: paymentMethod,
    cash_change_for:
      paymentMethod === "CASH" ? (parsed.data.cashChangeFor ?? null) : null,
    channel: "SITE" as const,
    status: "PENDING" as const,
    total_amount: totalAmount,
    pickup_code: pickupCode,
  };

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert(orderInsert)
    .select("id")
    .single();

  if (orderError || !orderData) {
    return {
      ok: false,
      error: orderError?.message ?? "Could not create order",
    };
  }

  const orderItems = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const variants = parsePersistedProductVariants(product.variants);
    const selectedVariant = item.variantId
      ? variants.find((variant) => variant.id === item.variantId)
      : undefined;

    return {
      order_id: orderData.id,
      product_id: item.productId,
      variant_id: selectedVariant?.id ?? null,
      variant_label: selectedVariant?.label ?? null,
      variant_attributes: selectedVariant?.attributes ?? null,
      quantity: item.quantity,
      unit_price: Number(selectedVariant?.price ?? product.price),
    };
  });

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderData.id);
    return { ok: false, error: itemsError.message };
  }

  // Pix avisa a equipe quando o pagamento confirma (webhook). No presencial
  // não há confirmação online: o aviso sai agora, para a recepção preparar.
  if (inPerson) {
    try {
      const total = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(totalAmount);
      const destino = roomNumber
        ? `Quarto ${roomNumber}`
        : "Retirada na recepção";
      await sendPushToAdmins({
        title: "Novo pedido — pagar na entrega 🛍️",
        body: `${destino} • ${total} • ${describeInPersonPayment(
          paymentMethod,
          orderInsert.cash_change_for,
        )}`,
        url: "/admin/orders",
        tag: `order-${orderData.id}`,
      });
    } catch (pushError) {
      console.error("Failed sending push notification", pushError);
    }
  }

  return {
    ok: true,
    orderId: orderData.id,
    totalAmount,
    pickupCode,
    paymentMethod,
  };
}

export async function checkOrderStatus(orderId: unknown) {
  if (typeof orderId !== "string") {
    return { ok: false as const, error: "Invalid order id" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id,status,total_amount,pickup_code,mercadopago_order_id")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Order not found" };
  }

  // If order is still PENDING and has a MP order, poll MP directly as fallback
  // (webhooks can't reach localhost in dev)
  if (data.status === "PENDING" && data.mercadopago_order_id) {
    try {
      const mpOrder = await getOrderById(data.mercadopago_order_id);
      const mpPayment = mpOrder.transactions?.payments?.[0];
      const mpStatus = mpPayment?.status ?? mpOrder.status;

      // Check if MP reports it as paid/approved
      const isPaid =
        ["approved", "paid", "action_required"].includes(mpStatus) &&
        mpPayment?.status_detail === "waiting_transfer"
          ? false // still waiting for transfer
          : ["approved", "paid"].includes(mpStatus) ||
            mpOrder.status === "processed";

      if (isPaid) {
        // Generate pickup code
        let pickupCode = data.pickup_code;
        if (!pickupCode) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          const bytes = new Uint8Array(6);
          crypto.getRandomValues(bytes);
          pickupCode = Array.from(bytes, (b) => chars[b % chars.length]).join(
            "",
          );
        }

        // Transição condicionada a PENDING: se o webhook chegou primeiro,
        // zero linhas mudam e os efeitos colaterais não rodam de novo.
        const { data: updatedRows } = await supabase
          .from("orders")
          .update({
            status: "PAID",
            pickup_code: pickupCode,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id)
          .eq("status", "PENDING")
          .select("id");

        if ((updatedRows?.length ?? 0) === 0) {
          // Outro caminho (webhook) já confirmou — devolve o estado real do
          // banco para não exibir um código diferente do gravado.
          const { data: fresh } = await supabase
            .from("orders")
            .select("id,status,total_amount,pickup_code")
            .eq("id", data.id)
            .maybeSingle();

          return {
            ok: true as const,
            data: {
              id: data.id,
              status: fresh?.status ?? "PAID",
              totalAmount: Number(fresh?.total_amount ?? data.total_amount),
              pickupCode: fresh?.pickup_code ?? null,
            },
          };
        }

        try {
          await decrementOrderStockByVariants(supabase, data.id);
        } catch (stockError) {
          console.error(
            "Failed to deduct stock after fallback payment confirmation:",
            stockError,
          );
        }

        // Send voucher email (best effort)
        try {
          const { sendVoucherEmail } = await import("@/lib/services/email");
          await sendVoucherEmail(data.id);
        } catch (emailErr) {
          console.error("Failed to send voucher email:", emailErr);
        }

        return {
          ok: true as const,
          data: {
            id: data.id,
            status: "PAID",
            totalAmount: Number(data.total_amount),
            pickupCode,
          },
        };
      }
    } catch (mpError) {
      console.error("MP polling fallback error:", mpError);
      // Continue with DB status
    }
  }

  return {
    ok: true as const,
    data: {
      id: data.id,
      status: data.status,
      totalAmount: Number(data.total_amount),
      pickupCode: data.pickup_code,
    },
  };
}

// Payer info is passed through to Mercado Pago only — NOT stored in our DB
type PayerInfo = {
  firstName: string;
  lastName: string;
  cpf: string;
  email: string;
};

export async function generatePixOrder(
  orderId: unknown,
  payerInfo?: PayerInfo,
) {
  if (typeof orderId !== "string") {
    return { ok: false as const, error: "Invalid order id" };
  }

  const supabase = createServiceRoleClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id,customer_name,customer_email,payment_method,total_amount,status,mercadopago_order_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return {
      ok: false as const,
      error: orderError?.message ?? "Order not found",
    };
  }

  if (order.payment_method !== "PIX") {
    return {
      ok: false as const,
      error: "Este pedido é pago na entrega, não por Pix.",
    };
  }

  let mpOrderId = order.mercadopago_order_id;

  if (!mpOrderId) {
    const firstName = payerInfo?.firstName || order.customer_name.split(" ")[0];
    const lastName =
      payerInfo?.lastName ||
      order.customer_name.split(" ").slice(1).join(" ") ||
      order.customer_name;

    const payload: Record<string, unknown> = {
      type: "online",
      processing_mode: "automatic",
      external_reference: order.id,
      total_amount: String(Number(order.total_amount).toFixed(2)),
      description: `Pedido ${order.id}`,
      payer: {
        email: order.customer_email ?? FALLBACK_PIX_PAYER_EMAIL,
        first_name: firstName,
        last_name: lastName,
        ...(payerInfo?.cpf
          ? {
              identification: {
                type: "CPF",
                number: payerInfo.cpf.replace(/\D/g, ""),
              },
            }
          : {}),
      },
      transactions: {
        payments: [
          {
            amount: String(Number(order.total_amount).toFixed(2)),
            payment_method: {
              id: "pix",
              type: "bank_transfer",
            },
          },
        ],
      },
    };

    let mpOrder;
    try {
      mpOrder = await createPixOrder(payload);
    } catch (error) {
      return {
        ok: false as const,
        error:
          error instanceof Error ? error.message : "Could not create PIX order",
      };
    }

    if (!mpOrder.id) {
      return {
        ok: false as const,
        error: "Mercado Pago did not return order id",
      };
    }

    mpOrderId = String(mpOrder.id);

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        mercadopago_order_id: mpOrderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      return { ok: false as const, error: updateError.message };
    }

    const pix = extractPixData(mpOrder);
    return {
      ok: true as const,
      orderId: order.id,
      mercadopagoOrderId: mpOrderId,
      qrCodeBase64: pix.qrCodeBase64,
      digitableLine: pix.qrCodeText,
      ticketUrl: pix.ticketUrl,
      status: order.status,
    };
  }

  try {
    const mpOrder = await getOrderById(mpOrderId);
    const pix = extractPixData(mpOrder);

    return {
      ok: true as const,
      orderId: order.id,
      mercadopagoOrderId: mpOrderId,
      qrCodeBase64: pix.qrCodeBase64,
      digitableLine: pix.qrCodeText,
      ticketUrl: pix.ticketUrl,
      status: order.status,
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not fetch PIX order",
    };
  }
}
