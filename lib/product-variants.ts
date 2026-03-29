import {
  Product,
  ProductVariant,
  ProductVariantAttribute,
} from "@/lib/store/cart-store";

export function getProductVariants(product: Product): ProductVariant[] {
  return product.variants ?? [];
}

export function hasProductVariants(product: Product): boolean {
  return getProductVariants(product).length > 0;
}

export function getProductVariant(
  product: Product,
  variantId?: string | null,
): ProductVariant | undefined {
  if (!variantId) return undefined;

  return getProductVariants(product).find(
    (variant) => variant.id === variantId,
  );
}

export function getDefaultProductVariant(
  product: Product,
): ProductVariant | undefined {
  const variants = getProductVariants(product);

  return (
    variants.find((variant) => variant.is_default) ??
    variants.find(
      (variant) => variant.in_stock && variant.stock_quantity > 0,
    ) ??
    variants[0]
  );
}

export function getEffectiveProductPrice(
  product: Product,
  variantId?: string | null,
): number {
  return getProductVariant(product, variantId)?.price ?? product.price;
}

export function isVariantAvailable(variant: ProductVariant): boolean {
  return variant.in_stock && variant.stock_quantity > 0;
}

export function isProductAvailable(
  product: Product,
  variantId?: string | null,
): boolean {
  const variant = getProductVariant(product, variantId);

  if (variant) {
    return isVariantAvailable(variant);
  }

  if (hasProductVariants(product)) {
    return getProductVariants(product).some(isVariantAvailable);
  }

  return product.inStock ?? product.in_stock ?? true;
}

export function getProductPriceRange(product: Product): {
  min: number;
  max: number;
} {
  const variants = getProductVariants(product);

  if (variants.length === 0) {
    return { min: product.price, max: product.price };
  }

  const prices = variants.map((variant) => variant.price);

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function formatVariantAttributes(
  attributes: ProductVariantAttribute[] = [],
): string {
  return attributes
    .filter((attribute) => attribute.key.trim() && attribute.value.trim())
    .map((attribute) => `${attribute.key}: ${attribute.value}`)
    .join(" • ");
}

export function getVariantDisplayLabel(variant: ProductVariant): string {
  const attributeLabel = formatVariantAttributes(variant.attributes);

  if (variant.label.trim()) {
    return variant.label.trim();
  }

  if (attributeLabel) {
    return attributeLabel;
  }

  return variant.sku.trim() || "Variante";
}
