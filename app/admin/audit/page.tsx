import { requireAdminPage } from "@/lib/auth/admin";
import { listAuditLogs } from "@/lib/actions/audit";
import { AuditLogPanel } from "@/components/admin/audit-log-panel";

export default async function AdminAuditPage() {
  await requireAdminPage({ adminOnly: true });

  const result = await listAuditLogs({ limit: 200 });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Auditoria</h2>
        <p className="text-sm text-muted-foreground">
          Registro de ações e navegação dos usuários no painel
        </p>
      </div>

      {result.ok ? (
        <AuditLogPanel initialLogs={result.data} />
      ) : (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Não foi possível carregar os registros: {result.error}
        </p>
      )}
    </section>
  );
}
