-- Product variants stored as JSONB on products plus checkout snapshot fields.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_order_id_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS order_items_order_variant_unique_idx
  ON public.order_items (
    order_id,
    product_id,
    COALESCE(variant_id, '__base__')
  );

CREATE INDEX IF NOT EXISTS products_variants_gin_idx
  ON public.products USING gin (variants);