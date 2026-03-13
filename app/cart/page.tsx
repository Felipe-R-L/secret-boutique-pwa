"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanicButton } from "@/components/panic-button";
import { CartItem } from "@/components/cart-item";
import { CheckoutForm } from "@/components/checkout-form";
import { useCartStore } from "@/lib/store/cart-store";

export default function CartPage() {
  const items = useCartStore((state) => state.items);

  return (
    <div className="min-h-screen bg-background">
      <PanicButton />

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" aria-label="Voltar">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Carrinho</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl p-4 md:px-6 md:py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground">
              Carrinho vazio
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione produtos para continuar
            </p>
            <Button asChild className="mt-6">
              <Link href="/">Ver Catalogo</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
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
