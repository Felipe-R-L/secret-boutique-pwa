import { Metadata } from "next";
import { Header } from "@/components/header";
import { Catalog } from "@/components/catalog";
import { Footer } from "@/components/footer";
import { getCatalogData } from "@/lib/data/catalog";
export const metadata: Metadata = {
  title: "The Secret Boutique | Bem-estar Sexual em Pitangueiras",
  description:
    "Explore nossa seleção premium de produtos de beleza e autocuidado íntimo. Compre online com total privacidade e retire de forma anônima no JR Dallas Motel em Pitangueiras, SP.",
};

export default async function Home() {
  const data = await getCatalogData();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Catalog
          products={data.products}
          featuredProducts={data.featuredProducts}
          heroTitle={data.storeSettings.heroTitle}
          heroSubtitle={data.storeSettings.heroSubtitle}
          stats={data.stats}
        />
      </main>
      <Footer />
    </div>
  );
}
