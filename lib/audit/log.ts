import { getAdminContext, type AdminContext } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AuditCategory =
  | "order"
  | "product"
  | "inventory"
  | "settings"
  | "admin_user"
  | "navigation"
  | "notification"
  | "general";

export type AuditEntry = {
  action: string;
  category: AuditCategory;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: Record<string, unknown>;
  path?: string | null;
};

/**
 * Registra uma ação no log de auditoria. Best-effort por design: NUNCA lança —
 * uma falha ao auditar não pode quebrar a ação de negócio que a originou.
 *
 * Passe `context` quando a action já resolveu `requireAdminContext()`, para
 * evitar uma segunda ida ao banco resolvendo o usuário atual.
 */
export async function logAudit(
  entry: AuditEntry,
  context?: AdminContext | null,
): Promise<void> {
  try {
    const actor = context ?? (await getAdminContext());
    const supabase = createServiceRoleClient();
    await supabase.from("audit_logs").insert({
      actor_id: actor?.userId ?? null,
      actor_email: actor?.email ?? null,
      actor_role: actor?.role ?? null,
      action: entry.action,
      category: entry.category,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      target_label: entry.targetLabel ?? null,
      metadata: entry.metadata ?? {},
      path: entry.path ?? null,
    });
  } catch (err) {
    console.error("[audit] falha ao registrar log", err);
  }
}
