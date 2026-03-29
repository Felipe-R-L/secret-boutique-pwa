import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  Product,
  ProductVariant,
  ProductVariantAttribute,
} from "@/lib/store/cart-store";

const DEFAULT_HERO_TITLE = "Descubra o prazer do autocuidado";
const DEFAULT_HERO_SUBTITLE =
  "Produtos premium selecionados para transformar seus momentos especiais em experiências inesquecíveis.";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

type StoreSettingsRow = Database["public"]["Tables"]["store_settings"]["Row"];

function parseProductImageUrls(
  images: Database["public"]["Tables"]["products"]["Row"]["images"],
): string[] {
  if (!Array.isArray(images)) return [];

  return images
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseVariantAttributes(value: unknown): ProductVariantAttribute[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const candidate = item as Record<string, unknown>;
      if (typeof candidate.key !== "string" || typeof candidate.value !== "string") {
        return null;
      }

      return {
        key: candidate.key.trim(),
        value: candidate.value.trim(),
      };
    })
    .filter((item): item is ProductVariantAttribute => Boolean(item));
}

function parseProductVariants(
  variants: Database["public"]["Tables"]["products"]["Row"]["variants"],
): ProductVariant[] {
  if (!Array.isArray(variants)) return [];

  const parsedVariants = variants.map((item): ProductVariant | null => {
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
        stock_quantity: candidate.stock_quantity,
        in_stock: candidate.in_stock,
        images: parseProductImageUrls((candidate.images as Database["public"]["Tables"]["products"]["Row"]["images"]) ?? null),
        attributes: parseVariantAttributes(candidate.attributes),
        is_default: candidate.is_default === true,
      } satisfies ProductVariant;
    });

  return parsedVariants.filter(
    (item): item is ProductVariant => item !== null,
  );
}

function mapProduct(row: ProductRow): Product {
  const specs =
    row.specs && typeof row.specs === "object"
      ? (row.specs as Record<string, string>)
      : undefined;

  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    description: row.description ?? "",
    curatorship: row.curatorship,
    image: row.image ?? undefined,
    images: parseProductImageUrls(row.images),
    image_url: row.image_url,
    category: row.category,
    specs,
    rating: undefined,
    reviews: undefined,
    inStock: row.in_stock ?? true,
    in_stock: row.in_stock ?? true,
    is_featured: row.is_featured ?? false,
    stock_quantity: row.stock_quantity ?? 0,
    variants: parseProductVariants(row.variants),
  };
}

export async function getCatalogData() {
  const supabase = await createClient();

  const [productsResult, settingsResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,price,description,curatorship,images,image,image_url,category,specs,rating,reviews,in_stock,stock_quantity,is_featured,variants,created_at,updated_at",
      )
      .eq("in_stock", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("store_settings")
      .select("id,hero_title,hero_subtitle")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const products = (productsResult.data ?? []).map(mapProduct);

  const productIds = products.map((product) => product.id);

  const [reviewsResult, completedOrdersResult] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from("reviews")
          .select("product_id,rating")
          .in("product_id", productIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "COMPLETED"),
  ]);

  const reviewRows = reviewsResult.data ?? [];
  const reviewSummaryByProduct = new Map<
    string,
    { sum: number; count: number }
  >();

  for (const review of reviewRows) {
    const current = reviewSummaryByProduct.get(review.product_id) ?? {
      sum: 0,
      count: 0,
    };
    current.sum += Number(review.rating);
    current.count += 1;
    reviewSummaryByProduct.set(review.product_id, current);
  }

  const productsWithMetrics = products.map((product) => {
    const summary = reviewSummaryByProduct.get(product.id);
    if (!summary || summary.count === 0) return product;

    return {
      ...product,
      rating: Number((summary.sum / summary.count).toFixed(1)),
      reviews: summary.count,
    };
  });

  const globalReviewCount = reviewRows.length;
  const globalAverageRating =
    globalReviewCount > 0
      ? Number(
          (
            reviewRows.reduce((acc, item) => acc + Number(item.rating), 0) /
            globalReviewCount
          ).toFixed(1),
        )
      : null;

  const settings = settingsResult.data as StoreSettingsRow | null;
  const featuredProducts = productsWithMetrics
    .filter((product) => product.is_featured)
    .slice(0, 3);

  return {
    products: productsWithMetrics,
    featuredProducts,
    stats: {
      completedOrdersCount: completedOrdersResult.count ?? 0,
      averageRating: globalAverageRating,
      totalReviews: globalReviewCount,
    },
    storeSettings: {
      heroTitle: settings?.hero_title ?? DEFAULT_HERO_TITLE,
      heroSubtitle: settings?.hero_subtitle ?? DEFAULT_HERO_SUBTITLE,
    },
  };
}
