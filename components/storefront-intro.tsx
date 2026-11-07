import Link from "next/link";
import { MapPin, Tag } from "lucide-react";
import {
  DELIVERY_ZONES,
  MIN_HOME_DELIVERY_SUBTOTAL_CENTS,
} from "@/lib/delivery-zones";
import { formatCents } from "@/lib/money";
import { categoryPath, cityPath } from "@/lib/storefront-paths";
import { STORE_HOURS_LABEL } from "@/lib/site";

// Texto de apoio da home, renderizado no servidor: explica a loja com as
// palavras que as pessoas buscam ("sex shop em Pitangueiras", "entrega
// discreta") e liga para categorias e cidades atendidas.
export function StorefrontIntro({ categories }: { categories: string[] }) {
  return (
    <section className="border-t border-border/50 bg-gradient-to-b from-background to-pastel-lavender/10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4" style={{ fontFamily: "Inter, sans-serif" }}>
          <h2 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            Sex shop em Pitangueiras, sem cadastro e sem exposição
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            A The Secret Boutique é uma boutique de bem-estar íntimo que
            funciona dentro do JR Dallas Motel, em Pitangueiras/SP. Você
            escolhe pelo site, finaliza sem criar conta e recebe um código de
            pedido. Nenhum documento é pedido na retirada: basta o código.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Hospedado no Dallas? O pedido chega ao seu quarto e você paga no
            cartão ou em dinheiro na entrega, ou via Pix na hora. Mora na
            região? Entregamos por motoboy em casa, em embalagem neutra, sem
            nada que identifique a loja ou o conteúdo. Atendimento{" "}
            {STORE_HOURS_LABEL}.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Quer entender cada etapa?{" "}
            <Link
              href="/como-funciona"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Veja como funciona a compra anônima
            </Link>
            .
          </p>
        </div>

        <div className="space-y-8">
          <nav aria-labelledby="entrega-cidades">
            <h3
              id="entrega-cidades"
              className="mb-3 flex items-center gap-2 font-sans text-lg font-semibold text-foreground"
            >
              <MapPin className="size-4 text-primary" />
              Entrega por motoboy
            </h3>
            <ul className="space-y-1" style={{ fontFamily: "Inter, sans-serif" }}>
              {DELIVERY_ZONES.map((zone) => (
                <li key={zone.city}>
                  <Link
                    href={cityPath(zone.city)}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm text-foreground transition-colors hover:bg-accent/40"
                  >
                    <span>Sex shop em {zone.city}</span>
                    <span className="text-muted-foreground">
                      frete {formatCents(zone.feeCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p
              className="mt-2 px-3 text-xs text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Pedido mínimo para entrega:{" "}
              {formatCents(MIN_HOME_DELIVERY_SUBTOTAL_CENTS)}.
            </p>
          </nav>

          {categories.length > 0 && (
            <nav aria-labelledby="categorias">
              <h3
                id="categorias"
                className="mb-3 flex items-center gap-2 font-sans text-lg font-semibold text-foreground"
              >
                <Tag className="size-4 text-primary" />
                Categorias
              </h3>
              <ul
                className="flex flex-wrap gap-2"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {categories.map((category) => (
                  <li key={category}>
                    <Link
                      href={categoryPath(category)}
                      className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:bg-accent/40"
                    >
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}
