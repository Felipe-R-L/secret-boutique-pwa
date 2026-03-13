BEGIN;

ALTER TABLE IF EXISTS public.store_settings
  ADD COLUMN IF NOT EXISTS categories jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.store_settings
SET categories = '[]'::jsonb
WHERE categories IS NULL;

COMMIT;
