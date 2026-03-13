import { Product } from "@/lib/store/cart-store";

const PLACEHOLDER_IMAGE = "/placeholder.svg";

export function getProductImages(product: Product): string[] {
  const list = product.images?.filter(Boolean) ?? [];
  if (list.length > 0) return list;
  if (product.image) return [product.image];
  return [PLACEHOLDER_IMAGE];
}

export function getPrimaryProductImage(product: Product): string {
  return getProductImages(product)[0] ?? PLACEHOLDER_IMAGE;
}
