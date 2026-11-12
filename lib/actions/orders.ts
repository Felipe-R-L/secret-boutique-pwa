"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/auth/admin";
import { logAudit } from "@/lib/audit/log";
import {
  adminOrderMutationSchema,
  isInPersonPayment,
  orderStatusSchema,
} from "@/lib/schemas";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { releaseOpenPointOrder } from "@/lib/server/point-payment";
import { restoreOrderStockByVariants } from "@/lib/server/product-variants";
import { getOrderById, refundMpOrder } from "@/lib/mercadopago/client";
import {
  sendReadyForPickupEmail,
  sendOrderCompletedEmail,
} from "@/lib/services/email";
import { z } from "zod";

const deleteOrderSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const orderStatusUpdateSchema = z
  .object({
    id: z.string().uuid(),
    status: z.union([orderStatusSchema, z.literal("COMPLETED")]),
  })
  .strict();

function normalizeOrderPayload(
  input: z.infer<typeof adminOrderMutationSchema>,
) {
  return {
    customer_name: input.customerName,
    customer_email: input.customerEmail ?? null,
    delivery_method: input.deliveryMethod,
    room_number:
      input.deliveryMethod === "ROOM_DELIVERY"
        ? (input.roomNumber?.trim() ?? null)
        : null,
    payment_method: input.paymentMethod,
    status: input.status,
    total_cents: input.totalCents,
    updated_at: new Date().toISOString(),
  };
}

export async function createOrderByAdmin(input: unknown) {
  const context = await requireAdminContext({ write: true });

  const parsed = adminOrderMutationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.flatten().formErrors.join(", ") || "Invalid order payload",
    };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("orders")
    .insert(normalizeOrderPayload({ ...parsed.data, id: undefined }));

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await logAudit(
    {
      action: "order.create",
      category: "order",
      targetType: "order",
      targetLabel: parsed.data.customerName,
      metadata: {
        totalCents: parsed.data.totalCents,
        deliveryMethod: parsed.data.deliveryMethod,
        status: parsed.data.status,
      },
    },
    context,
  );

  revalidatePath("/admin/orders");
  return { ok: true as const };
}

export async function updateOrderByAdmin(input: unknown) {
  const context = await requireAdminContext({ write: true });

  const parsed = adminOrderMutationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.flatten().formErrors.join(", ") || "Invalid order payload",
    };
  }

  if (!parsed.data.id) {
    return { ok: false as const, error: "Order id is required" };
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("orders")
    .update(normalizeOrderPayload(parsed.data))
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await logAudit(
    {
      action: "order.update",
      category: "order",
      targetType: "order",
      targetId: parsed.data.id,
      targetLabel: parsed.data.customerName,
      metadata: {
        totalCents: parsed.data.totalCents,
        status: parsed.data.status,
      },
    },
    context,
  );

  revalidatePath("/admin/orders");
  return { ok: true as const };
}

export async function updateOrderStatus(input: unknown) {
  const context = await requireAdminContext();

  const parsed = orderStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten().formErrors.join(", ") || "Invalid payload",
    };
  }

  const supabase = createServiceRoleClient();

  // Fetch current order to validate transition
  const { data: currentOrder } = await supabase
    .from("orders")
    .select("id,status,delivery_method,payment_method,mercadopago_order_id")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!currentOrder) {
    return { ok: false as const, error: "Pedido não encontrado" };
  }

  const newStatus = parsed.data.status;

  // Pedido "pagar na entrega" ainda não pago: nenhum dinheiro entrou nem saiu
  // estoque, então a recepção pode cancelar (hóspede desistiu, quarto vazio).
  const isUnpaidInPerson =
    currentOrder.status === "PENDING" &&
    isInPersonPayment(currentOrder.payment_method);

  // Fora esse caso, cancelar pedido é exclusivo do ADMIN (papel "master") —
  // guard explícito, além de o cancelamento não constar na tabela de
  // transições permitidas do STAFF abaixo.
  if (
    newStatus === "CANCELLED" &&
    context.role !== "ADMIN" &&
    !isUnpaidInPerson
  ) {
    return {
      ok: false as const,
      error: "Apenas o administrador pode cancelar pedidos.",
    };
  }

  // Staff can only do specific transitions
  if (context.role === "STAFF") {
    const validTransitions: Record<string, string[]> = {
      ...(isUnpaidInPerson ? { PENDING: ["CANCELLED"] } : {}),
      PAID: ["PREPARING"],
      PREPARING: ["READY_FOR_PICKUP"],
      // Entrega no quarto dispensa o código de retirada: o funcionário
      // confirma a entrega direto — o código só protege retiradas na portaria.
      ...(currentOrder.delivery_method === "ROOM_DELIVERY"
        ? { READY_FOR_PICKUP: ["COMPLETED"] }
        : {}),
    };
    const allowed = validTransitions[currentOrder.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return {
        ok: false as const,
        error: `Transição de ${currentOrder.status} para ${newStatus} não permitida.`,
      };
    }
  }

  // Cancelar um pedido com cobrança aberta na maquininha: tira da Point antes,
  // para o cliente não pagar no terminal um pedido cancelado.
  if (newStatus === "CANCELLED" && currentOrder.status === "PENDING") {
    const released = await releaseOpenPointOrder(
      supabase,
      currentOrder.mercadopago_order_id,
      context,
    );
    if (!released.ok) {
      return { ok: false as const, error: released.error };
    }
  }

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "COMPLETED") {
    updatePayload.completed_at = new Date().toISOString();
  }

  // Só grava se o status ainda for o que foi lido: impede, por exemplo, que
  // um "Cancelar" sobrescreva um "Recebi no cartão" que entrou no meio.
  const { data: updatedRows, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", parsed.data.id)
    .eq("status", currentOrder.status)
    .select("id");

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if ((updatedRows?.length ?? 0) === 0) {
    return {
      ok: false as const,
      error:
        "O pedido mudou enquanto você estava na tela. Atualize e tente de novo.",
    };
  }

  await logAudit(
    {
      action:
        newStatus === "CANCELLED"
          ? "order.cancel"
          : newStatus === "COMPLETED"
            ? "order.complete"
            : "order.status_change",
      category: "order",
      targetType: "order",
      targetId: parsed.data.id,
      targetLabel: parsed.data.id.slice(0, 8),
      metadata: { from: currentOrder.status, to: newStatus },
    },
    context,
  );

  // Send emails on status transitions
  try {
    if (newStatus === "READY_FOR_PICKUP") {
      await sendReadyForPickupEmail(parsed.data.id);
    } else if (newStatus === "COMPLETED") {
      await sendOrderCompletedEmail(parsed.data.id);
    }
  } catch (emailError) {
    console.error("Failed sending status email", emailError);
  }

  revalidatePath("/admin/orders");
  return { ok: true as const };
}

