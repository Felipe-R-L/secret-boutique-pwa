"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/auth/admin";
import { productMutationSchema } from "@/lib/schemas";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

  const supabase = createServiceRoleClient();

  const productPayload = {
    name: parsed.data.name,
    price: parsed.data.price,
    description: parsed.data.description,
    curatorship: parsed.data.curatorship?.trim() || null,
    category: parsed.data.category,
    is_featured: parsed.data.isFeatured,
    in_stock: parsed.data.inStock,
    specs: specsJson,
    images: parsed.data.imageUrls ?? [],
    image_url:
      (parsed.data.imageUrls && parsed.data.imageUrls.length > 0
        ? parsed.data.imageUrls[0]
        : parsed.data.imageUrl) ?? null,
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
