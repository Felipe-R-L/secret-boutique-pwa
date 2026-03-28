"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createStockEntry, createStockAdjustment } from "@/lib/actions/inventory";
import type { InventoryMovement } from "@/lib/actions/inventory";

type ProductOption = {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
};

interface InventoryPanelProps {
  products: ProductOption[];
  movements: InventoryMovement[];
}

const typeLabels: Record<string, { label: string; color: string }> = {
  ENTRY: { label: "Entrada", color: "bg-green-100 text-green-700 border-green-200" },
  EXIT: { label: "Saída", color: "bg-red-100 text-red-700 border-red-200" },
  SALE: { label: "Venda", color: "bg-blue-100 text-blue-700 border-blue-200" },
  ADJUSTMENT: { label: "Ajuste", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function InventoryPanel({ products, movements }: InventoryPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Entry form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [notes, setNotes] = useState("");

  // Adjustment form state
  const [adjProductId, setAdjProductId] = useState("");
  const [adjQuantity, setAdjQuantity] = useState("");
  const [adjType, setAdjType] = useState<"ENTRY" | "EXIT" | "ADJUSTMENT">("ADJUSTMENT");
  const [adjNotes, setAdjNotes] = useState("");

  const unitCost = useMemo(() => {
    const qty = Number(quantity);
    const total = Number(invoiceTotal);
    if (qty > 0 && total > 0) {
      return Number((total / qty).toFixed(2));
    }
    return null;
  }, [quantity, invoiceTotal]);

  const handleStockEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    startTransition(async () => {
      const result = await createStockEntry({
        productId: selectedProductId,
        quantity: Number(quantity),
        invoiceTotal: Number(invoiceTotal),
        notes: notes.trim() || undefined,
      });

      if (!result.ok) {
        setMessage(result.error);
        setIsError(true);
        return;
      }

      setMessage("Entrada de estoque registrada com sucesso!");
      setIsError(false);
      setQuantity("");
      setInvoiceTotal("");
      setNotes("");
    });
  };

  const handleAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    startTransition(async () => {
      const result = await createStockAdjustment({
        productId: adjProductId,
        quantity: Number(adjQuantity),
        type: adjType,
        notes: adjNotes.trim() || undefined,
      });

      if (!result.ok) {
        setMessage(result.error);
        setIsError(true);
        return;
      }

      setMessage("Ajuste de estoque registrado com sucesso!");
      setIsError(false);
      setAdjQuantity("");
      setAdjNotes("");
    });
  };

  return (
    <div className="space-y-8">
      {/* Stock Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-xl border border-border bg-card p-4 space-y-2"
          >
            <p className="text-sm font-medium text-foreground line-clamp-1">
              {product.name}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatCurrency(product.price)}
              </span>
              <Badge
                variant={product.stock_quantity > 0 ? "secondary" : "outline"}
                className={
                  product.stock_quantity > 0
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-red-100 text-red-700 border-red-200"
                }
              >
                <Package className="mr-1 size-3" />
                {product.stock_quantity} un.
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock Entry Form */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="size-5 text-green-600" />
            <h3 className="text-base font-semibold">Entrada de Estoque</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Informe o valor total da nota fiscal e a quantidade. O custo
            unitário será calculado automaticamente.
          </p>

          <form onSubmit={handleStockEntry} className="space-y-3">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              required
            >
              <option value="">Selecione o produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stock_quantity} un.)
                </option>
              ))}
            </select>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantidade"
                required
              />
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={invoiceTotal}
                onChange={(e) => setInvoiceTotal(e.target.value)}
                placeholder="Valor total da NF (R$)"
                required
              />
            </div>

            {unitCost !== null && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                <DollarSign className="size-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Custo unitário: {formatCurrency(unitCost)}
                </span>
              </div>
            )}

            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações (opcional)"
            />

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Registrando..." : "Registrar Entrada"}
            </Button>
          </form>
        </section>

        {/* Adjustment Form */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="size-5 text-amber-600" />
            <h3 className="text-base font-semibold">Ajuste de Estoque</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Para saídas manuais, devoluções ou correções de inventário.
          </p>

          <form onSubmit={handleAdjustment} className="space-y-3">
            <select
              value={adjProductId}
              onChange={(e) => setAdjProductId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              required
            >
              <option value="">Selecione o produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stock_quantity} un.)
                </option>
              ))}
            </select>

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={adjType}
                onChange={(e) =>
                  setAdjType(e.target.value as "ENTRY" | "EXIT" | "ADJUSTMENT")
                }
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Saída</option>
                <option value="ADJUSTMENT">Ajuste (+)</option>
              </select>
              <Input
                type="number"
                min="1"
                step="1"
                value={adjQuantity}
                onChange={(e) => setAdjQuantity(e.target.value)}
                placeholder="Quantidade"
                required
              />
            </div>

            <Input
              value={adjNotes}
              onChange={(e) => setAdjNotes(e.target.value)}
              placeholder="Motivo do ajuste"
            />

            <Button
              type="submit"
              variant="secondary"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Registrando..." : "Registrar Ajuste"}
            </Button>
          </form>
        </section>
      </div>

      {/* Feedback message */}
      {message && (
        <p
          className={`rounded-md border px-3 py-2 text-xs ${
            isError
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </p>
      )}

      {/* Movements History */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Histórico de Movimentos</h3>
        </div>

        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum movimento registrado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Total NF
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Custo Un.
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Obs.
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mov) => {
                  const typeInfo = typeLabels[mov.type] ?? {
                    label: mov.type,
                    color: "bg-muted text-muted-foreground",
                  };
                  return (
                    <tr
                      key={mov.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(mov.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {mov.product_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {mov.type === "EXIT" || mov.type === "SALE"
                          ? `-${mov.quantity}`
                          : `+${mov.quantity}`}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {mov.invoice_total != null
                          ? formatCurrency(mov.invoice_total)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {mov.unit_cost != null
                          ? formatCurrency(mov.unit_cost)
                          : "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">
                        {mov.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
