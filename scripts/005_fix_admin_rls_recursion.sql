BEGIN;

-- SECURITY DEFINER helper to read current user role from admin_users without RLS recursion.
CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role
  FROM public.admin_users au
  WHERE au.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_admin_role() TO anon, authenticated, service_role;

-- Recreate RLS policies to use helper function and avoid self-referencing admin_users recursion.
DROP POLICY IF EXISTS products_insert_admin ON public.products;
DROP POLICY IF EXISTS products_update_admin ON public.products;
DROP POLICY IF EXISTS products_delete_admin ON public.products;
DROP POLICY IF EXISTS admin_users_select ON public.admin_users;
DROP POLICY IF EXISTS admin_users_admin_manage ON public.admin_users;
DROP POLICY IF EXISTS store_settings_update_admin ON public.store_settings;
DROP POLICY IF EXISTS orders_admin_read ON public.orders;
DROP POLICY IF EXISTS orders_admin_write ON public.orders;
DROP POLICY IF EXISTS order_items_admin_read ON public.order_items;
DROP POLICY IF EXISTS order_items_admin_write ON public.order_items;

CREATE POLICY products_insert_admin
ON public.products
FOR INSERT
WITH CHECK (public.current_admin_role() = 'ADMIN');

CREATE POLICY products_update_admin
ON public.products
FOR UPDATE
USING (public.current_admin_role() = 'ADMIN')
WITH CHECK (public.current_admin_role() = 'ADMIN');

CREATE POLICY products_delete_admin
ON public.products
FOR DELETE
USING (public.current_admin_role() = 'ADMIN');

CREATE POLICY admin_users_select
ON public.admin_users
FOR SELECT
USING (public.current_admin_role() IN ('ADMIN', 'STAFF'));

CREATE POLICY admin_users_admin_manage
ON public.admin_users
FOR ALL
USING (public.current_admin_role() = 'ADMIN')
WITH CHECK (public.current_admin_role() = 'ADMIN');

CREATE POLICY store_settings_update_admin
ON public.store_settings
FOR UPDATE
USING (public.current_admin_role() = 'ADMIN')
WITH CHECK (public.current_admin_role() = 'ADMIN');

CREATE POLICY orders_admin_read
ON public.orders
FOR SELECT
USING (public.current_admin_role() IN ('ADMIN', 'STAFF'));

CREATE POLICY orders_admin_write
ON public.orders
FOR ALL
USING (public.current_admin_role() = 'ADMIN')
WITH CHECK (public.current_admin_role() = 'ADMIN');

CREATE POLICY order_items_admin_read
ON public.order_items
FOR SELECT
USING (public.current_admin_role() IN ('ADMIN', 'STAFF'));

CREATE POLICY order_items_admin_write
ON public.order_items
FOR ALL
USING (public.current_admin_role() = 'ADMIN')
WITH CHECK (public.current_admin_role() = 'ADMIN');

-- Storage policies also depended on admin_users and can trigger recursion / 42P17.
DROP POLICY IF EXISTS products_admin_insert ON storage.objects;
DROP POLICY IF EXISTS products_admin_update ON storage.objects;
DROP POLICY IF EXISTS products_admin_delete ON storage.objects;

CREATE POLICY products_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND public.current_admin_role() = 'ADMIN'
);

CREATE POLICY products_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products'
  AND public.current_admin_role() = 'ADMIN'
)
WITH CHECK (
  bucket_id = 'products'
  AND public.current_admin_role() = 'ADMIN'
);

CREATE POLICY products_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products'
  AND public.current_admin_role() = 'ADMIN'
);

COMMIT;