const refundOrderSchema = z
  .object({
    id: z.string().uuid(),
    restock: z.boolean(),
  })
  .strict();

const REFUNDABLE_STATUSES = [
  "PAID",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
] as const;

/**
 * Estorno total pelo Mercado Pago (Pix online ou maquininha Point). Só o ADMIN.
 * O pedido vai para CANCELLED; `restock` devolve os itens ao estoque quando o
 * produto voltou (ou nem chegou a sair).
 *
 * Pagamento em dinheiro ou confirmado à mão não passou pela API: não há o que
 * estornar aqui, a devolução é feita no balcão.
 */
export async function refundOrder(input: unknown) {
  const context = await requireAdminContext({ write: true });
  if (context.role !== "ADMIN") {
    return {
      ok: false as const,
      error: "Apenas o administrador pode estornar pedidos.",
    };
  }

  const parsed = refundOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Dados inválidos" };
  }

  const supabase = createServiceRoleClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id,status,payment_method,total_cents,mercadopago_order_id")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!order) return { ok: false as const, error: "Pedido não encontrado" };
  if (
    !REFUNDABLE_STATUSES.includes(
      order.status as (typeof REFUNDABLE_STATUSES)[number],
    )
  ) {
    return {
      ok: false as const,
      error: "Só dá para estornar pedido pago.",
    };
  }
  if (!order.mercadopago_order_id) {
    return {
      ok: false as const,
      error:
        "Esse pedido não foi pago pelo Mercado Pago (dinheiro ou confirmação manual). Devolva no balcão.",
    };
  }

  let mpOrder;
  try {
    mpOrder = await getOrderById(order.mercadopago_order_id);
  } catch (error) {
    console.error("Falha ao consultar order para estorno:", error);
    return {
      ok: false as const,
      error: "Não consegui consultar o pagamento no Mercado Pago. Tente de novo.",
    };
  }

  const mpStatus = String(mpOrder.status ?? "").toLowerCase();
  // Já estornado (ex.: pelo painel do MP, ou clique repetido): só sincroniza.
  const alreadyRefunded = mpStatus === "refunded";
  if (!alreadyRefunded && mpStatus !== "processed") {
    return {
      ok: false as const,
      error:
        "O Mercado Pago não registra esse pagamento como aprovado (pode ter sido confirmado à mão). Devolva no balcão.",
    };
  }

  let refundStatus = mpStatus;
  if (!alreadyRefunded) {
    try {
      const refunded = await refundMpOrder(order.mercadopago_order_id);
      refundStatus = String(refunded.status ?? "").toLowerCase();
    } catch (error) {
      console.error("Falha ao estornar no Mercado Pago:", error);
      return {
        ok: false as const,
        error:
          "O Mercado Pago recusou o estorno (ex.: passou de 90 dias ou saldo insuficiente). Veja no painel do MP.",
      };
    }
  }

  const now = new Date().toISOString();
  const { data: updatedRows } = await supabase
    .from("orders")
    .update({ status: "CANCELLED", updated_at: now })
    .eq("id", order.id)
    .eq("status", order.status)
    .select("id");

  // O dinheiro já voltou; se o status mudou no meio, só não mexe no estoque.
  const statusUpdated = (updatedRows?.length ?? 0) > 0;
  let restocked = false;
  if (statusUpdated && parsed.data.restock) {
    try {
      await restoreOrderStockByVariants(supabase, order.id);
      restocked = true;
    } catch (stockError) {
      console.error("Falha ao devolver estoque no estorno:", stockError);
    }
  }

  await logAudit(
    {
      action: "order.refund",
      category: "order",
      targetType: "order",
      targetId: order.id,
      targetLabel: order.id.slice(0, 8),
      metadata: {
        from: order.status,
        to: statusUpdated ? "CANCELLED" : order.status,
        paymentMethod: order.payment_method,
        amountCents: order.total_cents,
        mpOrderId: order.mercadopago_order_id,
        mpType: mpOrder.type ?? null,
        mpStatusAfter: refundStatus,
        alreadyRefunded,
        restockRequested: parsed.data.restock,
        restocked,
      },
    },
    context,
  );

  revalidatePath("/admin/orders");
  if (restocked) revalidatePath("/admin/inventory");

  if (!statusUpdated) {
    return {
      ok: false as const,
      error:
        "Estorno feito no Mercado Pago, mas o pedido mudou na tela. Atualize e cancele se precisar.",
    };
  }
  return { ok: true as const, restocked };
}

