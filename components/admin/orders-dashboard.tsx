"use client";

import { formatCents } from "@/lib/money";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Package,
  Clock,
  CheckCircle,
  ArrowRight,
  Bell,
  BellOff,
  Search,
  Trash2,
  CreditCard,
  Banknote,
  HandCoins,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  updateOrderStatus,
  completeOrderByPickupCode,
  deleteOrderByAdmin,
} from "@/lib/actions/orders";
import { confirmInPersonPayment } from "@/lib/actions/reception";
import {
  cashChangeDueCents,
  describeInPersonPayment,
  PAYMENT_METHOD_LABELS,
} from "@/lib/payment-labels";
import type { OrderStatus } from "@/lib/supabase/database.types";
import { OrderItemsButton } from "@/components/admin/order-items-modal";
import {
  isAudioUnlocked,
  playNotificationSound,
  primeAudio,
} from "@/lib/sound";
import { ADMIN_ORDER_COLUMNS, ADMIN_ORDER_LIMIT } from "@/lib/admin-orders";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  delivery_method: string;
  room_number: string | null;
  delivery_fee_cents?: number | null;
  delivery_cep?: string | null;
  delivery_street?: string | null;
  delivery_number?: string | null;
  delivery_complement?: string | null;
  delivery_neighborhood?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  status: OrderStatus;
  payment_method?: string | null;
  cash_change_for_cents?: number | null;
  channel?: string | null;
  total_cents: number;
  pickup_code: string | null;
  created_at: string;
  updated_at: string;
};

// Pedido "pagar na entrega" (cartão/dinheiro) que ainda não foi cobrado.
function isAwaitingInPersonPayment(order: Order): boolean {
  return (
    order.status === "PENDING" &&
    (order.payment_method === "CARD" || order.payment_method === "CASH")
  );
}

/**
 * Pedido que a equipe precisa atender agora: Pix que acabou de ser pago
 * (o webhook passa de PENDING para PAID) ou "pagar na entrega" recém-criado
 * pelo site. Pedido lançado pela própria recepção não toca.
 */
function needsAttention(order: Order, previous: Order | undefined): boolean {
  if (previous) {
    return previous.status !== "PAID" && order.status === "PAID";
  }
  return (
    order.status === "PAID" ||
    (isAwaitingInPersonPayment(order) && order.channel !== "RECEPTION")
  );
}

function paymentSummary(order: Order): string {
  const method = order.payment_method ?? "PIX";
  if (method === "PIX") return PAYMENT_METHOD_LABELS.PIX;
  const label = describeInPersonPayment(method, order.cash_change_for_cents);
  const change = cashChangeDueCents(
    order.cash_change_for_cents,
    order.total_cents,
  );
  if (method === "CASH" && change && order.status === "PENDING") {
    return `${label} (levar ${formatCents(change)} de troco)`;
  }
  return label;
}

function deliveryShortLabel(order: Order): string {
  if (order.delivery_method === "MOTEL_PICKUP") return "Portaria";
  if (order.delivery_method === "HOME_DELIVERY") return "Domicílio";
  return `Quarto ${order.room_number ?? ""}`.trim();
}

