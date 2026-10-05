import type { Product } from '@/lib/store/cart-store';
import { DELIVERY_ZONES } from '@/lib/delivery-zones';
import { centsToDecimalString } from '@/lib/money';
import { getProductImages } from '@/lib/product-images';
import {
  getProductPriceRangeCents,
  isProductAvailable,
} from '@/lib/product-variants';
import { INSTAGRAM_URL, WHATSAPP_NUMBER } from '@/lib/site-contact';
import {
  CONTACT_EMAIL,
  PICKUP_PLACE_NAME,
  SITE_NAME,
  SITE_URL,
  STORE_ADDRESS,
  STORE_GEO,
  STORE_HOURS,
  absoluteUrl,
} from '@/lib/site';
import { productPath } from '@/lib/storefront-paths';

export const STORE_ID = `${SITE_URL}/#store`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

// "5516997118118" → "+55-16-99711-8118"
function formatPhone(digits: string): string {
  const match = digits.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `+${match[1]}-${match[2]}-${match[3]}-${match[4]}` : `+${digits}`;
}

export function storeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: 'pt-BR',
        publisher: { '@id': STORE_ID },
      },
      {
        '@type': 'Store',
        '@id': STORE_ID,
        name: SITE_NAME,
        description:
          'Sex shop e boutique de bem-estar íntimo em Pitangueiras/SP. Compra sem cadastro, embalagem discreta, retirada anônima no JR Dallas Motel e entrega por motoboy.',
        url: SITE_URL,
        logo: absoluteUrl('/logo.png'),
        image: absoluteUrl('/opengraph-image'),
        telephone: formatPhone(WHATSAPP_NUMBER),
        email: CONTACT_EMAIL,
        priceRange: '$$',
        currenciesAccepted: 'BRL',
        paymentAccepted: 'Dinheiro, Cartão de crédito, Cartão de débito, Pix',
        address: { '@type': 'PostalAddress', ...STORE_ADDRESS },
        geo: { '@type': 'GeoCoordinates', ...STORE_GEO },
        containedInPlace: {
          '@type': 'Motel',
          name: PICKUP_PLACE_NAME,
          url: 'https://www.jrdallasmotel.com.br',
        },
        areaServed: DELIVERY_ZONES.map((zone) => ({
          '@type': 'City',
          name: `${zone.city}, ${zone.state}`,
        })),
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          opens: STORE_HOURS.opens,
          closes: STORE_HOURS.closes,
        },
        sameAs: [INSTAGRAM_URL],
      },
    ],
  };
}

type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function productJsonLd(product: Product) {
  const path = productPath(product) ?? '/';
  const { min: minCents, max: maxCents } = getProductPriceRangeCents(product);
  const availability = isProductAvailable(product, null)
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
  const seller = { '@id': STORE_ID };

  // Preço com variações vira faixa (AggregateOffer); sem variações, Offer.
  const offers =
    minCents !== maxCents
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'BRL',
          lowPrice: centsToDecimalString(minCents),
          highPrice: centsToDecimalString(maxCents),
          offerCount: product.variants?.length ?? 1,
          availability,
          seller,
        }
      : {
          '@type': 'Offer',
          url: absoluteUrl(path),
          priceCurrency: 'BRL',
          price: centsToDecimalString(minCents),
          availability,
          itemCondition: 'https://schema.org/NewCondition',
          seller,
        };

  const images = getProductImages(product)
    .filter((src) => src.startsWith('http'))
    .slice(0, 5);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: images.length ? images : undefined,
    category: product.category || undefined,
    url: absoluteUrl(path),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers,
    // Só com avaliações reais, que a página mostra.
    ...(typeof product.rating === 'number' && (product.reviews ?? 0) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviews,
          },
        }
      : {}),
  };
}
