import { requireAdminContext } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getInventoryMovements } from "@/lib/actions/inventory";
import { InventoryPanel } from "@/components/admin/inventory-panel";

export default async function AdminInventoryPage() {
  await requireAdminContext();

  const supabase = createServiceRoleClient();

  const { data: products } = await supabase
    .from("products")
    .select("id,name,price,stock_quantity")
    .order("name", { ascending: true });

  const movementsResult = await getInventoryMovements(undefined, 100);

  const productOptions = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    stock_quantity: p.stock_quantity ?? 0,
  }));

  const movements = movementsResult.ok ? movementsResult.data : [];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Gestão de Estoque</h2>
        <p className="text-sm text-muted-foreground">
          Registre entradas de estoque pela nota fiscal, ajustes manuais e
          acompanhe o histórico de movimentos.
        </p>
      </div>

      <InventoryPanel products={productOptions} movements={movements} />
    </section>
  );
}
