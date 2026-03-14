"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/auth/admin";
import { adminOrderMutationSchema, orderStatusSchema } from "@/lib/schemas";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
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
    customer_email: input.customerEmail,
    delivery_method: input.deliveryMethod,
    room_number:
      input.deliveryMethod === "ROOM_DELIVERY"
        ? (input.roomNumber?.trim() ?? null)
        : null,
    payment_method: input.paymentMethod,
    status: input.status,
    total_amount: Number(input.totalAmount.toFixed(2)),
    updated_at: new Date().toISOString(),
  };
}

export async function createOrderByAdmin(input: unknown) {
  await requireAdminContext({ write: true });

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

  revalidatePath("/admin/orders");
  return { ok: true as const };
}

export async function updateOrderByAdmin(input: unknown) {
  await requireAdminContext({ write: true });

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
    .select("id,status")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!currentOrder) {
    return { ok: false as const, error: "Pedido não encontrado" };
  }

  const newStatus = parsed.data.status;

  // Staff can only do specific transitions
  if (context.role === "STAFF") {
    const validTransitions: Record<string, string[]> = {
      PAID: ["PREPARING"],
      PREPARING: ["READY_FOR_PICKUP"],
    };
    const allowed = validTransitions[currentOrder.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return {
        ok: false as const,
        error: `Transição de ${currentOrder.status} para ${newStatus} não permitida.`,
      };
    }
  }

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "COMPLETED") {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

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

// Complete order by verifying the pickup code
export async function completeOrderByPickupCode(pickupCode: string) {
  await requireAdminContext();

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
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "COMPLETED",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", order.id);

  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

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
  await requireAdminContext({ write: true });

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

  revalidatePath("/admin/orders");
  return { ok: true as const };
}
