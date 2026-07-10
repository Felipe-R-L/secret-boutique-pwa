"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ShoppingBag,
  Package,
  Boxes,
  Settings,
  UserCog,
  Compass,
  Bell,
  Activity,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAuditLogs, type AuditLogView } from "@/lib/actions/audit";

const ACTION_LABELS: Record<string, string> = {
  "order.create": "Criou pedido",
  "order.update": "Editou pedido",
  "order.status_change": "Alterou status do pedido",
  "order.cancel": "Cancelou pedido",
  "order.complete": "Finalizou pedido",
  "order.delete": "Excluiu pedido",
  "product.create": "Criou produto",
  "product.update": "Editou produto",
  "product.delete": "Excluiu produto",
  "product.import": "Importou produtos (CSV)",
  "inventory.entry": "Lançou entrada de estoque",
  "inventory.adjustment": "Ajustou estoque",
  "settings.update_hero": "Atualizou textos da loja",
  "settings.update_categories": "Atualizou categorias",
  "admin_user.upsert": "Criou/editou usuário admin",
  "admin_user.remove": "Removeu usuário admin",
  "notification.subscribe": "Ativou notificações",
  "notification.unsubscribe": "Desativou notificações",
  navigate: "Navegou",
};

const CATEGORY_META: Record<
  string,
  { label: string; color: string; icon: typeof Activity }
> = {
  order: {
    label: "Pedidos",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: ShoppingBag,
  },
  product: {
    label: "Produtos",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Package,
  },
  inventory: {
    label: "Estoque",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: Boxes,
  },
  settings: {
    label: "Configurações",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    icon: Settings,
  },
  admin_user: {
    label: "Usuários",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: UserCog,
  },
  navigation: {
    label: "Navegação",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Compass,
  },
  notification: {
    label: "Notificações",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Bell,
  },
  general: {
    label: "Geral",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Activity,
  },
};

const CATEGORY_FILTERS = [
  "ALL",
  "order",
  "product",
  "inventory",
  "settings",
  "admin_user",
  "notification",
  "navigation",
] as const;

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function formatMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return null;
  return entries
    .map(([k, v]) =>
      typeof v === "object" ? `${k}: ${JSON.stringify(v)}` : `${k}: ${v}`,
    )
    .join(" • ");
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLogPanel({
  initialLogs,
}: {
  initialLogs: AuditLogView[];
}) {
  const [logs, setLogs] = useState<AuditLogView[]>(initialLogs);
  const [category, setCategory] =
    useState<(typeof CATEGORY_FILTERS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const refetch = (
    nextCategory: (typeof CATEGORY_FILTERS)[number],
    nextSearch: string,
  ) => {
    startTransition(async () => {
      setError("");
      const result = await listAuditLogs({
        limit: 200,
        category: nextCategory,
        search: nextSearch || undefined,
      });
      if (result.ok) {
        setLogs(result.data);
      } else {
        setError(result.error);
      }
    });
  };

  // Refiltra no servidor quando a categoria muda.
  useEffect(() => {
    refetch(category, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && refetch(category, search)}
              placeholder="Filtrar por e-mail do usuário…"
              className="h-10 pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => refetch(category, search)}
            disabled={isPending}
            className="shrink-0"
          >
            <RefreshCw
              className={`size-4 ${isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Tabs de categoria */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              category === c
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {c === "ALL" ? "Todos" : CATEGORY_META[c]?.label ?? c}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {logs.map((log) => {
          const meta = CATEGORY_META[log.category] ?? CATEGORY_META.general;
          const Icon = meta.icon;
          const metaLine = formatMetadata(log.metadata);

          return (
            <article
              key={log.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border ${meta.color}`}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium">
                    {actionLabel(log.action)}
                  </span>
                  {log.targetLabel && log.category !== "navigation" && (
                    <span className="truncate text-sm text-muted-foreground">
                      — {log.targetLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {log.actorEmail ?? "desconhecido"}
                  {log.actorRole ? ` (${log.actorRole})` : ""} •{" "}
                  {formatDate(log.createdAt)}
                  {log.category === "navigation" && log.path
                    ? ` • ${log.path}`
                    : ""}
                </p>
                {metaLine && (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {metaLine}
                  </p>
                )}
              </div>
            </article>
          );
        })}

        {logs.length === 0 && !isPending && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum registro encontrado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
