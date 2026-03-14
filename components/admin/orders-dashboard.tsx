"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Clock,
  CheckCircle,
  ArrowRight,
  Bell,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  updateOrderStatus,
  completeOrderByPickupCode,
  deleteOrderByAdmin,
} from "@/lib/actions/orders";
import type { OrderStatus } from "@/lib/supabase/database.types";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  delivery_method: string;
  room_number: string | null;
  status: OrderStatus;
  total_amount: number;
  pickup_code: string | null;
  created_at: string;
  updated_at: string;
};

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; icon: typeof Package }
> = {
  PENDING: {
    label: "Aguardando Pagamento",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  PAID: {
    label: "Pago — Preparar",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Package,
  },
  PREPARING: {
    label: "Em Preparo",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: Package,
  },
  READY_FOR_PICKUP: {
    label: "Pronto p/ Retirada",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  COMPLETED: {
    label: "Finalizado",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: Clock,
  },
  EXPIRED: {
    label: "Expirado",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: Clock,
  },
};

interface OrdersDashboardProps {
  initialOrders: Order[];
  isAdmin: boolean;
}

export function OrdersDashboard({
  initialOrders,
  isAdmin,
}: OrdersDashboardProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [pickupCodeInput, setPickupCodeInput] = useState("");
  const [completionError, setCompletionError] = useState("");
  const [completionSuccess, setCompletionSuccess] = useState("");
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
            if (newOrder.status === "PAID") {
              setNewOrderAlert(true);
              // Play a subtle notification sound (optional)
              try {
                const audio = new Audio("/notification.mp3");
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch {
                // ignore
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? updated : o)),
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setOrders((prev) => prev.filter((o) => o.id !== deleted.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setLoading = useCallback((id: string, loading: boolean) => {
    setLoadingActions((prev) => {
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setLoading(orderId, true);

    // Optimistic update so UI reflects immediately
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: newStatus as OrderStatus, updated_at: new Date().toISOString() }
          : o,
      ),
    );

    const result = await updateOrderStatus({ id: orderId, status: newStatus });
    if (!result.ok) {
      // Revert optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: orders.find((x) => x.id === orderId)?.status ?? o.status } : o)),
      );
      alert(`Erro: ${result.error}`);
    }

    setLoading(orderId, false);
  };

  const handleCompleteByCode = async () => {
    setCompletionError("");
    setCompletionSuccess("");

    if (!pickupCodeInput.trim()) {
      setCompletionError("Digite o código de retirada");
      return;
    }

    const result = await completeOrderByPickupCode(pickupCodeInput.trim());
    if (!result.ok) {
      setCompletionError(result.error);
    } else {
      setCompletionSuccess(
        `Pedido ${result.orderId?.slice(0, 8)} finalizado com sucesso!`,
      );
      setPickupCodeInput("");
      setTimeout(() => setCompletionSuccess(""), 5000);
    }
  };

  const handleDelete = async (orderId: string) => {
    setLoading(orderId, true);
    await deleteOrderByAdmin({ id: orderId });
    setLoading(orderId, false);
  };

  const filteredOrders =
    filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  const activeOrders = orders.filter(
    (o) => !["COMPLETED", "CANCELLED", "EXPIRED"].includes(o.status),
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-800">
            {orders.filter((o) => o.status === "PAID").length}
          </p>
          <p className="text-xs text-blue-600">Pagos</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-2xl font-bold text-orange-800">
            {orders.filter((o) => o.status === "PREPARING").length}
          </p>
          <p className="text-xs text-orange-600">Preparando</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-2xl font-bold text-green-800">
            {orders.filter((o) => o.status === "READY_FOR_PICKUP").length}
          </p>
          <p className="text-xs text-green-600">Pronto</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-2xl font-bold text-gray-800">
            {orders.filter((o) => o.status === "COMPLETED").length}
          </p>
          <p className="text-xs text-gray-600">Finalizados</p>
        </div>
      </div>

      {/* New order alert */}
      {newOrderAlert && (
        <div className="flex items-center justify-between rounded-xl border border-blue-300 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              Novo(s) pedido(s) recebido(s)!
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewOrderAlert(false)}
          >
            Dispensar
          </Button>
        </div>
      )}

      {/* Complete by code */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Search className="size-4" />
          Finalizar pedido por código
        </h3>
        <div className="flex gap-2">
          <Input
            value={pickupCodeInput}
            onChange={(e) => setPickupCodeInput(e.target.value.toUpperCase())}
            placeholder="Ex: A3F7K2"
            className="h-10 font-mono uppercase tracking-widest"
            maxLength={6}
            onKeyDown={(e) => e.key === "Enter" && handleCompleteByCode()}
          />
          <Button onClick={handleCompleteByCode} className="shrink-0">
            Finalizar
          </Button>
        </div>
        {completionError && (
          <p className="text-sm text-destructive">{completionError}</p>
        )}
        {completionSuccess && (
          <p className="text-sm text-green-600">{completionSuccess}</p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            "ALL",
            "PAID",
            "PREPARING",
            "READY_FOR_PICKUP",
            "COMPLETED",
          ] as const
        ).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {s === "ALL"
              ? `Todos (${orders.length})`
              : `${statusConfig[s].label} (${orders.filter((o) => o.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const config = statusConfig[order.status] ?? statusConfig.PENDING;
          const StatusIcon = config.icon;
          const isLoading = loadingActions.has(order.id);

          return (
            <article
              key={order.id}
              className="space-y-3 rounded-xl border border-border bg-card p-4 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate font-medium">
                    {order.customer_name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {order.customer_email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(order.created_at)} •{" "}
                    {order.delivery_method === "MOTEL_PICKUP"
                      ? "Portaria"
                      : `Quarto ${order.room_number}`}{" "}
                    • {formatPrice(Number(order.total_amount))}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${config.color}`}
                  >
                    <StatusIcon className="size-3" />
                    {config.label}
                  </span>
                  {order.pickup_code && (
                    <span className="font-mono text-xs tracking-wider text-muted-foreground">
                      {order.pickup_code}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons based on status */}
              <div className="flex flex-wrap gap-2">
                {/* PAID → PREPARING */}
                {order.status === "PAID" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleStatusUpdate(order.id, "PREPARING")}
                    className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    {isLoading ? "..." : "Iniciar Preparo"}
                    <ArrowRight className="ml-1 size-3" />
                  </Button>
                )}

                {/* PREPARING → READY_FOR_PICKUP */}
                {order.status === "PREPARING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() =>
                      handleStatusUpdate(order.id, "READY_FOR_PICKUP")
                    }
                    className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                  >
                    {isLoading ? "..." : "Pronto p/ Retirada"}
                    <ArrowRight className="ml-1 size-3" />
                  </Button>
                )}

                {/* READY_FOR_PICKUP → COMPLETED (admin direct complete) */}
                {isAdmin && order.status === "READY_FOR_PICKUP" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleStatusUpdate(order.id, "COMPLETED")}
                    className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    {isLoading ? "..." : "Finalizar Entrega"}
                    <CheckCircle className="ml-1 size-3" />
                  </Button>
                )}

                {/* ADMIN: cancel order */}
                {isAdmin && !["COMPLETED", "CANCELLED", "EXPIRED"].includes(order.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => handleStatusUpdate(order.id, "CANCELLED")}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Cancelar
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => handleDelete(order.id)}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
            </article>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum pedido encontrado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