// Complete order by verifying the pickup code
export async function completeOrderByPickupCode(pickupCode: string) {
  const context = await requireAdminContext();

  if (!pickupCode || pickupCode.trim().length === 0) {
    return { ok: false as const, error: "Código de retirada é obrigatório" };
  }

  const supabase = createServiceRoleClient();

  const { data: order, error: lookupError } = await supabase
    .from("orders")
    .select("id,status,pickup_code")
    .eq("pickup_code", pickupCode.trim().toUpperCase())
    .maybeSingle();

  if (lookupError || !order) {
    return { ok: false as const, error: "Código de retirada não encontrado" };
  }

  if (order.status !== "READY_FOR_PICKUP") {
    return {
      ok: false as const,
      error: `Pedido não está pronto para retirada (status atual: ${order.status})`,
    };
  }

  const now = new Date().toISOString();
  const { data: completedRows, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "COMPLETED",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", order.id)
    .eq("status", "READY_FOR_PICKUP")
    .select("id");

  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

  if ((completedRows?.length ?? 0) === 0) {
    return { ok: false as const, error: "Este pedido já foi finalizado." };
  }

  await logAudit(
    {
      action: "order.complete",
      category: "order",
      targetType: "order",
      targetId: order.id,
      targetLabel: order.id.slice(0, 8),
      metadata: { via: "pickup_code" },
    },
    context,
  );

  // Send completion email
  try {
    await sendOrderCompletedEmail(order.id);
  } catch (emailError) {
    console.error("Failed sending completion email", emailError);
  }

  revalidatePath("/admin/orders");
  return { ok: true as const, orderId: order.id };
}

export async function deleteOrderByAdmin(input: unknown) {
  const context = await requireAdminContext({ write: true });

  const parsed = deleteOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten().formErrors.join(", ") || "Invalid payload",
    };
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await logAudit(
    {
      action: "order.delete",
      category: "order",
      targetType: "order",
      targetId: parsed.data.id,
      targetLabel: parsed.data.id.slice(0, 8),
    },
    context,
  );

  revalidatePath("/admin/orders");
  return { ok: true as const };
}

export type OrderItemView = {
  id: number;
  productId: string;
  name: string;
  imageUrl: string | null;
  variantLabel: string | null;
  quantity: number;
  unitPriceCents: number;
};

/**
 * Itens de um pedido para exibição no painel. STAFF e ADMIN podem ler; usamos o
 * service role porque a tabela `products` tem RLS de escrita restrita e queremos
 * garantir o nome/imagem do produto mesmo para STAFF.
 */
export async function getOrderItems(input: unknown): Promise<
  | { ok: true; items: OrderItemView[] }
  | { ok: false; error: string }
> {
  await requireAdminContext();

  const parsed = z.object({ orderId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Pedido inválido" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id,product_id,variant_label,quantity,unit_price_cents,products(name,image,image_url,images)",
    )
    .eq("order_id", parsed.data.orderId)
    .order("id", { ascending: true });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const items: OrderItemView[] = (data ?? []).map((row) => {
    const product = (row as { products: unknown }).products as
      | {
          name: string | null;
          image: string | null;
          image_url: string | null;
          images: unknown;
        }
      | null;

    const imagesArray = Array.isArray(product?.images)
      ? (product?.images as unknown[])
      : null;
    const firstImage =
      typeof imagesArray?.[0] === "string" ? (imagesArray[0] as string) : null;

    return {
      id: Number(row.id),
      productId: row.product_id,
      name: product?.name ?? "Produto removido",
      imageUrl: product?.image_url ?? product?.image ?? firstImage ?? null,
      variantLabel: row.variant_label,
      quantity: row.quantity,
      unitPriceCents: row.unit_price_cents,
    };
  });

  return { ok: true as const, items };
}
