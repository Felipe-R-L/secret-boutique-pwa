"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/auth/admin";
import { productMutationSchema } from "@/lib/schemas";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function toUniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
}

const deleteProductSchema = z
  .object({
    productId: z.string().uuid(),
  })
  .strict();

export async function upsertProduct(input: unknown) {
  await requireAdminContext({ write: true });

  const parsed = productMutationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.flatten().formErrors.join(", ") ||
        "Invalid product payload",
    };
  }

  const specsJson = parsed.data.specs.reduce<Record<string, string>>(
    (acc, item) => {
      acc[item.key] = item.value;
      return acc;
    },
    {},
  );

  const normalizedVariants = parsed.data.variants.map((variant) => ({
    id: variant.id?.trim() || crypto.randomUUID(),
    sku: variant.sku.trim(),
    label: variant.label.trim(),
    price: Number(variant.price),
    stock_quantity: variant.stockQuantity,
    in_stock: variant.inStock && variant.stockQuantity > 0,
    images: toUniqueStrings(variant.images),
    attributes: variant.attributes.map((attribute) => ({
      key: attribute.key.trim(),
      value: attribute.value.trim(),
    })),
    is_default: variant.isDefault,
  }));

  const hasVariants = normalizedVariants.length > 0;
  const aggregateImages = toUniqueStrings([
    ...(parsed.data.imageUrls ?? []),
    ...normalizedVariants.flatMap((variant) => variant.images),
  ]);
  const aggregatePrice = hasVariants
    ? Math.min(...normalizedVariants.map((variant) => variant.price))
    : parsed.data.price;
  const aggregateStockQuantity = hasVariants
    ? normalizedVariants.reduce(
        (total, variant) => total + variant.stock_quantity,
        0,
      )
    : undefined;
  const aggregateInStock = hasVariants
    ? normalizedVariants.some((variant) => variant.in_stock)
    : parsed.data.inStock;

  const supabase = createServiceRoleClient();

  const productPayload = {
    name: parsed.data.name,
    price: aggregatePrice,
    description: parsed.data.description,
    curatorship: parsed.data.curatorship?.trim() || null,
    category: parsed.data.category,
    is_featured: parsed.data.isFeatured,
    in_stock: aggregateInStock,
    specs: specsJson,
    images: aggregateImages,
    image_url:
      (aggregateImages.length > 0
        ? aggregateImages[0]
        : parsed.data.imageUrl) ?? null,
    variants: normalizedVariants,
    ...(typeof aggregateStockQuantity === "number"
      ? { stock_quantity: aggregateStockQuantity }
      : {}),
    updated_at: new Date().toISOString(),
  };

  const mutation = parsed.data.productId
    ? supabase
        .from("products")
        .update(productPayload)
        .eq("id", parsed.data.productId)
    : supabase.from("products").insert(productPayload);

  const { error } = await mutation;

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteProduct(input: unknown) {
  await requireAdminContext({ write: true });

  const parsed = deleteProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten().formErrors.join(", ") || "Invalid payload",
    };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", parsed.data.productId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true as const };
}
