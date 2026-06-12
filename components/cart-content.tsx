"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/components/cart-item";
import { CheckoutForm } from "@/components/checkout-form";
import {
  useCartStore,
  getCartItemKey,
  Product,
} from "@/lib/store/cart-store";
import { getPrimaryProductImage } from "@/lib/product-images";
import { hasProductVariants } from "@/lib/product-variants";
import { showAddedToCartToast } from "@/components/cart-toast";
import { useAgeModeStore } from "@/lib/store/age-mode-store";

interface CartContentProps {
  products: Product[];
}

export function CartContent({ products }: CartContentProps) {
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const addItem = useCartStore((state) => state.addItem);
  const isAdultMode = useAgeModeStore((state) => state.mode === "adult");

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);

  // Sugestões: produtos fora do carrinho, em estoque e sem variantes (para o
  // "Adicionar" funcionar em um clique). Mesma categoria dos itens primeiro.
  const suggestions = useMemo(() => {
    if (items.length === 0) return [];

    const inCart = new Set(items.map((item) => item.product.id));
    const cartCategories = new Set(
      items.map((item) => item.product.category),
    );

    const pool = products.filter(
      (product) =>
        !inCart.has(product.id) &&
        (product.inStock ?? true) &&
        !hasProductVariants(product) &&
        (isAdultMode || !(product.is_adult ?? true)),
    );

    return [
      ...pool.filter((product) => cartCategories.has(product.category)),
      ...pool.filter((product) => !cartCategories.has(product.category)),
    ].slice(0, 4);
  }, [products, items, isAdultMode]);

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
            <Button asChild className="mt-6 h-12 rounded-full px-6">
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
                <CartItem
                  key={getCartItemKey(item.product.id, item.variant?.id)}
                  item={item}
                />
              ))}
            </div>

            {/* Cross-sell */}
            {suggestions.length > 0 && (
              <section aria-label="Sugestões de produtos">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Você também pode gostar
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {suggestions.map((product) => (
                    <div
                      key={product.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <div className="relative aspect-square bg-muted">
                        <Image
                          src={getPrimaryProductImage(product)}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 200px"
                        />
                      </div>
                      <div className="space-y-2 p-2.5">
                        <p
                          className="line-clamp-2 min-h-8 text-xs font-medium leading-snug text-foreground"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {product.name}
                        </p>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-sans text-sm font-semibold text-foreground">
                            {formatPrice(product.price)}
                          </span>
                          <Button
                            size="icon-sm"
                            className="size-7 shrink-0 rounded-full"
                            aria-label={`Adicionar ${product.name} ao carrinho`}
                            onClick={() => {
                              addItem(product);
                              showAddedToCartToast(product.name);
                            }}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
