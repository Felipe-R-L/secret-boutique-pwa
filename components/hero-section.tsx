"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/store/cart-store";
import { getPrimaryProductImage } from "@/lib/product-images";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  onProductSelect: (product: Product) => void;
  featuredProducts: Product[];
  heroTitle: string;
  heroSubtitle: string;
  stats: {
    completedOrdersCount: number;
    averageRating: number | null;
    totalReviews: number;
  };
}

const ROTATE_MS = 4500;

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function HeroSection({
  onProductSelect,
  featuredProducts,
  heroTitle,
  heroSubtitle,
  stats,
}: HeroSectionProps) {
  const count = featuredProducts.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Cycle the featured products through the fixed card slots, carousel-style,
  // without swapping the whole hero. Pauses while hovered.
  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = setInterval(
      () => setActive((current) => (current + 1) % count),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  const slotAt = (offset: number) =>
    count > 0 ? featuredProducts[(active + offset) % count] : undefined;

  const main = slotAt(0);
  const small1 = count > 1 ? slotAt(1) : undefined;
  const small2 = count > 2 ? slotAt(2) : undefined;

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient with pastel tones */}
      <div className="absolute inset-0 bg-gradient-to-br from-pastel-rose/20 via-background to-pastel-sage/15" />

      {/* Decorative blobs */}
      <div className="absolute -left-32 -top-32 size-80 rounded-full bg-pastel-lavender/15 blur-3xl" />
      <div className="absolute -bottom-24 right-0 size-72 rounded-full bg-pastel-peach/15 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 size-56 -translate-x-1/2 rounded-full bg-pastel-rose/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Left content */}
          <div className="flex flex-col justify-center space-y-6 lg:space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-pastel-rose/30 px-4 py-2 text-sm font-medium text-accent-foreground">
                <Sparkles className="size-4" />
                <span>Novidades da Semana</span>
              </div>

              <h1 className="font-sans text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl xl:text-6xl text-balance">
                {heroTitle}
              </h1>

              <p
                className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg lg:text-xl"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {heroSubtitle}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="group h-12 rounded-full px-6 text-base md:h-14 md:px-8"
                onClick={() => {
                  document
                    .getElementById("catalog")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Explorar Catálogo
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 pt-4 lg:gap-10">
              <div className="rounded-2xl bg-pastel-lavender/20 px-4 py-3">
                <p className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
                  {stats.completedOrdersCount}
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Pedidos Concluídos
                </p>
              </div>
              <div className="rounded-2xl bg-pastel-peach/20 px-4 py-3">
                <p className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
                  {stats.averageRating?.toFixed(1) ?? "-"}
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Avaliação ({stats.totalReviews})
                </p>
              </div>
              <div className="rounded-2xl bg-pastel-sage/20 px-4 py-3">
                <p className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
                  14h–5h
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Retirada Anônima
                </p>
              </div>
            </div>
          </div>

          {/* Right content - Featured product carousel (fixed card slots) */}
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Main featured product */}
            {main && (
              <button
                type="button"
                onClick={() => onProductSelect(main)}
                className="group block w-full overflow-hidden rounded-3xl bg-card text-left shadow-2xl transition-all duration-500 hover:shadow-3xl"
              >
                <div key={main.id} className="animate-in fade-in duration-700">
                  <div className="relative aspect-4/5 md:aspect-3/4 lg:aspect-square">
                    <Image
                      src={getPrimaryProductImage(main)}
                      alt={main.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  </div>

                  {/* Card footer */}
                  <div className="space-y-2 border-t border-border bg-card p-5 md:p-6">
                    <span className="inline-block rounded-full bg-pastel-rose/40 px-3 py-1 text-xs font-medium text-foreground">
                      Em destaque
                    </span>
                    <div className="flex items-end justify-between gap-3">
                      <h3 className="line-clamp-2 font-sans text-xl font-semibold text-foreground md:text-2xl">
                        {main.name}
                      </h3>
                      <p className="shrink-0 font-sans text-2xl font-bold text-foreground md:text-3xl">
                        {formatBRL(main.price)}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Floating card — top right */}
            {small1 && (
              <button
                type="button"
                onClick={() => onProductSelect(small1)}
                className="group absolute -top-5 -right-4 z-10 hidden w-28 overflow-hidden rounded-2xl bg-card text-left shadow-xl ring-1 ring-border/30 transition-transform hover:-translate-y-1 lg:block xl:-right-8 xl:w-36"
              >
                <div
                  key={small1.id}
                  className="animate-in fade-in zoom-in-95 duration-500"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={getPrimaryProductImage(small1)}
                      alt={small1.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="144px"
                    />
                  </div>
                  <div className="p-2 xl:p-3">
                    <p className="truncate text-xs font-medium text-foreground">
                      {small1.name}
                    </p>
                    <p className="font-sans text-sm font-semibold text-foreground">
                      {formatBRL(small1.price)}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Floating card — top left */}
            {small2 && (
              <button
                type="button"
                onClick={() => onProductSelect(small2)}
                className="group absolute -top-5 -left-4 z-10 hidden w-28 overflow-hidden rounded-2xl bg-card text-left shadow-xl ring-1 ring-border/30 transition-transform hover:-translate-y-1 lg:block xl:-left-8 xl:w-32"
              >
                <div
                  key={small2.id}
                  className="animate-in fade-in zoom-in-95 duration-500"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={getPrimaryProductImage(small2)}
                      alt={small2.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="128px"
                    />
                  </div>
                  <div className="p-2 xl:p-3">
                    <p className="truncate text-xs font-medium text-foreground">
                      {small2.name}
                    </p>
                    <p className="font-sans text-sm font-semibold text-foreground">
                      {formatBRL(small2.price)}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Carousel indicators */}
            {count > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {featuredProducts.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    aria-label={`Ver destaque ${index + 1}`}
                    aria-current={index === active}
                    onClick={() => setActive(index)}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      index === active
                        ? "w-6 bg-foreground"
                        : "w-2 bg-foreground/25 hover:bg-foreground/40",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
