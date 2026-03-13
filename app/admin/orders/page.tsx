import { Button } from "@/components/ui/button";
import {
  createOrderByAdmin,
  deleteOrderByAdmin,
  updateOrderByAdmin,
  updateOrderStatus,
} from "@/lib/actions/orders";
import { getAdminContext, requireAdminContext } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

const statusOptions = ["PENDING", "PAID", "CANCELLED", "EXPIRED"] as const;
const deliveryOptions = ["MOTEL_PICKUP", "ROOM_DELIVERY"] as const;

type Status = (typeof statusOptions)[number];

type Delivery = (typeof deliveryOptions)[number];

export default async function AdminOrdersPage() {
  const context = await getAdminContext();
  await requireAdminContext();

  const supabase = await createClient();
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id,customer_name,customer_email,delivery_method,room_number,payment_method,status,total_amount,created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Gestao de pedidos com regras de acesso por papel.
        </p>
      </div>

      {ordersError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Nao foi possivel carregar pedidos: {ordersError.message}
        </p>
      )}

      {context?.role === "ADMIN" && (
        <form
          action={async (formData) => {
            "use server";
            await createOrderByAdmin({
              customerName: String(formData.get("customerName") ?? ""),
              customerEmail: String(formData.get("customerEmail") ?? ""),
              deliveryMethod: String(
                formData.get("deliveryMethod") ?? "MOTEL_PICKUP",
              ) as Delivery,
              roomNumber: String(formData.get("roomNumber") ?? ""),
              paymentMethod: "PIX",
              status: String(formData.get("status") ?? "PENDING") as Status,
              totalAmount: Number(formData.get("totalAmount") ?? 0),
            });
          }}
          className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-3"
        >
          <input
            name="customerName"
            required
            placeholder="Cliente"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="customerEmail"
            required
            type="email"
            placeholder="Email"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="totalAmount"
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Total"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <select
            name="deliveryMethod"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {deliveryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <input
            name="roomNumber"
            placeholder="Quarto (opcional)"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <select
            name="status"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="md:col-span-3">
            <Button type="submit">Criar pedido</Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {(orders ?? []).map((order) => (
          <article
            key={order.id}
            className="space-y-3 rounded-xl border border-border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">{order.customer_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {order.customer_email}
                </p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs">
                {order.status}
              </span>
            </div>

            {context?.role === "ADMIN" ? (
              <form
                action={async (formData) => {
                  "use server";
                  await updateOrderByAdmin({
                    id: order.id,
                    customerName: String(formData.get("customerName") ?? ""),
                    customerEmail: String(formData.get("customerEmail") ?? ""),
                    deliveryMethod: String(
                      formData.get("deliveryMethod") ?? "MOTEL_PICKUP",
                    ) as Delivery,
                    roomNumber: String(formData.get("roomNumber") ?? ""),
                    paymentMethod: "PIX",
                    status: String(
                      formData.get("status") ?? "PENDING",
                    ) as Status,
                    totalAmount: Number(formData.get("totalAmount") ?? 0),
                  });
                }}
                className="grid gap-3 md:grid-cols-3"
              >
                <input
                  name="customerName"
                  defaultValue={order.customer_name}
                  required
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  name="customerEmail"
                  type="email"
                  defaultValue={order.customer_email}
                  required
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  name="totalAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={Number(order.total_amount)}
                  required
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />

                <select
                  name="deliveryMethod"
                  defaultValue={order.delivery_method}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {deliveryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <input
                  name="roomNumber"
                  defaultValue={order.room_number ?? ""}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />

                <select
                  name="status"
                  defaultValue={order.status}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2 md:col-span-3">
                  <Button type="submit" variant="secondary">
                    Salvar
                  </Button>
                </div>
              </form>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await updateOrderStatus({
                    id: order.id,
                    status: "COMPLETED",
                  });
                }}
              >
                <Button type="submit">Marcar Entregue/Completo</Button>
              </form>
            )}

            {context?.role === "ADMIN" && (
              <form
                action={async () => {
                  "use server";
                  await deleteOrderByAdmin({ id: order.id });
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  Excluir pedido
                </Button>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
