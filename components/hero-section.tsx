"use client";

import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/store/cart-store";
import { getPrimaryProductImage } from "@/lib/product-images";

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

export function HeroSection({
  onProductSelect,
  featuredProducts,
  heroTitle,
  heroSubtitle,
  stats,
}: HeroSectionProps) {
  const heroProduct = featuredProducts[0];

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

          {/* Right content - Featured product showcase */}
          <div className="relative">
            {/* Main featured product */}
            {heroProduct && (
              <div
                onClick={() => onProductSelect(heroProduct)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl bg-card shadow-2xl transition-all duration-500 hover:shadow-3xl"
              >
                <div className="relative aspect-4/5 md:aspect-3/4 lg:aspect-square">
                  <Image
                    src={getPrimaryProductImage(heroProduct)}
                    alt={heroProduct.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <span className="mb-2 inline-block rounded-full bg-pastel-rose/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                    Em destaque
                  </span>
                  <h3 className="font-sans text-xl font-semibold text-background md:text-2xl lg:text-3xl">
                    {heroProduct.name}
                  </h3>
                  <p className="mt-1 font-sans text-2xl font-bold text-background md:text-3xl">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(heroProduct.price)}
                  </p>
                </div>
              </div>
            )}

            {/* Floating product cards */}
            <div className="absolute -bottom-4 -left-4 hidden w-32 overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-border/30 lg:block xl:-left-8 xl:w-40">
              {featuredProducts[1] && (
                <div
                  onClick={() => onProductSelect(featuredProducts[1])}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={getPrimaryProductImage(featuredProducts[1])}
                      alt={featuredProducts[1].name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="160px"
                    />
                  </div>
                  <div className="p-2 xl:p-3">
                    <p className="truncate text-xs font-medium text-foreground">
                      {featuredProducts[1].name}
                    </p>
                    <p className="font-sans text-sm font-semibold text-foreground">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(featuredProducts[1].price)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute -right-4 -top-4 hidden w-28 overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-border/30 lg:block xl:-right-8 xl:w-36">
              {featuredProducts[2] && (
                <div
                  onClick={() => onProductSelect(featuredProducts[2])}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={getPrimaryProductImage(featuredProducts[2])}
                      alt={featuredProducts[2].name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="144px"
                    />
                  </div>
                  <div className="p-2 xl:p-3">
                    <p className="truncate text-xs font-medium text-foreground">
                      {featuredProducts[2].name}
                    </p>
                    <p className="font-sans text-sm font-semibold text-foreground">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(featuredProducts[2].price)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
