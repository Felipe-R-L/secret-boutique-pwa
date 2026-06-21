"use server";

import { z } from "zod";
import { requireAdminContext } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const subscriptionSchema = z
  .object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
    userAgent: z.string().optional(),
  })
  .strict();

/**
 * Salva (ou atualiza) a inscrição de push do ADMIN/STAFF autenticado.
 * Usa service role para upsert por endpoint; o user_id vem do contexto auth.
 */
export async function savePushSubscription(input: unknown) {
  const context = await requireAdminContext();

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Inscrição inválida" };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: context.userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: parsed.data.userAgent ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

export async function deletePushSubscription(input: unknown) {
  await requireAdminContext();

  const parsed = z
    .object({ endpoint: z.string().url() })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Endpoint inválido" };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
