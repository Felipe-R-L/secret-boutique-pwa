import type { MetadataRoute } from 'next';
import { getCatalogData } from '@/lib/data/catalog';
import { DELIVERY_ZONES } from '@/lib/delivery-zones';
import { absoluteUrl } from '@/lib/site';
import {
  categoryPath,
  cityPath,
  productPath,
} from '@/lib/storefront-paths';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await getCatalogData();

  const staticPages = ['/', '/como-funciona', '/sobre', '/privacidade'];
  const cityPages = DELIVERY_ZONES.map((zone) => cityPath(zone.city));
  const categoryPages = categories
    .filter((category) =>
      products.some((product) => product.category.trim() === category),
    )
    .map(categoryPath);
  const productPages = products
    .map(productPath)
    .filter((path): path is string => path !== null);

  return [...staticPages, ...cityPages, ...categoryPages, ...productPages].map(
    (path) => ({ url: absoluteUrl(path) }),
  );
}
