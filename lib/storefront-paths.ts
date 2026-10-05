import type { Product } from '@/lib/store/cart-store';
import { slugify } from '@/lib/slug';

// URLs públicas da vitrine, num só lugar (links, sitemap, canonical).

export function productPath(product: Pick<Product, 'slug'>): string | null {
  return product.slug ? `/produto/${product.slug}` : null;
}

export function categoryPath(category: string): string {
  return `/categoria/${slugify(category)}`;
}

export function cityPath(city: string): string {
  return `/entrega/${slugify(city)}`;
}
