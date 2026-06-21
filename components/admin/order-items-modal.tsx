"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getOrderItems, type OrderItemView } from "@/lib/actions/orders";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);

interface OrderItemsButtonProps {
  orderId: string;
  customerName: string;
  totalAmount: number;
}

export function OrderItemsButton({
  orderId,
  customerName,
  totalAmount,
}: OrderItemsButtonProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrderItemView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && items === null && !loading) {
      setLoading(true);
      setError("");
      const result = await getOrderItems({ orderId });
      if (result.ok) {
        setItems(result.items);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
  };

  const itemCount = items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleOpenChange(true)}
        className="gap-1.5 text-xs"
      >
        <ShoppingBag className="size-3.5" />
        Ver itens
      </Button>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Itens do pedido</DialogTitle>
          <DialogDescription>
            {customerName} • {formatPrice(Number(totalAmount))}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="size-14 shrink-0 rounded-md bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && items && (
          <>
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-muted-foreground">
                        <Package className="size-5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.variantLabel && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            {items.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum item encontrado para este pedido.
              </p>
            )}

            {items.length > 0 && (
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  {itemCount} {itemCount === 1 ? "item" : "itens"}
                </span>
                <span className="font-semibold">
                  Total {formatPrice(Number(totalAmount))}
                </span>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
