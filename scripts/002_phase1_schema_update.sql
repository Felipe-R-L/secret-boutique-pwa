-- Phase 1 schema update for Supabase/PostgreSQL
-- Safe to run on an existing project with products/categories already created.

BEGIN;

-- Ensure products has image_url and is_featured with default false.
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

ALTER TABLE IF EXISTS public.products
  ALTER COLUMN is_featured SET DEFAULT false;

UPDATE public.products
SET is_featured = COALESCE(is_featured, false)
WHERE is_featured IS NULL;

-- Ensure admin_users table exists and reserves users name for future usage.
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill role on old rows before NOT NULL enforcement.
ALTER TABLE IF EXISTS public.admin_users
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE IF EXISTS public.admin_users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.admin_users
SET role = 'ADMIN'
WHERE role IS NULL;

ALTER TABLE IF EXISTS public.admin_users
  ALTER COLUMN role SET DEFAULT 'STAFF';

ALTER TABLE IF EXISTS public.admin_users
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_users_role_check'
      AND conrelid = 'public.admin_users'::regclass
  ) THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_role_check
      CHECK (role IN ('ADMIN', 'STAFF'));
  END IF;
END $$;

-- Keep updated_at trigger helper available.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_users_updated_at ON public.admin_users;
CREATE TRIGGER admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Store settings singleton for dynamic Hero Section.
CREATE TABLE IF NOT EXISTS public.store_settings (
  id integer PRIMARY KEY DEFAULT 1,
  hero_title text NOT NULL,
  hero_subtitle text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_settings_singleton CHECK (id = 1)
);

INSERT INTO public.store_settings (id, hero_title, hero_subtitle)
VALUES (
  1,
  'Descubra o prazer do autocuidado',
  'Produtos premium selecionados para transformar seus momentos especiais em experiencias inesqueciveis.'
)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS store_settings_updated_at ON public.store_settings;
CREATE TRIGGER store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Orders table for checkout flow.
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  delivery_method text NOT NULL,
  room_number text,
  payment_method text NOT NULL DEFAULT 'PIX',
  status text NOT NULL DEFAULT 'PENDING',
  total_amount numeric(10,2) NOT NULL,
  mercadopago_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
  CONSTRAINT orders_payment_method_check CHECK (payment_method = 'PIX'),
  CONSTRAINT orders_delivery_method_check CHECK (delivery_method IN ('MOTEL_PICKUP', 'ROOM_DELIVERY')),
  CONSTRAINT orders_room_required_for_delivery CHECK (
    (delivery_method = 'ROOM_DELIVERY' AND room_number IS NOT NULL AND length(trim(room_number)) > 0)
    OR
    (delivery_method = 'MOTEL_PICKUP' AND room_number IS NULL)
  )
);

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Order items table linking orders and products.
CREATE TABLE IF NOT EXISTS public.order_items (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS products_is_featured_idx ON public.products(is_featured);

-- Enable and define RLS.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist to make migration repeatable.
DROP POLICY IF EXISTS products_select_public ON public.products;
DROP POLICY IF EXISTS products_insert_admin ON public.products;
DROP POLICY IF EXISTS products_update_admin ON public.products;
DROP POLICY IF EXISTS products_delete_admin ON public.products;

DROP POLICY IF EXISTS admin_users_select ON public.admin_users;
DROP POLICY IF EXISTS admin_users_admin_manage ON public.admin_users;

DROP POLICY IF EXISTS store_settings_select_public ON public.store_settings;
DROP POLICY IF EXISTS store_settings_update_admin ON public.store_settings;

DROP POLICY IF EXISTS orders_admin_read ON public.orders;
DROP POLICY IF EXISTS orders_admin_write ON public.orders;

DROP POLICY IF EXISTS order_items_admin_read ON public.order_items;
DROP POLICY IF EXISTS order_items_admin_write ON public.order_items;

-- Public catalog read.
CREATE POLICY products_select_public
ON public.products
FOR SELECT
USING (true);

-- Only ADMIN can mutate products.
CREATE POLICY products_insert_admin
ON public.products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

CREATE POLICY products_update_admin
ON public.products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

CREATE POLICY products_delete_admin
ON public.products
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

-- ADMIN and STAFF can read admin_users; only ADMIN can mutate.
CREATE POLICY admin_users_select
ON public.admin_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role IN ('ADMIN', 'STAFF')
  )
);

CREATE POLICY admin_users_admin_manage
ON public.admin_users
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

-- Public can read hero settings; only ADMIN can update.
CREATE POLICY store_settings_select_public
ON public.store_settings
FOR SELECT
USING (true);

CREATE POLICY store_settings_update_admin
ON public.store_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

-- Orders and items readable/writeable for ADMIN and STAFF.
CREATE POLICY orders_admin_read
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role IN ('ADMIN', 'STAFF')
  )
);

CREATE POLICY orders_admin_write
ON public.orders
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

CREATE POLICY order_items_admin_read
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role IN ('ADMIN', 'STAFF')
  )
);

CREATE POLICY order_items_admin_write
ON public.order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'ADMIN'
  )
);

COMMIT;
