"use server";

import { requireAdminContext } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logAudit } from "@/lib/audit/log";

export type AuditLogView = {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  category: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown>;
  path: string | null;
  createdAt: string;
};

export async function listAuditLogs(options?: {
  limit?: number;
  category?: string;
  search?: string;
}): Promise<
  { ok: true; data: AuditLogView[] } | { ok: false; error: string }
> {
  await requireAdminContext({ adminOnly: true });

  const supabase = createServiceRoleClient();
  let query = supabase
    .from("audit_logs")
    .select(
      "id,actor_email,actor_role,action,category,target_type,target_id,target_label,metadata,path,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(options?.limit ?? 200, 1), 500));

  if (options?.category && options.category !== "ALL") {
    query = query.eq("category", options.category);
  }

  // `ilike` envia o valor como parâmetro (seguro contra injeção de filtro).
  const search = options?.search?.trim();
  if (search) {
    query = query.ilike("actor_email", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false as const, error: error.message };
  }

  const rows: AuditLogView[] = (data ?? []).map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      actorEmail: (r.actor_email as string | null) ?? null,
      actorRole: (r.actor_role as string | null) ?? null,
      action: r.action as string,
      category: r.category as string,
      targetType: (r.target_type as string | null) ?? null,
      targetId: (r.target_id as string | null) ?? null,
      targetLabel: (r.target_label as string | null) ?? null,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      path: (r.path as string | null) ?? null,
      createdAt: r.created_at as string,
    }),
  );

  return { ok: true as const, data: rows };
}

/**
 * Registra navegação no painel. Chamado pelo tracker client a cada troca de
 * rota. Aceita ADMIN e STAFF (ambos têm a navegação registrada).
 */
export async function logAdminNavigation(path: unknown) {
  const context = await requireAdminContext();

  if (typeof path !== "string" || !path.startsWith("/admin")) {
    return { ok: true as const };
  }

  await logAudit(
    {
      action: "navigate",
      category: "navigation",
      path,
      targetLabel: path,
    },
    context,
  );

  return { ok: true as const };
}
