"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/auth/admin";
import { adminOrderMutationSchema, orderStatusSchema } from "@/lib/schemas";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
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

  const normalizedStatus =
    parsed.data.status === "COMPLETED" ? "PAID" : parsed.data.status;

  if (context.role === "STAFF" && normalizedStatus !== "PAID") {
    return {
      ok: false as const,
      error: "Usuarios STAFF so podem marcar pedidos como Entregue/Completo.",
    };
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("orders")
    .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/orders");
  return { ok: true as const };
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
