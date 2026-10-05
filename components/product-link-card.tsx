import Image from "next/image";
import Link from "next/link";
import { AdultContentBlur } from "@/components/adult-content-blur";
import { HiddenInSfw, SfwEmptyNotice } from "@/components/hidden-in-sfw";
import { formatCents } from "@/lib/money";
import { getPrimaryProductImage } from "@/lib/product-images";
import { hasProductVariants } from "@/lib/product-variants";
import type { Product } from "@/lib/store/cart-store";
import { productPath } from "@/lib/storefront-paths";

// Card de produto com link real (páginas de categoria, cidade e
// "relacionados"). Renderizado no servidor; só o blur +18 é client.
export function ProductLinkCard({ product }: { product: Product }) {
  const href = productPath(product);
  if (!href) return null;
  const isAdult = product.is_adult ?? true;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:ring-primary/20"
    >
      <AdultContentBlur
        isAdult={isAdult}
        compact
        className="aspect-square w-full overflow-hidden bg-muted"
      >
        <div className="relative aspect-square w-full">
          <Image
            src={getPrimaryProductImage(product)}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      </AdultContentBlur>
      <div className="flex flex-1 flex-col gap-1 border-t border-border/50 p-3 sm:p-4">
        <h3
          className="line-clamp-2 text-sm font-medium leading-snug text-foreground sm:text-base"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {product.name}
        </h3>
        <p className="mt-auto font-sans text-base font-semibold text-foreground sm:text-lg">
          {hasProductVariants(product) && (
            <span
              className="mr-1 text-xs font-normal text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              a partir de
            </span>
          )}
          {formatCents(product.price_cents)}
        </p>
      </div>
    </Link>
  );
}

export function ProductLinkGrid({ products }: { products: Product[] }) {
  const allAdult = products.every((product) => product.is_adult ?? true);

  return (
    <>
      <SfwEmptyNotice allAdult={allAdult} />
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:gap-6">
        {products.map((product) => (
          <HiddenInSfw key={product.id} isAdult={product.is_adult ?? true}>
            <li>
              <ProductLinkCard product={product} />
            </li>
          </HiddenInSfw>
        ))}
      </ul>
    </>
  );
}
