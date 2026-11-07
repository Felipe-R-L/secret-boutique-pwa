import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductLinkGrid } from "@/components/product-link-card";
import { PageBreadcrumb } from "@/components/storefront/page-breadcrumb";
import { getCatalogData } from "@/lib/data/catalog";
import { DELIVERY_AREA_LABEL } from "@/lib/delivery-zones";
import { pageMetadata } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import { categoryPath } from "@/lib/storefront-paths";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

async function findCategory(slug: string) {
  const data = await getCatalogData();
  const category = data.categories.find((item) => slugify(item) === slug);
  if (!category) return null;
  const products = data.products.filter(
    (product) => product.category.trim() === category,
  );
  return { category, products, categories: data.categories };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const result = await findCategory(slug);
  if (!result) return { title: "Categoria não encontrada" };

  const { category, products } = result;
  return pageMetadata({
    title: `${category} em Pitangueiras`,
    description: `${products.length} ${products.length === 1 ? "opção" : "opções"} de ${category.toLowerCase()} com compra sem cadastro e embalagem discreta. Retirada anônima ou entrega em ${DELIVERY_AREA_LABEL}.`,
    path: categoryPath(category),
  });
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const result = await findCategory(slug);
  // Categoria sem produto em estoque não vira página vazia indexável.
  if (!result || result.products.length === 0) notFound();

  const { category, products, categories } = result;
  const otherCategories = categories.filter((item) => item !== category);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <PageBreadcrumb
          crumbs={[
            { name: "Loja", path: "/" },
            { name: category, path: categoryPath(category) },
          ]}
        />

        <header className="mb-8 space-y-3" style={{ fontFamily: "Inter, sans-serif" }}>
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {category}
          </h1>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            {products.length} {products.length === 1 ? "produto" : "produtos"}{" "}
            em {category.toLowerCase()}, escolhidos pela curadoria da loja.
            Compre sem cadastro, retire de forma anônima no JR Dallas Motel ou
            receba em casa por motoboy em {DELIVERY_AREA_LABEL}.
          </p>
        </header>

        <ProductLinkGrid products={products} />

        {otherCategories.length > 0 && (
          <nav aria-labelledby="outras-categorias" className="mt-14">
            <h2
              id="outras-categorias"
              className="mb-4 font-sans text-xl font-semibold text-foreground"
            >
              Outras categorias
            </h2>
            <ul className="flex flex-wrap gap-2" style={{ fontFamily: "Inter, sans-serif" }}>
              {otherCategories.map((item) => (
                <li key={item}>
                  <Link
                    href={categoryPath(item)}
                    className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:bg-accent/40"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>

      <Footer />
    </div>
  );
}
