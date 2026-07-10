"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdminContext } from "@/lib/auth/admin";
import { logAudit } from "@/lib/audit/log";
import { checkoutItemSchema } from "@/lib/schemas";
import {
  decrementOrderStockByVariants,
  parsePersistedProductVariants,
} from "@/lib/server/product-variants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Email "de fachada" usado só para montar o pedido Pix no Mercado Pago em vendas
// de balcão (o cliente é anônimo e não informa email). Configurável via env.
const RECEPTION_PIX_EMAIL =
  process.env.RECEPTION_PIX_EMAIL || "vendas@thesecretboutique.com.br";

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
  });

type ReceptionResult =
  | { ok: true; orderId: string; totalAmount: number }
  | { ok: false; error: string };

/**
 * Cria um pedido lançado pela recepção (venda de balcão). Recalcula o total no
 * servidor a partir do preço atual do produto/variante e valida o estoque, igual
 * ao checkout do site. O pagamento é o mesmo Pix do site — a recepção gera o QR
 * com generatePixOrder e acompanha o status com checkOrderStatus.
 */
export async function createReceptionOrder(
  input: unknown,
): Promise<ReceptionResult> {
  const context = await requireAdminContext({ write: true });

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

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: parsed.data.customerName?.trim() || "Venda balcão",
      customer_email: RECEPTION_PIX_EMAIL,
      delivery_method: parsed.data.deliveryMethod,
      room_number:
        parsed.data.deliveryMethod === "ROOM_DELIVERY"
          ? (parsed.data.roomNumber?.trim() ?? null)
          : null,
      payment_method: "PIX" as const,
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
      targetLabel: parsed.data.customerName?.trim() || "Venda balcão",
      metadata: {
        via: "reception",
        total: totalAmount,
        deliveryMethod: parsed.data.deliveryMethod,
        items: parsed.data.items.length,
      },
    },
    context,
  );

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");

  return { ok: true, orderId: orderData.id, totalAmount };
}

/**
 * Confirma manualmente o pagamento de uma venda de balcão paga "por fora" (cartão
 * na maquininha ou dinheiro). Faz a mesma baixa de estoque do fluxo Pix e move o
 * pedido para PAID. Guardado por PENDING para não rodar duas vezes.
 */
export async function markReceptionOrderPaid(orderId: unknown) {
  const context = await requireAdminContext({ write: true });

  const parsed = z.object({ orderId: z.string().uuid() }).safeParse({ orderId });
  if (!parsed.success) {
    return { ok: false as const, error: "Pedido inválido." };
  }

  const supabase = createServiceRoleClient();

  const { data: order, error: lookupError } = await supabase
    .from("orders")
    .select("id,status,pickup_code")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (lookupError || !order) {
    return { ok: false as const, error: "Pedido não encontrado." };
  }

  if (order.status !== "PENDING") {
    return {
      ok: false as const,
      error: `Pedido não está pendente (status atual: ${order.status}).`,
    };
  }

  const pickupCode = order.pickup_code ?? generatePickupCode();

  const { data: updatedRows } = await supabase
    .from("orders")
    .update({
      status: "PAID",
      pickup_code: pickupCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "PENDING")
    .select("id");

  if ((updatedRows?.length ?? 0) === 0) {
    return {
      ok: false as const,
      error: "O pedido já foi confirmado por outro caminho.",
    };
  }

  try {
    await decrementOrderStockByVariants(supabase, order.id);
  } catch (stockError) {
    console.error("Falha ao baixar estoque na confirmação manual:", stockError);
  }

  await logAudit(
    {
      action: "order.status_change",
      category: "order",
      targetType: "order",
      targetId: order.id,
      targetLabel: order.id.slice(0, 8),
      metadata: { from: "PENDING", to: "PAID", via: "manual_reception" },
    },
    context,
  );

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");

  return { ok: true as const, pickupCode };
}
