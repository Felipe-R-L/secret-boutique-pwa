"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdultContentBlur } from "@/components/adult-content-blur";
import { ProductVariantPicker } from "@/components/product-variant-picker";
import { showAddedToCartToast } from "@/components/cart-toast";
import { trackEvent } from "@/lib/analytics/client";
import { formatCents } from "@/lib/money";
import { getProductImages } from "@/lib/product-images";
import {
  getEffectiveProductPriceCents,
  getProductVariant,
  hasProductVariants,
  isProductAvailable,
} from "@/lib/product-variants";
import { useCartStore, type Product } from "@/lib/store/cart-store";
import { cn } from "@/lib/utils";

// Galeria + compra da página de produto. O título, a descrição e os dados
// estruturados ficam no servidor; aqui só o que depende de interação.
export function ProductGallery({
  product,
  variantId,
}: {
  product: Product;
  variantId: string | null;
}) {
  const images = getProductImages(product, variantId);
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];

  useEffect(() => setActive(0), [variantId]);

  return (
    <div className="space-y-3">
      <AdultContentBlur
        isAdult={product.is_adult ?? true}
        className="aspect-square overflow-hidden rounded-3xl bg-muted"
      >
        <div className="relative aspect-square w-full">
          <Image
            src={current}
            alt={product.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </AdultContentBlur>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver imagem ${index + 1} de ${product.name}`}
              aria-current={index === active || undefined}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl ring-2 transition-all",
                index === active ? "ring-foreground/60" : "ring-transparent",
              )}
            >
              <AdultContentBlur
                isAdult={product.is_adult ?? true}
                compact
                className="h-full w-full"
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </AdultContentBlur>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductPurchase({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("product_view", {
      productId: product.id,
      valueCents: product.price_cents,
    });
  }, [product.id, product.price_cents]);

  const productHasVariants = hasProductVariants(product);
  const variant = getProductVariant(product, variantId);
  const priceCents = getEffectiveProductPriceCents(product, variantId);
  const inStock = isProductAvailable(product, variantId);
  const disabled = !inStock || (productHasVariants && !variant);

  const handleAdd = () => {
    if (disabled) return;
    for (let i = 0; i < quantity; i++) addItem(product, variant);
    showAddedToCartToast(product.name);
    setQuantity(1);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <ProductGallery product={product} variantId={variantId} />

      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="font-sans text-3xl font-semibold leading-tight text-foreground md:text-4xl">
            {product.name}
          </h1>
          <p className="font-sans text-3xl font-bold text-foreground">
            {productHasVariants && !variant && (
              <span
                className="mr-1.5 text-sm font-normal text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                a partir de
              </span>
            )}
            {formatCents(priceCents)}
          </p>
          <p
            className={cn(
              "text-sm font-medium",
              inStock ? "text-green-700" : "text-muted-foreground",
            )}
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {inStock ? "Em estoque" : "Indisponível no momento"}
          </p>
        </div>

        {productHasVariants && (
          <ProductVariantPicker
            product={product}
            selectedVariantId={variantId}
            onSelect={setVariantId}
          />
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              Quantidade
            </span>
            <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="size-11 rounded-full"
                aria-label="Diminuir quantidade"
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center font-medium" aria-live="polite">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                className="size-11 rounded-full"
                aria-label="Aumentar quantidade"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <Button
            size="lg"
            className="h-14 w-full rounded-full text-base font-semibold"
            onClick={handleAdd}
            disabled={disabled}
          >
            <ShoppingBag className="mr-2 size-5" />
            {productHasVariants && !variant
              ? "Escolha uma versão"
              : inStock
                ? `Adicionar ao carrinho · ${formatCents(priceCents * quantity)}`
                : "Sem estoque"}
          </Button>
        </div>
      </div>
    </div>
  );
}
