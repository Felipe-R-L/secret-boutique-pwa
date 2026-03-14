"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrderHistoryStore } from "@/lib/store/order-history-store";

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: {
    label: "Aguardando Pagamento",
    color: "bg-yellow-100 text-yellow-800",
  },
  PAID: { label: "Pagamento Confirmado", color: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "Em Preparo", color: "bg-orange-100 text-orange-800" },
  READY_FOR_PICKUP: {
    label: "Pronto p/ Retirada",
    color: "bg-green-100 text-green-800",
  },
  COMPLETED: { label: "Finalizado", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
  EXPIRED: { label: "Expirado", color: "bg-gray-100 text-gray-500" },
};

export default function MeusPedidosPage() {
  const orders = useOrderHistoryStore((s) => s.orders);
  const updateOrderStatus = useOrderHistoryStore((s) => s.updateOrderStatus);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshStatus = useCallback(
    async (orderId: string) => {
      setRefreshing((prev) => new Set(prev).add(orderId));
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data?.status) {
            updateOrderStatus(orderId, json.data.status);
          }
        }
      } catch {
        // ignore
      }
      setRefreshing((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    },
    [updateOrderStatus],
  );

  // Refresh all active orders on mount
  useEffect(() => {
    if (!mounted) return;
    orders.forEach((order) => {
      if (
        !order.status ||
        !["COMPLETED", "CANCELLED", "EXPIRED"].includes(order.status)
      ) {
        refreshStatus(order.orderId);
      }
    });
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" aria-label="Voltar">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-foreground">
            Meus Pedidos
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl p-4 md:px-6 md:py-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-pastel-lavender/20">
              <ShoppingBag className="size-9 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground">
              Nenhum pedido ainda
            </h2>
            <p
              className="mt-1 text-sm text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Seus pedidos aparecerão aqui automaticamente
            </p>
            <Button asChild className="mt-6 h-12 rounded-full px-6">
              <Link href="/">Explorar Catálogo</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p
              className="text-sm text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Histórico salvo neste dispositivo
            </p>

            {orders.map((order) => {
              const status = statusLabels[order.status ?? "PENDING"] ??
                statusLabels.PENDING;
              const isRefreshing = refreshing.has(order.orderId);

              return (
                <div
                  key={order.orderId}
                  className="space-y-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        #{order.orderId.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.date)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {order.pickupCode && (
                    <div className="rounded-xl bg-pastel-peach/15 p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Código de retirada
                      </p>
                      <p className="font-mono text-xl font-bold tracking-widest text-foreground">
                        {order.pickupCode}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="font-medium">{formatPrice(order.total)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRefreshing}
                      onClick={() => refreshStatus(order.orderId)}
                      className="text-xs"
                    >
                      <RefreshCw
                        className={`mr-1 size-3 ${isRefreshing ? "animate-spin" : ""}`}
                      />
                      Atualizar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
