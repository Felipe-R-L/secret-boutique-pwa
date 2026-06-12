"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";

const HIDDEN_PREFIXES = ["/cart", "/checkout", "/admin", "/auth"];

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function CartBar() {
  const pathname = usePathname();
  const itemCount = useCartStore((state) => state.getItemCount());
  const total = useCartStore((state) => state.getTotal());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || itemCount === 0) return null;
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
      <Link
        href="/cart"
        className="flex h-14 items-center justify-between rounded-full bg-primary px-5 text-primary-foreground shadow-2xl shadow-primary/30 transition-transform active:scale-[0.98] animate-in slide-in-from-bottom-4 duration-300"
      >
        <span
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <ShoppingBag className="size-4" />
          Ver carrinho · {itemCount} {itemCount === 1 ? "item" : "itens"}
        </span>
        <span className="flex items-center gap-2 font-sans text-base font-bold">
          {formatBRL(total)}
          <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}
