"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/components/cart-item";
import { CheckoutForm } from "@/components/checkout-form";
import { useCartStore } from "@/lib/store/cart-store";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);

  return (
    <div className="min-h-screen bg-background">

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" aria-label="Voltar">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Carrinho</h1>
          {items.length > 0 && (
            <span
              className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {items.length} {items.length === 1 ? "item" : "itens"} •{" "}
              {formatPrice(getTotal())}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl p-4 md:px-6 md:py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-pastel-lavender/20">
              <ShoppingBag className="size-9 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground">
              Carrinho vazio
            </h2>
            <p
              className="mt-1 text-sm text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Adicione produtos para continuar
            </p>
            <Button
              asChild
              className="mt-6 h-12 rounded-full px-6"
            >
              <Link href="/">
                Explorar Catálogo
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>

            {/* Continue shopping CTA */}
            <div className="flex items-center gap-3 rounded-2xl bg-pastel-peach/15 p-4">
              <Sparkles className="size-5 shrink-0 text-foreground/50" />
              <p
                className="flex-1 text-sm text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Quer levar mais alguma coisa? Explore nosso catálogo completo.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full"
                asChild
              >
                <Link href="/">Ver mais</Link>
              </Button>
            </div>

            <CheckoutForm
              onSuccess={() => {
                // handled by checkout form navigation
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
