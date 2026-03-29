import {
  ProductsAdminPanel,
  type AdminProductCard,
} from "@/components/admin/products-admin-panel";
import { requireAdminContext } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

function parseVariantAttributes(value: unknown): Array<{ key: string; value: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;

      if (typeof candidate.key !== "string" || typeof candidate.value !== "string") {
        return null;
      }

      return { key: candidate.key, value: candidate.value };
    })
    .filter((item): item is { key: string; value: string } => item !== null);
}

function parseVariants(value: Json | null): AdminProductCard["variants"] {
  if (!Array.isArray(value)) return [];

  const parsedVariants = value.map(
    (item): AdminProductCard["variants"][number] | null => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;

      if (
        typeof candidate.id !== "string" ||
        typeof candidate.sku !== "string" ||
        typeof candidate.label !== "string" ||
        typeof candidate.price !== "number" ||
        typeof candidate.stock_quantity !== "number" ||
        typeof candidate.in_stock !== "boolean"
      ) {
        return null;
      }

      return {
        id: candidate.id,
        sku: candidate.sku,
        label: candidate.label,
        price: candidate.price,
        stockQuantity: candidate.stock_quantity,
        inStock: candidate.in_stock,
        isDefault: candidate.is_default === true,
        images: parseImageUrls((candidate.images as Json | null) ?? null),
        attributes: parseVariantAttributes(candidate.attributes),
      };
    },
  );

  return parsedVariants.filter(
    (item): item is AdminProductCard["variants"][number] => item !== null,
  );
}

function parseSpecs(specs: Json | null): Array<{ key: string; value: string }> {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return [];
  }

  return Object.entries(specs as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([key, value]) => ({ key, value }));
}

function parseCategories(value: Json | null): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function parseImageUrls(value: Json | null): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default async function AdminProductsPage() {
  await requireAdminContext();

  const supabase = await createClient();

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id,name,price,description,curatorship,category,in_stock,stock_quantity,is_featured,images,image_url,specs,variants,created_at",
    )
    .order("created_at", { ascending: false });

  const { data: settings, error: settingsError } = await supabase
    .from("store_settings")
    .select("categories")
    .eq("id", 1)
    .maybeSingle();

  const fallbackCategories = Array.from(
    new Set(
      (products ?? []).map((product) => product.category).filter(Boolean),
    ),
  );

  const categories = [
    ...new Set([
      ...parseCategories(settings?.categories ?? null),
      ...fallbackCategories,
    ]),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const mappedProducts: AdminProductCard[] = (products ?? []).map(
    (product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      description: product.description ?? "",
      curatorship: product.curatorship ?? "",
      category: product.category,
      inStock: product.in_stock ?? true,
      isFeatured: product.is_featured ?? false,
      stockQuantity: product.stock_quantity ?? 0,
      imageUrl: product.image_url ?? undefined,
      imageUrls: parseImageUrls(product.images),
      specs: parseSpecs(product.specs),
      variants: parseVariants(product.variants),
    }),
  );

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Produtos</h2>
        <p className="text-sm text-muted-foreground">
          Cards visuais com edicao em modal e gestao de categorias.
        </p>
      </div>

      {productsError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Nao foi possivel carregar produtos: {productsError.message}
        </p>
      )}

      {settingsError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Nao foi possivel carregar configuracoes da loja:{" "}
          {settingsError.message}
        </p>
      )}

      <ProductsAdminPanel products={mappedProducts} categories={categories} />
    </section>
  );
}
