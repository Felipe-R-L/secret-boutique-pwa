"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdminContext } from "@/lib/auth/admin";
import { logAudit } from "@/lib/audit/log";
import {
  checkoutItemSchema,
  IN_PERSON_PAYMENT_METHODS,
  isInPersonPayment,
  paymentMethodSchema,
} from "@/lib/schemas";
import {
  decrementOrderStockByVariants,
  parsePersistedProductVariants,
} from "@/lib/server/product-variants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  cancelMpOrder,
  createPointOrder,
  getOrderById,
  getPointTerminalId,
} from "@/lib/mercadopago/client";
import { centsToDecimalString } from "@/lib/money";
import {
  isPointOrder,
  pointStateOf,
  releaseOpenPointOrder,
  settlePaidPointOrder,
  type PointState,
} from "@/lib/server/point-payment";

function generatePickupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

const receptionOrderSchema = z
  .object({
    items: z.array(checkoutItemSchema).min(1),
    // Balcão só entrega na recepção ou no quarto — sem endereço externo.
    deliveryMethod: z.enum(["MOTEL_PICKUP", "ROOM_DELIVERY"]),
    roomNumber: z.string().trim().max(20).optional(),
    customerName: z.string().trim().max(120).optional(),
    paymentMethod: paymentMethodSchema.default("PIX"),
    // Centavos, até R$ 10.000.
    cashChangeForCents: z.number().int().positive().max(1_000_000).optional(),
    // Cartão/dinheiro já recebidos no balcão: o pedido nasce finalizado.
    settleNow: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasRoom = Boolean(
      value.roomNumber && value.roomNumber.trim().length > 0,
    );
    if (value.deliveryMethod === "ROOM_DELIVERY" && !hasRoom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o número do quarto para entrega no quarto.",
        path: ["roomNumber"],
      });
    }
    if (value.deliveryMethod === "MOTEL_PICKUP" && hasRoom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Retirada na recepção não usa número de quarto.",
        path: ["roomNumber"],
      });
    }
    if (
      value.cashChangeForCents !== undefined &&
      value.paymentMethod !== "CASH"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Troco só vale para pagamento em dinheiro.",
        path: ["cashChangeForCents"],
      });
    }
    if (value.settleNow && !isInPersonPayment(value.paymentMethod)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pix é confirmado pelo Mercado Pago, não no balcão.",
        path: ["settleNow"],
      });
    }
  });

type ReceptionResult =
  | {
      ok: true;
      orderId: string;
      totalCents: number;
      status: "PENDING" | "COMPLETED";
      pickupCode: string | null;
    }
  | { ok: false; error: string };

/**
 * Cria um pedido lançado pela recepção — venda de balcão ou hóspede que pediu
 * pelo telefone do quarto. Recalcula o total no servidor a partir do preço
 * atual do produto/variante e valida o estoque, igual ao checkout do site.
 *
 * - Pix: a recepção gera o QR com generatePixOrder e acompanha com
 *   checkOrderStatus.
 * - Cartão/dinheiro: fica pendente até a entrega (confirmInPersonPayment) ou,
 *   com settleNow, nasce finalizado porque o valor já foi recebido no balcão.
 *
 * Liberado para STAFF: quem opera a recepção é a equipe do motel.
 */
