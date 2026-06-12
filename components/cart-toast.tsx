"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@vercel/analytics";

export function showAddedToCartToast(productName: string) {
  track("add_to_cart", { product: productName });

  toast.custom(
    (t) => (
      <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pastel-sage">
            <Check className="size-4 text-secondary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Adicionado ao carrinho
            </p>
            <p
              className="truncate text-xs text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {productName}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 rounded-full text-xs"
            onClick={() => {
              toast.dismiss(t);
            }}
          >
            Continuar Comprando
          </Button>
          <Button size="sm" className="h-9 flex-1 rounded-full text-xs" asChild>
            <Link href="/cart" onClick={() => toast.dismiss(t)}>
              Ver Carrinho
            </Link>
          </Button>
        </div>
      </div>
    ),
    {
      duration: 4000,
      position: "bottom-center",
      style: { width: "100%", maxWidth: "400px" },
    },
  );
}
