"use client";

import { Product } from "@/lib/store/cart-store";
import {
  formatVariantAttributes,
  getProductVariants,
  getVariantDisplayLabel,
} from "@/lib/product-variants";
import { cn } from "@/lib/utils";

interface ProductVariantPickerProps {
  product: Product;
  selectedVariantId?: string | null;
  onSelect: (variantId: string | null) => void;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

export function ProductVariantPicker({
  product,
  selectedVariantId,
  onSelect,
}: ProductVariantPickerProps) {
  const variants = getProductVariants(product);

  if (variants.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Escolha sua versão</p>
          <p className="text-xs text-muted-foreground">
            Cada variante tem preço, estoque e galeria próprios.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            selectedVariantId == null
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          )}
        >
          Ver todas as fotos
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedVariantId;
          const detailText = formatVariantAttributes(variant.attributes);
          const isAvailable = variant.in_stock && variant.stock_quantity > 0;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition-all",
                isSelected
                  ? "border-foreground bg-foreground text-background shadow-lg shadow-foreground/10"
                  : "border-border bg-background hover:border-foreground/20 hover:bg-muted/60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {getVariantDisplayLabel(variant)}
                  </p>
                  {detailText && (
                    <p
                      className={cn(
                        "mt-1 text-xs leading-relaxed",
                        isSelected ? "text-background/75" : "text-muted-foreground",
                      )}
                    >
                      {detailText}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs font-medium",
                    isSelected ? "text-background/85" : "text-muted-foreground",
                  )}
                >
                  {variant.stock_quantity} un.
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                  {formatPrice(variant.price)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    isAvailable
                      ? isSelected
                        ? "bg-background/15 text-background"
                        : "bg-pastel-sage/30 text-foreground"
                      : isSelected
                        ? "bg-background/10 text-background/75"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isAvailable ? "Disponível" : "Sem estoque"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}