export async function createReceptionOrder(
  input: unknown,
): Promise<ReceptionResult> {
  const context = await requireAdminContext();

  const parsed = receptionOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors.join(", ") ||
        parsed.error.issues[0]?.message ||
        "Dados inválidos para a venda.",
    };
  }

  const supabase = createServiceRoleClient();

  const productIds = parsed.data.items.map((item) => item.productId);
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,price_cents,in_stock,stock_quantity,variants")
    .in("id", productIds);

  if (productError || !products) {
    return {
      ok: false,
      error: productError?.message ?? "Não foi possível carregar os produtos.",
    };
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  let totalCents = 0;
  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return { ok: false, error: `Produto não encontrado: ${item.productId}` };
    }

    const variants = parsePersistedProductVariants(product.variants);
    const selectedVariant = item.variantId
      ? variants.find((variant) => variant.id === item.variantId)
      : undefined;

    if (variants.length > 0 && !selectedVariant) {
      return {
        ok: false,
        error: "Selecione uma variante válida para o produto.",
      };
    }

    const availableStock = selectedVariant
      ? selectedVariant.stock_quantity
      : product.stock_quantity;
    const available = selectedVariant
      ? selectedVariant.in_stock
      : product.in_stock !== false;

    if (!available) {
      return { ok: false, error: "Produto fora de estoque." };
    }

    if (typeof availableStock === "number" && availableStock < item.quantity) {
      return {
        ok: false,
        error: `Estoque insuficiente. Disponível: ${availableStock}, pedido: ${item.quantity}.`,
      };
    }

    totalCents +=
      (selectedVariant?.price_cents ?? product.price_cents) * item.quantity;
  }


  if (
    parsed.data.cashChangeForCents !== undefined &&
    parsed.data.cashChangeForCents < totalCents
  ) {
    return {
      ok: false,
      error: "O valor para troco precisa ser maior ou igual ao total.",
    };
  }

  // pickup code único
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

  const roomNumber =
    parsed.data.deliveryMethod === "ROOM_DELIVERY"
      ? (parsed.data.roomNumber?.trim() ?? null)
      : null;
  const customerName =
    parsed.data.customerName?.trim() ||
    (roomNumber ? `Quarto ${roomNumber}` : "Venda balcão");

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: customerName,
      customer_email: null,
      delivery_method: parsed.data.deliveryMethod,
      room_number: roomNumber,
      payment_method: parsed.data.paymentMethod,
      cash_change_for_cents:
        parsed.data.paymentMethod === "CASH"
          ? (parsed.data.cashChangeForCents ?? null)
          : null,
      channel: "RECEPTION" as const,
      status: "PENDING" as const,
      total_cents: totalCents,
      pickup_code: pickupCode,
    })
    .select("id")
    .single();

  if (orderError || !orderData) {
    return {
      ok: false,
      error: orderError?.message ?? "Não foi possível criar o pedido.",
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
      unit_price_cents: selectedVariant?.price_cents ?? product.price_cents,
    };
  });

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderData.id);
    return { ok: false, error: itemsError.message };
  }

  // Venda já recebida no balcão: se o acerto falhar, o pedido não pode
  // ficar para trás como "a cobrar" — o caixa tentaria de novo e criaria uma
  // duplicata de um dinheiro já recebido. Desfaz o pedido (itens em cascata).
  if (parsed.data.settleNow) {
    const settled = await settleInPersonOrder(
      orderData.id,
      parsed.data.paymentMethod as InPersonMethod,
      true,
      context,
    );
    if (!settled.ok) {
      const { error: rollbackError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderData.id)
        .eq("status", "PENDING");
      if (rollbackError) {
        console.error("Falha ao desfazer venda de balcão:", rollbackError);
        return {
          ok: false,
          error: `${settled.error} O pedido ${orderData.id.slice(0, 8)} ficou pendente em Pedidos — finalize por lá em vez de lançar de novo.`,
        };
      }
      return { ok: false, error: `${settled.error} Nada foi registrado.` };
    }
  }

  await logAudit(
    {
      action: "order.create",
      category: "order",
      targetType: "order",
      targetId: orderData.id,
      targetLabel: customerName,
      metadata: {
        via: "reception",
        totalCents,
        deliveryMethod: parsed.data.deliveryMethod,
        paymentMethod: parsed.data.paymentMethod,
        items: parsed.data.items.length,
      },
    },
    context,
  );

  if (parsed.data.settleNow) {
    return {
      ok: true,
      orderId: orderData.id,
      totalCents,
      status: "COMPLETED",
      pickupCode,
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");

  return {
    ok: true,
    orderId: orderData.id,
    totalCents,
    status: "PENDING",
    pickupCode,
  };
}

// Confirmação manual no balcão: além de cartão e dinheiro, o Pix pago direto
// na maquininha (modo avulso, fora do sistema) ou por transferência.
const MANUAL_SETTLE_METHODS = [...IN_PERSON_PAYMENT_METHODS, "PIX"] as const;
type InPersonMethod = (typeof MANUAL_SETTLE_METHODS)[number];

type SettleResult =
  | { ok: true; pickupCode: string; status: "PAID" | "COMPLETED" }
  | { ok: false; error: string };

/**
 * Registra o recebimento presencial (cartão na maquininha, Pix ou dinheiro) de
 * um pedido pendente: grava a forma real de pagamento, move para PAID — ou
 * direto para COMPLETED quando a entrega acontece no mesmo momento — e dá baixa
 * no estoque. Guardado por PENDING para não rodar duas vezes.
 */
async function settleInPersonOrder(
  orderId: string,
  method: InPersonMethod,
  complete: boolean,
  context: Awaited<ReturnType<typeof requireAdminContext>>,
): Promise<SettleResult> {
  const supabase = createServiceRoleClient();

  const { data: order, error: lookupError } = await supabase
    .from("orders")
    .select(
      "id,status,pickup_code,payment_method,delivery_method,mercadopago_order_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (lookupError || !order) {
    return { ok: false, error: "Pedido não encontrado." };
  }

  if (order.status !== "PENDING") {
    return {
      ok: false,
      error: `Pedido não está pendente (status atual: ${order.status}).`,
    };
  }

  if (order.delivery_method === "HOME_DELIVERY") {
    return {
      ok: false,
      error: "Entrega a domicílio é paga só online.",
    };
  }

  const released = await releaseOpenPointOrder(
    supabase,
    order.mercadopago_order_id,
    context,
  );
  if (!released.ok) return released;

  const pickupCode = order.pickup_code ?? generatePickupCode();
  const now = new Date().toISOString();
  const nextStatus = complete ? ("COMPLETED" as const) : ("PAID" as const);

  const { data: updatedRows } = await supabase
    .from("orders")
    .update({
      status: nextStatus,
      payment_method: method,
      // Troco só faz sentido em dinheiro; se mudou de forma, limpa.
      ...(method !== "CASH" ? { cash_change_for_cents: null } : {}),
      pickup_code: pickupCode,
      ...(complete ? { completed_at: now } : {}),
      updated_at: now,
    })
    .eq("id", order.id)
    .eq("status", "PENDING")
    .select("id");

  if ((updatedRows?.length ?? 0) === 0) {
    return {
      ok: false,
      error: "O pedido já foi confirmado por outro caminho.",
    };
  }

  try {
    await decrementOrderStockByVariants(supabase, order.id);
  } catch (stockError) {
    console.error(
      "Falha ao baixar estoque na confirmação presencial:",
      stockError,
    );
  }

  await logAudit(
    {
      action: complete ? "order.complete" : "order.status_change",
      category: "order",
      targetType: "order",
      targetId: order.id,
      targetLabel: order.id.slice(0, 8),
      metadata: {
        from: "PENDING",
        to: nextStatus,
        via: "in_person_payment",
        paymentMethod: method,
        previousPaymentMethod: order.payment_method,
      },
    },
    context,
  );

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");

  return { ok: true, pickupCode, status: nextStatus };
}

const confirmInPersonSchema = z
  .object({
    orderId: z.string().uuid(),
    method: z.enum(MANUAL_SETTLE_METHODS),
    // true: pagou e já recebeu os produtos (entrega no quarto / balcão).
    complete: z.boolean().default(true),
  })
  .strict();

/**
 * Confirma o pagamento presencial de um pedido pendente — tanto os pedidos
 * "pagar na entrega" do site quanto uma cobrança Pix que o hóspede acabou
 * pagando no cartão ou em dinheiro. Liberado para STAFF.
 */
export async function confirmInPersonPayment(input: unknown) {
  const context = await requireAdminContext();

  const parsed = confirmInPersonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Dados inválidos para confirmar." };
  }

  return settleInPersonOrder(
    parsed.data.orderId,
    parsed.data.method,
    parsed.data.complete,
    context,
  );
}

