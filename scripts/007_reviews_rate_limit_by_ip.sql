BEGIN;

ALTER TABLE IF EXISTS public.reviews
  ADD COLUMN IF NOT EXISTS ip_hash text;

UPDATE public.reviews
SET ip_hash = CONCAT('legacy-', id::text)
WHERE ip_hash IS NULL;

ALTER TABLE public.reviews
  ALTER COLUMN ip_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_product_ip_unique_idx
  ON public.reviews(product_id, ip_hash);

COMMIT;
