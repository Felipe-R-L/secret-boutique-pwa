import { Metadata } from "next";
import { CartContent } from "@/components/cart-content";
import { getCatalogData } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Carrinho | The Secret Boutique",
};

export default async function CartPage() {
  const data = await getCatalogData();

  return <CartContent products={data.products} />;
}
