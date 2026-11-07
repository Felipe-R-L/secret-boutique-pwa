// Item do cardápio impresso dos quartos (/admin/cardapio): um preço só por
// produto — variações não aparecem na folha.

import { isCents } from '@/lib/money';
import type { Database, Json } from '@/lib/supabase/database.types';

type ProductRow = Pick<
  Database['public']['Tables']['products']['Row'],
  'id' | 'name' | 'category' | 'price_cents' | 'variants'
>;

export type PrintedMenuItem = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  /** Há variação com preço diferente: a folha mostra "a partir de". */
  priceFrom: boolean;
};

/** Preços das variações em estoque, ignorando entradas malformadas. */
function inStockVariantPrices(variants: Json | null): number[] {
  if (!Array.isArray(variants)) return [];

  return variants.flatMap(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    if (candidate.in_stock === false) return [];
    return isCents(candidate.price_cents) ? [candidate.price_cents] : [];
  });
}

export function toPrintedMenuItem(row: ProductRow): PrintedMenuItem {
  const variantPrices = inStockVariantPrices(row.variants);
  const prices = variantPrices.length > 0 ? variantPrices : [row.price_cents];
  const priceCents = Math.min(...prices);

  return {
    id: row.id,
    name: row.name.trim(),
    category: row.category.trim(),
    priceCents,
    priceFrom: prices.some(price => price !== priceCents),
  };
}
