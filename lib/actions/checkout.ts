"use server";

import { initializeCheckoutSchema } from "@/lib/schemas";
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
import { randomBytes } from "node:crypto";

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
  | { ok: true; orderId: string; totalAmount: number }
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

    totalAmount += Number(selectedVariant?.price ?? product.price) * item.quantity;
  }

  totalAmount = Number(totalAmount.toFixed(2));

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

  const orderInsert = {
    customer_name: parsed.data.customerName,
    customer_email: parsed.data.customerEmail,
    delivery_method: parsed.data.deliveryMethod,
    room_number:
      parsed.data.deliveryMethod === "ROOM_DELIVERY"
        ? (parsed.data.roomNumber?.trim() ?? null)
        : null,
    payment_method: "PIX" as const,
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

  return {
    ok: true,
    orderId: orderData.id,
    totalAmount,
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
      const isPaid = ["approved", "paid", "action_required"].includes(mpStatus) 
        && mpPayment?.status_detail === "waiting_transfer" 
        ? false // still waiting for transfer
        : ["approved", "paid"].includes(mpStatus) || mpOrder.status === "processed";

      if (isPaid) {
        // Generate pickup code
        let pickupCode = data.pickup_code;
        if (!pickupCode) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          const bytes = new Uint8Array(6);
          crypto.getRandomValues(bytes);
          pickupCode = Array.from(bytes, (b) => chars[b % chars.length]).join("");
        }

        await supabase
          .from("orders")
          .update({
            status: "PAID",
            pickup_code: pickupCode,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);

        try {
          await decrementOrderStockByVariants(supabase, data.id);
        } catch (stockError) {
          console.error("Failed to deduct stock after fallback payment confirmation:", stockError);
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
      "id,customer_name,customer_email,total_amount,status,mercadopago_order_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return {
      ok: false as const,
      error: orderError?.message ?? "Order not found",
    };
  }

  let mpOrderId = order.mercadopago_order_id;

  if (!mpOrderId) {
    const firstName = payerInfo?.firstName || order.customer_name.split(" ")[0];
    const lastName =
      payerInfo?.lastName || order.customer_name.split(" ").slice(1).join(" ") || order.customer_name;

    const payload: Record<string, unknown> = {
      type: "online",
      processing_mode: "automatic",
      external_reference: order.id,
      total_amount: String(Number(order.total_amount).toFixed(2)),
      description: `Pedido ${order.id}`,
      payer: {
        email: order.customer_email,
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
