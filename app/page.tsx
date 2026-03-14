import { Header } from "@/components/header";
import { Catalog } from "@/components/catalog";
import { Footer } from "@/components/footer";
import { getCatalogData } from "@/lib/data/catalog";

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
