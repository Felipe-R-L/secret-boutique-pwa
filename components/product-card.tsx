"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore, Product } from "@/lib/store/cart-store";
import { getProductImages, getPrimaryProductImage } from "@/lib/product-images";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const images = getProductImages(product);
  const hasSecondImage = images.length > 1;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);

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
                {product.name}
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
            <Button
              size="sm"
              className="h-9 flex-1 rounded-full text-xs"
              asChild
            >
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
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <article
      onClick={() => onSelect(product)}
      className="group cursor-pointer overflow-hidden rounded-3xl bg-card ring-1 ring-border/50 transition-all duration-300 hover:ring-primary/20 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {/* Primary image */}
        <Image
          src={getPrimaryProductImage(product)}
          alt={product.name}
          fill
          className={`object-cover transition-all duration-700 ${hasSecondImage ? "group-hover:opacity-0 group-hover:scale-105" : "group-hover:scale-105"}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Secondary image (shown on hover) */}
        {hasSecondImage && (
          <Image
            src={images[1]}
            alt={`${product.name} - vista alternativa`}
            fill
            className="object-cover opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* In stock badge */}
        {product.inStock && (
          <div className="absolute left-3 top-3 rounded-full bg-pastel-sage/90 px-2.5 py-1 text-[10px] font-medium text-secondary-foreground backdrop-blur-sm">
            Em estoque
          </div>
        )}

        {/* Rating chip */}
        {typeof product.rating === "number" && (product.reviews ?? 0) > 0 && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="font-medium">{product.rating.toFixed(1)}</span>
            <span className="text-white/75">({product.reviews})</span>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border/50 p-3 text-center sm:p-4 sm:text-left">
        <h3
          className="line-clamp-2 text-sm font-medium leading-snug text-foreground sm:text-base"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {product.name}
        </h3>

        <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-muted/60 p-2 sm:flex-row sm:justify-between sm:gap-3 sm:p-2.5">
          <span className="font-sans text-sm font-semibold text-foreground sm:text-base">
            {formatPrice(product.price)}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddToCart}
            className="h-8 w-full sm:w-auto gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground cursor-pointer hover:bg-primary/90"
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            <ShoppingBag className="size-3.5 shrink-0" />
            <span className="truncate">Adicionar</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
