import { Header } from "@/components/header";
import { Catalog } from "@/components/catalog";
import { Footer } from "@/components/footer";
import { StorefrontIntro } from "@/components/storefront-intro";
import { JsonLd } from "@/components/seo/json-ld";
import { getCatalogData } from "@/lib/data/catalog";
import { pageMetadata } from "@/lib/seo";
import { storeJsonLd } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "The Secret Boutique | Sex Shop em Pitangueiras com Entrega Discreta",
  absoluteTitle: true,
  description:
    "Sex shop em Pitangueiras/SP com compra sem cadastro e embalagem discreta. Retire anonimamente no JR Dallas Motel ou receba por motoboy em Pitangueiras, Viradouro e Bebedouro.",
  path: "/",
});

// Vitrine em ISR: HTML em cache na CDN, refeito a cada 5 min ou na hora em
// que o admin altera produtos/estoque (revalidatePath nas actions).
export const revalidate = 300;

export default async function Home() {
  const data = await getCatalogData();

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={storeJsonLd()} />
      <Header />
      <main>
        <Catalog
          products={data.products}
          categories={data.categories}
          featuredProducts={data.featuredProducts}
          heroTitle={data.storeSettings.heroTitle}
          heroSubtitle={data.storeSettings.heroSubtitle}
          stats={data.stats}
        />
        <StorefrontIntro categories={data.categories} />
      </main>
      <Footer />
    </div>
  );
}
