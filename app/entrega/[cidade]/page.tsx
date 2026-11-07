import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike, CreditCard, KeyRound, MapPin, Package } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductLinkGrid } from "@/components/product-link-card";
import { PageBreadcrumb } from "@/components/storefront/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { getCatalogData } from "@/lib/data/catalog";
import {
  DELIVERY_ZONES,
  MIN_HOME_DELIVERY_SUBTOTAL_CENTS,
  type DeliveryZone,
} from "@/lib/delivery-zones";
import { formatCents } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";
import { PICKUP_PLACE_NAME, STORE_HOURS_LABEL } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { cityPath } from "@/lib/storefront-paths";

type Params = { params: Promise<{ cidade: string }> };

export const revalidate = 300;
export const dynamicParams = false;
export function generateStaticParams() {
  return DELIVERY_ZONES.map((zone) => ({ cidade: slugify(zone.city) }));
}

function findZone(slug: string): DeliveryZone | undefined {
  return DELIVERY_ZONES.find((zone) => slugify(zone.city) === slug);
}

// "14700000" → "14700-000"
function formatCep(value: number) {
  const digits = String(value).padStart(8, "0");
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function shippingSentence(zone: DeliveryZone) {
  const fee = `Frete de ${formatCents(zone.feeCents)}`;
  return zone.freeShippingFromCents !== undefined
    ? `${fee}, grátis em pedidos a partir de ${formatCents(zone.freeShippingFromCents)}`
    : fee;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { cidade } = await params;
  const zone = findZone(cidade);
  if (!zone) return {};

  return pageMetadata({
    title: `Sex Shop em ${zone.city} com Entrega Discreta`,
    description: `Sex shop com entrega por motoboy em ${zone.city}/${zone.state}. ${shippingSentence(zone)}. Compra sem cadastro e embalagem neutra, sem identificação.`,
    path: cityPath(zone.city),
  });
}

export default async function CityDeliveryPage({ params }: Params) {
  const { cidade } = await params;
  const zone = findZone(cidade);
  if (!zone) notFound();

  const { featuredProducts, products } = await getCatalogData();
  const highlights = (featuredProducts.length ? featuredProducts : products).slice(0, 8);
  const isPickupCity = zone.city === "Pitangueiras";
  const otherZones = DELIVERY_ZONES.filter((item) => item.city !== zone.city);
  const path = cityPath(zone.city);

  const faq = [
    {
      q: `Quanto custa a entrega em ${zone.city}?`,
      a: `${shippingSentence(zone)}. O pedido mínimo para entrega é de ${formatCents(MIN_HOME_DELIVERY_SUBTOTAL_CENTS)} em produtos. O valor exato aparece no checkout assim que você informa o CEP.`,
    },
    {
      q: "Quais CEPs são atendidos?",
      a: `Entregamos em ${zone.city} nos CEPs de ${formatCep(zone.cepStart)} a ${formatCep(zone.cepEnd)}. Se o seu CEP estiver fora dessa faixa, o checkout avisa antes de você pagar.`,
    },
    {
      q: "Como é feito o pagamento na entrega em casa?",
      a: "Para entrega por motoboy o pagamento é via Pix, na hora do pedido. Pedimos nome e email só para o comprovante; o CPF exigido para o Pix vai direto para o processador de pagamento, sem ficar guardado conosco.",
    },
    {
      q: "A embalagem identifica a loja?",
      a: "Não. Tudo sai em embalagem neutra, sem logotipo, nome da loja ou descrição do conteúdo. O motoboy não sabe o que está entregando.",
    },
    ...(isPickupCity
      ? [
          {
            q: "Posso retirar em vez de receber em casa?",
            a: `Pode. A retirada é anônima no ${PICKUP_PLACE_NAME}, ${STORE_HOURS_LABEL}: você apresenta só o código do pedido, sem documento. Hóspedes recebem no quarto e podem pagar no cartão ou em dinheiro na entrega.`,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <PageBreadcrumb
          crumbs={[
            { name: "Loja", path: "/" },
            { name: `Entrega em ${zone.city}`, path },
          ]}
        />

        <section className="space-y-4" style={{ fontFamily: "Inter, sans-serif" }}>
          <p className="inline-flex items-center gap-2 rounded-full bg-pastel-sage/30 px-4 py-2 text-sm font-medium text-secondary-foreground">
            <MapPin className="size-4" />
            {zone.city}/{zone.state}
          </p>
          <h1 className="font-sans text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Sex shop em {zone.city} com entrega discreta
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            A The Secret Boutique entrega produtos de bem-estar íntimo em{" "}
            {zone.city} por motoboy, em embalagem neutra. Você escolhe pelo
            site, sem criar conta, e recebe em casa.{" "}
            {shippingSentence(zone)}.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-6">
              <Link href="/#catalog">Ver produtos</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6">
              <Link href="/como-funciona">Como funciona</Link>
            </Button>
          </div>
        </section>

        <section
          aria-labelledby="como-funciona-entrega"
          className="mt-12 grid gap-4 md:grid-cols-3"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <h2 id="como-funciona-entrega" className="sr-only">
            Como funciona a entrega em {zone.city}
          </h2>
          {[
            {
              icon: Bike,
              title: "Motoboy até sua casa",
              text: `Entrega no endereço que você informar no checkout. ${shippingSentence(zone)}.`,
            },
            {
              icon: CreditCard,
              title: "Pagamento via Pix",
              text: `Pedido mínimo de ${formatCents(MIN_HOME_DELIVERY_SUBTOTAL_CENTS)}. O Pix é gerado no próprio checkout.`,
            },
            {
              icon: Package,
              title: "Embalagem neutra",
              text: "Sem logotipo nem descrição do conteúdo. Ninguém sabe o que tem dentro.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-border/60 bg-card p-6">
              <item.icon className="mb-3 size-6 text-primary" />
              <h3 className="mb-1 font-sans text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </section>

        {isPickupCity && (
          <section
            className="mt-6 flex gap-4 rounded-3xl bg-pastel-lavender/15 p-6"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <KeyRound className="mt-1 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="mb-1 font-sans text-lg font-semibold text-foreground">
                Prefere retirar? É anônimo.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Em Pitangueiras você também pode retirar no {PICKUP_PLACE_NAME},{" "}
                {STORE_HOURS_LABEL}, apresentando só o código do pedido.
              </p>
            </div>
          </section>
        )}

        {highlights.length > 0 && (
          <section aria-labelledby="destaques" className="mt-14">
            <h2
              id="destaques"
              className="mb-5 font-sans text-2xl font-semibold text-foreground"
            >
              Destaques da loja
            </h2>
            <ProductLinkGrid products={highlights} />
          </section>
        )}

        <section aria-labelledby="perguntas" className="mt-14" style={{ fontFamily: "Inter, sans-serif" }}>
          <h2
            id="perguntas"
            className="mb-5 font-sans text-2xl font-semibold text-foreground"
          >
            Perguntas frequentes
          </h2>
          <div className="divide-y divide-border rounded-3xl border border-border/60 bg-card">
            {faq.map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="cursor-pointer font-medium text-foreground">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {otherZones.length > 0 && (
          <p className="mt-10 text-sm text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
            Também entregamos em{" "}
            {otherZones.map((item, index) => (
              <span key={item.city}>
                {index > 0 && " e "}
                <Link
                  href={cityPath(item.city)}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {item.city}
                </Link>
              </span>
            ))}
            .
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
