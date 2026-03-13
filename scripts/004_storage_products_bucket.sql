BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS products_public_read ON storage.objects;
CREATE POLICY products_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

DROP POLICY IF EXISTS products_admin_insert ON storage.objects;
CREATE POLICY products_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS products_admin_update ON storage.objects;
CREATE POLICY products_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
)
WITH CHECK (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS products_admin_delete ON storage.objects;
CREATE POLICY products_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

COMMIT;
