import Link from "next/link";
import { Bike, KeyRound, Package } from "lucide-react";
import {
  DELIVERY_ZONES,
  MIN_HOME_DELIVERY_SUBTOTAL_CENTS,
} from "@/lib/delivery-zones";
import { formatCents } from "@/lib/money";
import { cityPath } from "@/lib/storefront-paths";
import { PICKUP_PLACE_NAME, STORE_HOURS_LABEL } from "@/lib/site";

// Bloco "como recebo" reaproveitado na página de produto.
export function DeliverySummary() {
  return (
    <section
      aria-labelledby="como-receber"
      className="rounded-3xl border border-border/60 bg-card p-5 md:p-6"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <h2
        id="como-receber"
        className="mb-4 font-sans text-lg font-semibold text-foreground"
      >
        Como você recebe
      </h2>
      <ul className="space-y-4 text-sm text-muted-foreground">
        <li className="flex gap-3">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <strong className="text-foreground">Retirada anônima</strong> no{" "}
            {PICKUP_PLACE_NAME}, em Pitangueiras, {STORE_HOURS_LABEL}: só o
            código do pedido, sem documento.
          </span>
        </li>
        <li className="flex gap-3">
          <Bike className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <strong className="text-foreground">Motoboy</strong>:{" "}
            {DELIVERY_ZONES.map((zone, index) => (
              <span key={zone.city}>
                {index > 0 && (index === DELIVERY_ZONES.length - 1 ? " e " : ", ")}
                <Link
                  href={cityPath(zone.city)}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {zone.city}
                </Link>{" "}
                ({formatCents(zone.feeCents)}
                {zone.freeShippingFromCents !== undefined &&
                  `, grátis acima de ${formatCents(zone.freeShippingFromCents)}`}
                )
              </span>
            ))}
            . Pedido mínimo de {formatCents(MIN_HOME_DELIVERY_SUBTOTAL_CENTS)}.
          </span>
        </li>
        <li className="flex gap-3">
          <Package className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <strong className="text-foreground">Embalagem neutra</strong>, sem
            nada que identifique a loja ou o produto.
          </span>
        </li>
      </ul>
    </section>
  );
}
