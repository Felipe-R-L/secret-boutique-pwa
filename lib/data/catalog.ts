import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Product } from "@/lib/store/cart-store";

const DEFAULT_HERO_TITLE = "Descubra o prazer do autocuidado";
const DEFAULT_HERO_SUBTITLE =
  "Produtos premium selecionados para transformar seus momentos especiais em experiencias inesqueciveis.";

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
    rating: row.rating ?? undefined,
    reviews: row.reviews ?? undefined,
    inStock: row.in_stock ?? true,
    in_stock: row.in_stock ?? true,
    is_featured: row.is_featured ?? false,
  };
}

export async function getCatalogData() {
  const supabase = await createClient();

  const [productsResult, settingsResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,price,description,curatorship,images,image,image_url,category,specs,rating,reviews,in_stock,is_featured,created_at,updated_at",
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

  const settings = settingsResult.data as StoreSettingsRow | null;
  const featuredProducts = products
    .filter((product) => product.is_featured)
    .slice(0, 3);

  return {
    products,
    featuredProducts,
    storeSettings: {
      heroTitle: settings?.hero_title ?? DEFAULT_HERO_TITLE,
      heroSubtitle: settings?.hero_subtitle ?? DEFAULT_HERO_SUBTITLE,
    },
  };
}
