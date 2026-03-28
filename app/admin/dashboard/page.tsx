import { requireAdminContext } from "@/lib/auth/admin";
import { getDashboardMetrics } from "@/lib/actions/inventory";
import { DashboardPanel } from "@/components/admin/dashboard-panel";

export default async function AdminDashboardPage() {
  await requireAdminContext();

  const result = await getDashboardMetrics();

  if (!result.ok) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Não foi possível carregar as métricas: {result.error}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Métricas de vendas, custos e lucratividade para tomada de decisão.
        </p>
      </div>

      <DashboardPanel metrics={result.data} />
    </section>
  );
}
