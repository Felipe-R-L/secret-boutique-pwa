import { requireAdminPage } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";
import { PushNotifications } from "@/components/admin/push-notifications";

export default async function AdminOrdersPage() {
  const context = await requireAdminPage();

  const supabase = await createClient();
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id,customer_name,customer_email,delivery_method,room_number,payment_method,status,total_amount,pickup_code,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (ordersError) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Pedidos</h2>
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Não foi possível carregar pedidos: {ordersError.message}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pedidos</h2>
          <p className="text-sm text-muted-foreground">
            Painel em tempo real • Atualizações automáticas
          </p>
        </div>
        <PushNotifications />
      </div>
      <OrdersDashboard
        initialOrders={(orders ?? []) as never}
        isAdmin={context.role === "ADMIN"}
      />
    </section>
  );
}
