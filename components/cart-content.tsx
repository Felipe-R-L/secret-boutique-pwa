"use client";

import { useEffect, useMemo, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShoppingBag, ArrowRight, Plus } from "lucide-react";
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

  // Uma vez por visita ao carrinho, já com o carrinho reidratado.
  const cartViewTracked = useRef(false);
  useEffect(() => {
    if (cartViewTracked.current || items.length === 0) return;
    cartViewTracked.current = true;
    trackEvent("cart_view", {
      value: getTotal(),
      props: { items: items.length },
    });
  }, [items, getTotal]);

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
    ].slice(0, 6);
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

      <main className="mx-auto w-full max-w-4xl p-4 md:px-6 md:py-6 lg:max-w-6xl">
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
          // Celular: itens → sugestões compactas → checkout, sem empurrar o
          // formulário para baixo. Desktop: checkout fixo na coluna da direita.
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-10">
            <div className="min-w-0 space-y-8">
              <div className="space-y-3">
                {items.map((item) => (
                  <CartItem
                    key={getCartItemKey(item.product.id, item.variant?.id)}
                    item={item}
                  />
                ))}
              </div>

              {/* Cross-sell em fileira com rolagem lateral */}
              {suggestions.length > 0 && (
                <section aria-label="Sugestões de produtos">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      Você também pode gostar
                    </h2>
                    <Link
                      href="/"
                      className="-my-2 py-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Ver catálogo
                    </Link>
                  </div>
                  <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:scroll-px-6 md:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
                    {suggestions.map((product) => (
                      <div
                        key={product.id}
                        className="w-36 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card lg:w-auto"
                      >
                        <div className="relative aspect-square bg-muted">
                          <Image
                            src={getPrimaryProductImage(product)}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 144px, 220px"
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
                              className="relative size-9 shrink-0 rounded-full after:absolute after:-inset-1 after:content-['']"
                              aria-label={`Adicionar ${product.name} ao carrinho`}
                              onClick={() => {
                                addItem(product);
                                showAddedToCartToast(product.name);
                              }}
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="lg:sticky lg:top-20 lg:rounded-3xl lg:border lg:border-border lg:bg-card lg:p-6">
              <CheckoutForm
                onSuccess={() => {
                  // handled by checkout form navigation
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
