import { Metadata } from "next";
import { CartContent } from "@/components/cart-content";
import { getCatalogData } from "@/lib/data/catalog";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: NO_INDEX,
};

// Carrinho confere preço e estoque atuais: sem cache.
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const data = await getCatalogData();

  return <CartContent products={data.products} />;
}
