BEGIN;

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.products
SET images = CASE
  WHEN image_url IS NOT NULL AND length(trim(image_url)) > 0
    THEN jsonb_build_array(trim(image_url))
  ELSE '[]'::jsonb
END
WHERE images IS NULL OR images = '[]'::jsonb;

COMMIT;