// ---------------------------------------------------------------------------
// Maquininha Point integrada (modo PDV)
// ---------------------------------------------------------------------------


type PointResult =
  | {
      ok: true;
      state: PointState;
      orderStatus: string;
      pickupCode: string | null;
      paymentMethod: string | null;
    }
  | { ok: false; error: string };

const pointOrderInputSchema = z.object({ orderId: z.string().uuid() }).strict();

async function readOrderSnapshot(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orderId: string,
) {
  const { data } = await supabase
    .from("orders")
    .select(
      "id,status,total_cents,pickup_code,payment_method,delivery_method,mercadopago_order_id",
    )
    .eq("id", orderId)
    .maybeSingle();
  return data;
}

/**
 * Manda a cobrança de um pedido pendente para a maquininha. O cliente escolhe
 * na Point: cartão ou QR (Pix). Reaproveita uma cobrança ainda aberta e, se o
 * pedido tinha um Pix online gerado, cancela esse QR antes para não haver dois
 * jeitos de pagar a mesma coisa.
 */
export async function startPointPayment(input: unknown): Promise<PointResult> {
  const context = await requireAdminContext();
  const parsed = pointOrderInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };

  if (!getPointTerminalId()) {
    return { ok: false, error: "Nenhuma maquininha configurada." };
  }

  const supabase = createServiceRoleClient();
  const order = await readOrderSnapshot(supabase, parsed.data.orderId);
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  if (order.status !== "PENDING") {
    return {
      ok: false,
      error: `Pedido não está pendente (status atual: ${order.status}).`,
    };
  }
  if (order.delivery_method === "HOME_DELIVERY") {
    return { ok: false, error: "Entrega a domicílio é paga só online." };
  }

  if (order.mercadopago_order_id) {
    let previous;
    try {
      previous = await getOrderById(order.mercadopago_order_id);
    } catch {
      previous = null;
    }

    if (previous) {
      const prevStatus = String(previous.status ?? "").toLowerCase();

      if (isPointOrder(previous)) {
        const state = pointStateOf(previous);
        if (state === "waiting") {
          return {
            ok: true,
            state,
            orderStatus: order.status,
            pickupCode: order.pickup_code,
            paymentMethod: order.payment_method,
          };
        }
        if (state === "paid") {
          const settled = await settlePaidPointOrder(supabase, previous, context);
          return {
            ok: true,
            state,
            orderStatus: "COMPLETED",
            pickupCode: settled.settled ? settled.pickupCode : order.pickup_code,
            paymentMethod: settled.settled
              ? settled.method
              : order.payment_method,
          };
        }
        // failed / canceled / expired: segue e cria uma nova cobrança.
      } else if (prevStatus === "processed") {
        return {
          ok: false,
          error: "O Pix online deste pedido já foi pago — aguarde a confirmação.",
        };
      } else if (!["canceled", "cancelled", "expired", "failed"].includes(prevStatus)) {
        try {
          await cancelMpOrder(order.mercadopago_order_id);
        } catch (cancelError) {
          console.error("Falha ao cancelar o Pix online:", cancelError);
          return {
            ok: false,
            error:
              "Não consegui cancelar o QR Pix gerado antes. Tente de novo em instantes.",
          };
        }
      }
    }
  }

  let mpOrder;
  try {
    mpOrder = await createPointOrder({
      // Único por cobrança: o pedido pode ir à maquininha mais de uma vez.
      externalReference: `${order.id}-p${Date.now().toString(36)}`,
      amount: centsToDecimalString(order.total_cents),
      description: `Pedido ${order.id.slice(0, 8)}`,
    });
  } catch (error) {
    console.error("Falha ao enviar cobrança para a maquininha:", error);
    return {
      ok: false,
      error:
        "A maquininha não recebeu a cobrança. Confira se ela está ligada, com internet e em modo PDV.",
    };
  }

  const mpOrderId = String(mpOrder.id);
  const { data: updatedRows } = await supabase
    .from("orders")
    .update({
      mercadopago_order_id: mpOrderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "PENDING")
    .select("id");

  if ((updatedRows?.length ?? 0) === 0) {
    // Fechado por outro caminho enquanto a cobrança era criada: tira da Point.
    try {
      await cancelMpOrder(mpOrderId, true);
    } catch (cancelError) {
      console.error("Falha ao cancelar cobrança órfã:", cancelError);
    }
    return { ok: false, error: "O pedido já foi fechado por outro caminho." };
  }

  await logAudit(
    {
      action: "order.point_charge",
      category: "order",
      targetType: "order",
      targetId: order.id,
      targetLabel: order.id.slice(0, 8),
      metadata: { mpOrderId, totalCents: order.total_cents },
    },
    context,
  );

  return {
    ok: true,
    state: "waiting",
    orderStatus: order.status,
    pickupCode: order.pickup_code,
    paymentMethod: order.payment_method,
  };
}

