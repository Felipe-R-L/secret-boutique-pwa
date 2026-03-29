import { Product } from "@/lib/store/cart-store";
import { getProductVariant } from "@/lib/product-variants";

const PLACEHOLDER_IMAGE = "/placeholder.svg";

function normalizeImageList(values: Array<string | undefined | null>): string[] {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function getProductImages(
  product: Product,
  variantId?: string | null,
): string[] {
  const selectedVariant = getProductVariant(product, variantId);
  const variantImages = selectedVariant?.images ?? [];

  const sources =
    variantImages.length > 0
      ? normalizeImageList(variantImages)
      : normalizeImageList([
          ...(product.images ?? []),
          ...((product.variants ?? []).flatMap((variant) => variant.images ?? [])),
          product.image_url ?? "",
          product.image ?? "",
        ]);

  const unique = Array.from(new Set(sources));
  if (unique.length > 0) return unique;

  return [PLACEHOLDER_IMAGE];
}

export function getPrimaryProductImage(
  product: Product,
  variantId?: string | null,
): string {
  return getProductImages(product, variantId)[0] ?? PLACEHOLDER_IMAGE;
}

export function getSecondaryProductImage(
  product: Product,
  variantId?: string | null,
): string | undefined {
  return getProductImages(product, variantId)[1];
}
