import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database, Json } from "@/lib/supabase/database.types";
import { isCents } from "@/lib/money";

export type PersistedVariantAttribute = {
  key: string;
  value: string;
};

export type PersistedProductVariant = {
  id: string;
  sku: string;
  label: string;
  /** Centavos. */
  price_cents: number;
  stock_quantity: number;
  in_stock: boolean;
  images: string[];
  attributes: PersistedVariantAttribute[];
  is_default: boolean;
};

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export function parsePersistedProductVariants(
  value:
    | Database["public"]["Tables"]["products"]["Row"]["variants"]
    | Json
    | null,
): PersistedProductVariant[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): PersistedProductVariant | null => {
      if (!item || typeof item !== "object") return null;

      const candidate = item as Record<string, unknown>;

      if (
        typeof candidate.id !== "string" ||
        typeof candidate.sku !== "string" ||
        typeof candidate.label !== "string" ||
        !isCents(candidate.price_cents) ||
        typeof candidate.stock_quantity !== "number" ||
        typeof candidate.in_stock !== "boolean"
      ) {
        return null;
      }

      const images = Array.isArray(candidate.images)
        ? candidate.images
            .filter((image): image is string => typeof image === "string")
            .map((image) => image.trim())
            .filter((image) => image.length > 0)
        : [];

      const attributes = Array.isArray(candidate.attributes)
        ? candidate.attributes
            .map((attribute): PersistedVariantAttribute | null => {
              if (!attribute || typeof attribute !== "object") return null;
              const entry = attribute as Record<string, unknown>;

              if (
                typeof entry.key !== "string" ||
                typeof entry.value !== "string"
              ) {
                return null;
              }

              return {
                key: entry.key.trim(),
                value: entry.value.trim(),
              };
            })
            .filter(
              (attribute): attribute is PersistedVariantAttribute =>
                attribute !== null,
            )
        : [];

      return {
        id: candidate.id,
        sku: candidate.sku,
        label: candidate.label,
        price_cents: candidate.price_cents,
        stock_quantity: candidate.stock_quantity,
        in_stock: candidate.in_stock,
        images,
        attributes,
        is_default: candidate.is_default === true,
      };
    })
    .filter((variant): variant is PersistedProductVariant => variant !== null);
}

/**
 * Applies a signed stock delta to a single product variant inside the
 * products.variants JSONB, then recomputes the variant's in_stock flag and
 * the product's aggregate stock_quantity/in_stock. Used by manual inventory
 * adjustments (saída/entrada/ajuste) that target a specific variant.
 *
 * `delta` is signed: negative for EXIT/SALE, positive for ENTRY/ADJUSTMENT.
 * Variant stock is clamped at 0 (never negative).
 */
export async function applyVariantStockDelta(
  supabase: ServiceRoleClient,
  productId: string,
  variantId: string,
  delta: number,
) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,variants")
    .eq("id", productId)
    .single();

  if (productError) {
    throw new Error(productError.message);
  }

  const persistedVariants = parsePersistedProductVariants(product?.variants);

  if (persistedVariants.length === 0) {
    throw new Error("Produto não possui variantes cadastradas.");
  }

  if (!persistedVariants.some((variant) => variant.id === variantId)) {
    throw new Error("Variante não encontrada para este produto.");
  }

  const nextVariants = persistedVariants.map((variant) => {
    if (variant.id !== variantId) return variant;

    const nextStock = Math.max(variant.stock_quantity + delta, 0);

    return {
      ...variant,
      stock_quantity: nextStock,
      // Keep the manual availability intent, but never mark in_stock when
      // there are zero units left.
      in_stock: variant.in_stock && nextStock > 0,
    };
  });

  const aggregateStock = nextVariants.reduce(
    (total, variant) => total + variant.stock_quantity,
    0,
  );

  const { error } = await supabase
    .from("products")
    .update({
      variants: nextVariants,
      stock_quantity: aggregateStock,
      in_stock: nextVariants.some(
        (variant) => variant.in_stock && variant.stock_quantity > 0,
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function decrementOrderStockByVariants(
  supabase: ServiceRoleClient,
  orderId: string,
) {
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("product_id,variant_id,quantity")
    .eq("order_id", orderId);

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  if (!orderItems || orderItems.length === 0) {
    return;
  }

  const productIds = Array.from(
    new Set(orderItems.map((item) => item.product_id)),
  );

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id,stock_quantity,in_stock,variants")
    .in("id", productIds);

  if (productsError) {
    throw new Error(productsError.message);
  }

  const itemsByProduct = new Map<string, typeof orderItems>();
  for (const item of orderItems) {
    const current = itemsByProduct.get(item.product_id) ?? [];
    current.push(item);
    itemsByProduct.set(item.product_id, current);
  }

  for (const product of products ?? []) {
    const relatedItems = itemsByProduct.get(product.id) ?? [];
    const persistedVariants = parsePersistedProductVariants(product.variants);

    if (persistedVariants.length > 0) {
      const nextVariants = persistedVariants.map((variant) => {
        const reservedQuantity = relatedItems
          .filter((item) => item.variant_id === variant.id)
          .reduce((total, item) => total + item.quantity, 0);

        const nextStock = Math.max(
          variant.stock_quantity - reservedQuantity,
          0,
        );

        return {
          ...variant,
          stock_quantity: nextStock,
          in_stock: variant.in_stock && nextStock > 0,
        };
      });

      const aggregateStock = nextVariants.reduce(
        (total, variant) => total + variant.stock_quantity,
        0,
      );

      const { error } = await supabase
        .from("products")
        .update({
          variants: nextVariants,
          stock_quantity: aggregateStock,
          in_stock: nextVariants.some(
            (variant) => variant.in_stock && variant.stock_quantity > 0,
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) {
        throw new Error(error.message);
      }

      continue;
    }

    const soldQuantity = relatedItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const nextStock = Math.max((product.stock_quantity ?? 0) - soldQuantity, 0);

    const { error } = await supabase
      .from("products")
      .update({
        stock_quantity: nextStock,
        in_stock: nextStock > 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