/**
 * Consulta a cobrança na maquininha — usado pela tela da recepção a cada
 * poucos segundos, como reforço do webhook (que não chega em localhost).
 */
export async function checkPointPayment(input: unknown): Promise<PointResult> {
  const context = await requireAdminContext();
  const parsed = pointOrderInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };

  const supabase = createServiceRoleClient();
  const order = await readOrderSnapshot(supabase, parsed.data.orderId);
  if (!order) return { ok: false, error: "Pedido não encontrado." };

  const snapshot = (state: PointState) => ({
    ok: true as const,
    state,
    orderStatus: order.status,
    pickupCode: order.pickup_code,
    paymentMethod: order.payment_method,
  });

  if (order.status === "COMPLETED" || order.status === "PAID") {
    return snapshot("paid");
  }
  if (order.status !== "PENDING" || !order.mercadopago_order_id) {
    return snapshot("unknown");
  }

  let mpOrder;
  try {
    mpOrder = await getOrderById(order.mercadopago_order_id);
  } catch {
    return snapshot("waiting");
  }
  if (!isPointOrder(mpOrder)) return snapshot("unknown");

  const state = pointStateOf(mpOrder);
  if (state === "paid") {
    const settled = await settlePaidPointOrder(supabase, mpOrder, context);
    const fresh = await readOrderSnapshot(supabase, order.id);
    return {
      ok: true,
      state,
      orderStatus: fresh?.status ?? "COMPLETED",
      pickupCode: settled.settled
        ? settled.pickupCode
        : (fresh?.pickup_code ?? null),
      paymentMethod: fresh?.payment_method ?? null,
    };
  }
  return snapshot(state);
}