function formatFullAddress(order: Order): string | null {
  if (order.delivery_method !== "HOME_DELIVERY") return null;
  const line1 = [order.delivery_street, order.delivery_number]
    .filter(Boolean)
    .join(", ");
  const withComplement = order.delivery_complement
    ? `${line1} - ${order.delivery_complement}`
    : line1;
  const line2 = [
    order.delivery_neighborhood,
    [order.delivery_city, order.delivery_state].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(", ");
  const cep = order.delivery_cep ? `CEP ${order.delivery_cep}` : "";
  return [withComplement, line2, cep].filter(Boolean).join(" — ");
}

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

// Ação pendente de confirmação. `status` cobre tanto avanços normais quanto o
// cancelamento (status === "CANCELLED"); `delete` remove o pedido em definitivo.
type ConfirmAction =
  | { kind: "status"; orderId: string; newStatus: OrderStatus }
  | { kind: "delete"; orderId: string }
  | { kind: "settle"; orderId: string; method: "CARD" | "CASH" };

// "A cobrar" não é um status do banco: são os PENDING com pagamento presencial.
type OrderFilter = OrderStatus | "ALL" | "TO_COLLECT";

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
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [soundBlocked, setSoundBlocked] = useState(false);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const unseenRef = useRef(0);
  const baseTitleRef = useRef("");

  // Alerta visual + som quando chega pedido que pede ação. Com a aba em
  // segundo plano, o título passa a contar os pedidos novos até ela voltar.
  // O push (celular/desktop) é enviado separadamente pelo servidor.
  const notifyNewOrders = useCallback((count: number) => {
    if (count <= 0) return;
    setNewOrderAlert(true);
    playNotificationSound();
    if (document.hidden) {
      unseenRef.current += count;
      document.title = `(${unseenRef.current}) Novo pedido • ${baseTitleRef.current}`;
    }
  }, []);

  // O navegador só libera som depois de um clique/toque na página. Ao
  // recarregar o painel o áudio volta bloqueado, então qualquer gesto serve.
  useEffect(() => {
    setSoundBlocked(!isAudioUnlocked());
    const unlock = () => {
      void primeAudio().then((ok) => {
        setSoundBlocked(!ok);
        if (ok) {
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("keydown", unlock);
        }
      });
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Real-time subscription
  useEffect(() => {
    baseTitleRef.current = document.title;
    const supabase = createClient();
    let resyncTimer: ReturnType<typeof setTimeout> | null = null;
    let disconnected = false;

    // Recarrega a lista do banco. Cobre o que o realtime perdeu enquanto a
    // aba estava em segundo plano ou a conexão caiu, e toca para o que chegou.
    const resync = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(ADMIN_ORDER_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(ADMIN_ORDER_LIMIT);
      if (error || !data) return;
      const fresh = data as Order[];
      const known = new Map(ordersRef.current.map((o) => [o.id, o]));
      const missed = fresh.filter((o) =>
        needsAttention(o, known.get(o.id)),
      ).length;
      setOrders(fresh);
      notifyNewOrders(missed);
    };

    const scheduleResync = () => {
      if (resyncTimer) clearTimeout(resyncTimer);
      resyncTimer = setTimeout(() => void resync(), 500);
    };

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
            setOrders((prev) => [
              newOrder,
              ...prev.filter((o) => o.id !== newOrder.id),
            ]);
            if (needsAttention(newOrder, undefined)) notifyNewOrders(1);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Order;
            const previous = ordersRef.current.find((o) => o.id === updated.id);
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? updated : o)),
            );
            if (previous && needsAttention(updated, previous)) {
              notifyNewOrders(1);
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setOrders((prev) => prev.filter((o) => o.id !== deleted.id));
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Reconectou depois de uma queda: busca o que passou nesse meio.
          if (disconnected) scheduleResync();
          disconnected = false;
        } else {
          disconnected = true;
        }
      });

    const onVisibility = () => {
      if (document.hidden) return;
      unseenRef.current = 0;
      document.title = baseTitleRef.current;
      scheduleResync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (resyncTimer) clearTimeout(resyncTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      document.title = baseTitleRef.current;
      supabase.removeChannel(channel);
    };
  }, [notifyNewOrders]);

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
      toast.error("Não foi possível atualizar o pedido", {
        description: result.error,
      });
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

  const handleSettle = async (orderId: string, method: "CARD" | "CASH") => {
    setLoading(orderId, true);
    const result = await confirmInPersonPayment({
      orderId,
      method,
      complete: true,
    });
    if (!result.ok) {
      toast.error("Não foi possível confirmar o pagamento", {
        description: result.error,
      });
    } else {
      // O realtime também atualiza; aqui só evita o atraso na tela.
      const now = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: result.status,
                payment_method: method,
                updated_at: now,
              }
            : o,
        ),
      );
      toast.success(
        method === "CARD"
          ? "Pago no cartão — pedido finalizado"
          : "Pago em dinheiro — pedido finalizado",
      );
    }
    setLoading(orderId, false);
  };

  const handleDelete = async (orderId: string) => {
    setLoading(orderId, true);
    await deleteOrderByAdmin({ id: orderId });
    setLoading(orderId, false);
  };

  // Executa a ação pendente depois que o admin confirma no modal.
  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    if (action.kind === "delete") {
      await handleDelete(action.orderId);
    } else if (action.kind === "settle") {
      await handleSettle(action.orderId, action.method);
    } else {
      await handleStatusUpdate(action.orderId, action.newStatus);
    }
  };

  // Texto do modal conforme a ação. Cancelamento e exclusão recebem aviso
  // explícito de que NÃO há estorno automático no Mercado Pago.
  const confirmCopy = (() => {
    if (!confirmAction) return null;
    const order = orders.find((o) => o.id === confirmAction.orderId);
    const who = order?.customer_name ?? "o cliente";

    if (confirmAction.kind === "settle") {
      const total = order ? formatCents(order.total_cents) : "";
      const how =
        confirmAction.method === "CARD" ? "no cartão" : "em dinheiro";
      return {
        title: `Recebeu ${total} ${how}?`,
        description: `O pedido de ${who} será marcado como pago ${how} e finalizado, e o estoque dos produtos será baixado.`,
        confirmLabel: "Confirmar recebimento",
        destructive: false,
      };
    }

    if (confirmAction.kind === "delete") {
      return {
        title: "Excluir pedido?",
        description: `O pedido de ${who} será removido permanentemente do sistema. Esta ação não pode ser desfeita e não estorna o pagamento — faça o reembolso no painel do Mercado Pago, se necessário.`,
        confirmLabel: "Excluir pedido",
        destructive: true,
      };
    }

    if (
      confirmAction.newStatus === "CANCELLED" &&
      order &&
      isAwaitingInPersonPayment(order)
    ) {
      return {
        title: "Cancelar pedido?",
        description: `O pedido de ${who} ainda não foi pago nem saiu do estoque. Ele será marcado como Cancelado.`,
        confirmLabel: "Cancelar pedido",
        destructive: true,
      };
    }

    if (confirmAction.newStatus === "CANCELLED") {
      return {
        title: "Cancelar pedido?",
        description: `O pedido de ${who} será marcado como Cancelado. Atenção: isto NÃO estorna o pagamento no Mercado Pago nem devolve o estoque — faça o reembolso manualmente, se for o caso.`,
        confirmLabel: "Cancelar pedido",
        destructive: true,
      };
    }

    const statusLabel =
      statusConfig[confirmAction.newStatus]?.label ?? confirmAction.newStatus;
    return {
      title: "Alterar status do pedido?",
      description: `O pedido de ${who} passará para "${statusLabel}". O cliente pode ser notificado por e-mail.`,
      confirmLabel: "Confirmar",
      destructive: false,
    };
  })();

  const toCollectCount = orders.filter(isAwaitingInPersonPayment).length;

  const filteredOrders =
    filter === "ALL"
      ? orders
      : filter === "TO_COLLECT"
        ? orders.filter(isAwaitingInPersonPayment)
        : orders.filter((o) => o.status === filter);

  const activeOrders = orders.filter(
    (o) => !["COMPLETED", "CANCELLED", "EXPIRED"].includes(o.status),
  );

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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <p className="text-2xl font-bold text-purple-800">{toCollectCount}</p>
          <p className="text-xs text-purple-600">A cobrar</p>
        </div>
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

      {soundBlocked && (
        <button
          type="button"
          onClick={() => void primeAudio().then((ok) => setSoundBlocked(!ok))}
          className="flex w-full items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-900"
        >
          <BellOff className="size-4 shrink-0" />
          Som de novos pedidos bloqueado pelo navegador. Toque aqui (ou em
          qualquer lugar da página) para ativar.
        </button>
      )}

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
        <p className="text-xs text-muted-foreground">
          Para retiradas na portaria. Entregas no quarto são finalizadas
          direto no card do pedido, sem código.
        </p>
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
            "TO_COLLECT",
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
              : s === "TO_COLLECT"
                ? `A cobrar (${toCollectCount})`
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
          // Entrega no quarto e entrega a domicílio são "entregues" (sem
          // retirada por código); só a retirada na portaria usa o código.
          const isRoomDelivery =
            order.delivery_method === "ROOM_DELIVERY" ||
            order.delivery_method === "HOME_DELIVERY";
          const awaitingInPerson = isAwaitingInPersonPayment(order);
          const statusLabel = awaitingInPerson
            ? order.delivery_method === "ROOM_DELIVERY"
              ? "A cobrar na entrega"
              : "A cobrar na retirada"
            : order.status === "READY_FOR_PICKUP" && isRoomDelivery
              ? "Pronto p/ Entrega"
              : config.label;
          const statusColor = awaitingInPerson
            ? "bg-purple-100 text-purple-800 border-purple-200"
            : config.color;
          const StatusBadgeIcon = awaitingInPerson ? HandCoins : StatusIcon;

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
                  {order.customer_email && (
                    <p className="text-xs text-muted-foreground">
                      {order.customer_email}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(order.created_at)} • {deliveryShortLabel(order)}{" "}
                    • {formatCents(order.total_cents)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {paymentSummary(order)}
                    {order.channel === "RECEPTION"
                      ? " • lançado na recepção"
                      : ""}
                  </p>
                  {formatFullAddress(order) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      📍 {formatFullAddress(order)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusColor}`}
                  >
                    <StatusBadgeIcon className="size-3" />
                    {statusLabel}
                  </span>
                  {order.pickup_code && (
                    <span className="font-mono text-xs tracking-wider text-muted-foreground">
                      {order.pickup_code}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons based on status */}
              <div className="flex flex-wrap items-center gap-2">
                <OrderItemsButton
                  orderId={order.id}
                  customerName={order.customer_name}
                  totalCents={order.total_cents}
                />

                {/* Pagar na entrega: a equipe cobra e entrega no mesmo momento */}
                {awaitingInPerson && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() =>
                        setConfirmAction({
                          kind: "settle",
                          orderId: order.id,
                          method: "CARD",
                        })
                      }
                      className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <CreditCard className="mr-1 size-3" />
                      {isLoading ? "..." : "Recebi no cartão"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() =>
                        setConfirmAction({
                          kind: "settle",
                          orderId: order.id,
                          method: "CASH",
                        })
                      }
                      className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Banknote className="mr-1 size-3" />
                      {isLoading ? "..." : "Recebi em dinheiro"}
                    </Button>
                  </>
                )}

                {/* PAID → PREPARING */}
                {order.status === "PAID" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() =>
                      setConfirmAction({
                        kind: "status",
                        orderId: order.id,
                        newStatus: "PREPARING",
                      })
                    }
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
                      setConfirmAction({
                        kind: "status",
                        orderId: order.id,
                        newStatus: "READY_FOR_PICKUP",
                      })
                    }
                    className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                  >
                    {isLoading
                      ? "..."
                      : isRoomDelivery
                        ? "Pronto p/ Entrega"
                        : "Pronto p/ Retirada"}
                    <ArrowRight className="ml-1 size-3" />
                  </Button>
                )}

                {/* READY_FOR_PICKUP → COMPLETED. Entrega no quarto dispensa o
                    código (qualquer funcionário finaliza); retirada na
                    portaria exige o código — admin pode forçar direto. */}
                {(isAdmin || isRoomDelivery) &&
                  order.status === "READY_FOR_PICKUP" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() =>
                        setConfirmAction({
                          kind: "status",
                          orderId: order.id,
                          newStatus: "COMPLETED",
                        })
                      }
                      className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {isLoading
                        ? "..."
                        : order.delivery_method === "ROOM_DELIVERY"
                          ? `Entregue no Quarto ${order.room_number ?? ""}`.trim()
                          : order.delivery_method === "HOME_DELIVERY"
                            ? "Confirmar Entrega"
                            : "Finalizar Entrega"}
                      <CheckCircle className="ml-1 size-3" />
                    </Button>
                  )}

                {/* Cancelar: ADMIN sempre; STAFF só o "pagar na entrega" ainda
                    não cobrado (sem dinheiro nem estoque envolvidos). */}
                {(isAdmin || awaitingInPerson) &&
                  !["COMPLETED", "CANCELLED", "EXPIRED"].includes(order.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() =>
                      setConfirmAction({
                        kind: "status",
                        orderId: order.id,
                        newStatus: "CANCELLED",
                      })
                    }
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
                    onClick={() =>
                      setConfirmAction({ kind: "delete", orderId: order.id })
                    }
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

      {/* Modal único de confirmação reutilizado por status, cancelamento e exclusão */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          {confirmCopy && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmCopy.description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={runConfirmedAction}
                  className={
                    confirmCopy.destructive
                      ? "bg-destructive text-white hover:bg-destructive/90"
                      : undefined
                  }
                >
                  {confirmCopy.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
