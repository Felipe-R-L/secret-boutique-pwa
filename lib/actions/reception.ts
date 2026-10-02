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
    cashChangeFor: z.number().positive().max(10000).optional(),
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
    if (value.cashChangeFor !== undefined && value.paymentMethod !== "CASH") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Troco só vale para pagamento em dinheiro.",
        path: ["cashChangeFor"],
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
      totalAmount: number;
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
    .select("id,price,in_stock,stock_quantity,variants")
    .in("id", productIds);

  if (productError || !products) {
    return {
      ok: false,
      error: productError?.message ?? "Não foi possível carregar os produtos.",
    };
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  let totalAmount = 0;
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

    totalAmount +=
      Number(selectedVariant?.price ?? product.price) * item.quantity;
  }

  totalAmount = Number(totalAmount.toFixed(2));

  if (
    parsed.data.cashChangeFor !== undefined &&
    parsed.data.cashChangeFor < totalAmount
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
      cash_change_for:
        parsed.data.paymentMethod === "CASH"
          ? (parsed.data.cashChangeFor ?? null)
          : null,
      channel: "RECEPTION" as const,
      status: "PENDING" as const,
      total_amount: totalAmount,
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

  await logAudit(
    {
      action: "order.create",
      category: "order",
      targetType: "order",
      targetId: orderData.id,
      targetLabel: customerName,
      metadata: {
        via: "reception",
        total: totalAmount,
        deliveryMethod: parsed.data.deliveryMethod,
        paymentMethod: parsed.data.paymentMethod,
        items: parsed.data.items.length,
      },
    },
    context,
  );

  if (parsed.data.settleNow) {
    const settled = await settleInPersonOrder(
      orderData.id,
      parsed.data.paymentMethod as InPersonMethod,
      true,
      context,
    );
    if (!settled.ok) {
      return { ok: false, error: settled.error };
    }
    return {
      ok: true,
      orderId: orderData.id,
      totalAmount,
      status: "COMPLETED",
      pickupCode,
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");

  return {
    ok: true,
    orderId: orderData.id,
    totalAmount,
    status: "PENDING",
    pickupCode,
  };
}

type InPersonMethod = (typeof IN_PERSON_PAYMENT_METHODS)[number];

type SettleResult =
  | { ok: true; pickupCode: string; status: "PAID" | "COMPLETED" }
  | { ok: false; error: string };

/**
 * Registra o recebimento presencial (cartão na maquininha ou dinheiro) de um
 * pedido pendente: grava a forma real de pagamento, move para PAID — ou direto
 * para COMPLETED quando a entrega acontece no mesmo momento — e dá baixa no
 * estoque. Guardado por PENDING para não rodar duas vezes.
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
    .select("id,status,pickup_code,payment_method,delivery_method")
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
      error: "Entrega a domicílio é paga só por Pix.",
    };
  }

  const pickupCode = order.pickup_code ?? generatePickupCode();
  const now = new Date().toISOString();
  const nextStatus = complete ? ("COMPLETED" as const) : ("PAID" as const);

  const { data: updatedRows } = await supabase
    .from("orders")
    .update({
      status: nextStatus,
      payment_method: method,
      // Troco só faz sentido em dinheiro; se mudou para cartão, limpa.
      ...(method === "CARD" ? { cash_change_for: null } : {}),
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
    method: z.enum(IN_PERSON_PAYMENT_METHODS),
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
