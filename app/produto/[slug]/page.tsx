import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Star } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AnonymousReviews } from "@/components/anonymous-reviews";
import { ProductCuratorship } from "@/components/product-curatorship";
import { ProductLinkGrid } from "@/components/product-link-card";
import { ProductPurchase } from "@/components/product-page/product-purchase";
import { DeliverySummary } from "@/components/storefront/delivery-summary";
import { PageBreadcrumb } from "@/components/storefront/page-breadcrumb";
import { JsonLd } from "@/components/seo/json-ld";
import { getProductBySlug } from "@/lib/data/catalog";
import { formatCents } from "@/lib/money";
import { getPrimaryProductImage } from "@/lib/product-images";
import { pageMetadata } from "@/lib/seo";
import { categoryPath, productPath } from "@/lib/storefront-paths";
import { productJsonLd } from "@/lib/structured-data";

type Params = { params: Promise<{ slug: string }> };

// Páginas geradas sob demanda e guardadas em cache (ISR).
export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result) return { title: "Produto não encontrado" };

  const { product } = result;
  const lead = product.description
    ? truncate(product.description, 110)
    : `${product.category} na The Secret Boutique.`;
  const image = getPrimaryProductImage(product);

  return pageMetadata({
    title: product.name,
    description: `${formatCents(product.price_cents)}. ${lead} Compra sem cadastro e embalagem discreta.`,
    path: productPath(product) ?? "/",
    images: image.startsWith("http") ? [image] : undefined,
  });
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result) notFound();

  const { product, data } = result;
  const path = productPath(product) ?? "/";
  const related = data.products
    .filter(
      (item) => item.id !== product.id && item.category === product.category,
    )
    .slice(0, 4);
  const specs = product.specs ? Object.entries(product.specs) : [];
  const hasRating =
    typeof product.rating === "number" && (product.reviews ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={productJsonLd(product)} />
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <PageBreadcrumb
          crumbs={[
            { name: "Loja", path: "/" },
            ...(product.category
              ? [
                  {
                    name: product.category,
                    path: categoryPath(product.category),
                  },
                ]
              : []),
            { name: product.name, path },
          ]}
        />

        <ProductPurchase product={product} />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          <div className="space-y-8" style={{ fontFamily: "Inter, sans-serif" }}>
            {hasRating && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <strong>{product.rating!.toFixed(1)}</strong> de 5 ·{" "}
                {product.reviews} avaliações anônimas
              </p>
            )}

            {product.description && (
              <section aria-labelledby="descricao">
                <h2
                  id="descricao"
                  className="mb-3 font-sans text-xl font-semibold text-foreground"
                >
                  Descrição
                </h2>
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              </section>
            )}

            {specs.length > 0 && (
              <section aria-labelledby="especificacoes">
                <h2
                  id="especificacoes"
                  className="mb-3 font-sans text-xl font-semibold text-foreground"
                >
                  Especificações
                </h2>
                <dl className="space-y-2">
                  {specs.map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                      <div>
                        <dt className="inline font-medium capitalize text-foreground">
                          {key.replace(/_/g, " ")}:
                        </dt>{" "}
                        <dd className="inline text-muted-foreground">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <ProductCuratorship curatorship={product.curatorship} />

            <section aria-labelledby="avaliacoes">
              <h2
                id="avaliacoes"
                className="mb-3 font-sans text-xl font-semibold text-foreground"
              >
                Avaliações
              </h2>
              <AnonymousReviews productId={product.id} />
            </section>
          </div>

          <aside>
            <DeliverySummary />
          </aside>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="relacionados" className="mt-14">
            <h2
              id="relacionados"
              className="mb-5 font-sans text-2xl font-semibold text-foreground"
            >
              Mais em {product.category}
            </h2>
            <ProductLinkGrid products={related} />
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
