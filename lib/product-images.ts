import { Product } from "@/lib/store/cart-store";

const PLACEHOLDER_IMAGE = "/placeholder.svg";

export function getProductImages(product: Product): string[] {
  const sources = [
    ...(product.images ?? []),
    product.image_url ?? "",
    product.image ?? "",
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const unique = Array.from(new Set(sources));
  if (unique.length > 0) return unique;

  return [PLACEHOLDER_IMAGE];
}

export function getPrimaryProductImage(product: Product): string {
  return getProductImages(product)[0] ?? PLACEHOLDER_IMAGE;
}