/**
 * Tira a cobrança da maquininha (inclusive se ela já puxou) e, com
 * `cancelOrder`, cancela o pedido — usado no "Cancelar venda" da recepção.
 */
export async function cancelPointPayment(input: unknown) {
  const context = await requireAdminContext();
  const parsed = z
    .object({ orderId: z.string().uuid(), cancelOrder: z.boolean() })
    .strict()
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Pedido inválido." };
  }

  const supabase = createServiceRoleClient();
  const order = await readOrderSnapshot(supabase, parsed.data.orderId);
  if (!order) return { ok: false as const, error: "Pedido não encontrado." };
  if (order.status !== "PENDING") {
    return {
      ok: false as const,
      error: `Pedido não está pendente (status atual: ${order.status}).`,
    };
  }

  const released = await releaseOpenPointOrder(
    supabase,
    order.mercadopago_order_id,
    context,
  );
  if (!released.ok) return { ok: false as const, error: released.error };

  if (parsed.data.cancelOrder) {
    const { data: updatedRows } = await supabase
      .from("orders")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "PENDING")
      .select("id");

    if ((updatedRows?.length ?? 0) > 0) {
      await logAudit(
        {
          action: "order.cancel",
          category: "order",
          targetType: "order",
          targetId: order.id,
          targetLabel: order.id.slice(0, 8),
          metadata: { from: "PENDING", to: "CANCELLED", via: "point_cancel" },
        },
        context,
      );
      revalidatePath("/admin/orders");
    }
  }

  return { ok: true as const };
}
