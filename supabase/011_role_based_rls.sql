-- Role-based RLS hardening.
--
-- Contexto: as server actions do app já enforçam cargo (requireAdminContext)
-- e a maioria das escritas admin usa a service role (que ignora RLS por
-- design). Este script é a camada de defesa em profundidade no banco: garante
-- que, mesmo via chave anon/authenticated direta, cada cargo só enxergue e
-- altere o que deve.
--
-- Idempotente: pode ser reaplicado sem efeitos colaterais.

BEGIN;

-- Helper que lê o cargo do usuário atual sem recursão de RLS (já criado no
-- 005; recriado aqui para o script ser autossuficiente).
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
GRANT EXECUTE ON FUNCTION public.current_admin_role()
  TO anon, authenticated, service_role;

-- Garante RLS ativo nas tabelas sensíveis (no-op se já estava habilitado).
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- inventory_movements — dados de CUSTO e MARGEM.
-- Visível e gravável SOMENTE por ADMIN. STAFF nunca acessa.
-- (Tabela estava sem RLS e sem policies até aqui.)
-- ============================================================
DROP POLICY IF EXISTS inventory_movements_admin_read ON public.inventory_movements;
DROP POLICY IF EXISTS inventory_movements_admin_write ON public.inventory_movements;

CREATE POLICY inventory_movements_admin_read
ON public.inventory_movements
FOR SELECT
USING (public.current_admin_role() = 'ADMIN');

CREATE POLICY inventory_movements_admin_write
ON public.inventory_movements
FOR ALL
USING (public.current_admin_role() = 'ADMIN')
WITH CHECK (public.current_admin_role() = 'ADMIN');

-- ============================================================
-- orders / order_items — STAFF e ADMIN leem; só ADMIN escreve direto.
-- (As transições de status do STAFF passam pela service role, com as regras
-- de cargo aplicadas na camada de aplicação — orders.ts.)
-- Reafirmado aqui para o caso de o 005 não ter sido aplicado.
-- ============================================================
DROP POLICY IF EXISTS orders_admin_read ON public.orders;
DROP POLICY IF EXISTS orders_admin_write ON public.orders;
DROP POLICY IF EXISTS order_items_admin_read ON public.order_items;
DROP POLICY IF EXISTS order_items_admin_write ON public.order_items;

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

-- ============================================================
-- products / store_settings — escrita SOMENTE ADMIN.
-- (Leitura pública de produtos é definida em scripts anteriores.)
-- ============================================================
DROP POLICY IF EXISTS products_insert_admin ON public.products;
DROP POLICY IF EXISTS products_update_admin ON public.products;
DROP POLICY IF EXISTS products_delete_admin ON public.products;

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

DROP POLICY IF EXISTS store_settings_update_admin ON public.store_settings;

CREATE POLICY store_settings_update_admin
ON public.store_settings
FOR UPDATE
USING (public.current_admin_role() = 'ADMIN')
WITH CHECK (public.current_admin_role() = 'ADMIN');

-- ============================================================
-- admin_users — STAFF e ADMIN leem (para resolver o próprio cargo);
-- só ADMIN gerencia (criar/editar/remover usuários administrativos).
-- ============================================================
DROP POLICY IF EXISTS admin_users_select ON public.admin_users;
DROP POLICY IF EXISTS admin_users_admin_manage ON public.admin_users;

CREATE POLICY admin_users_select
ON public.admin_users
FOR SELECT
USING (public.current_admin_role() IN ('ADMIN', 'STAFF'));

CREATE POLICY admin_users_admin_manage
ON public.admin_users
FOR ALL
USING (public.current_admin_role() = 'ADMIN')
WITH CHECK (public.current_admin_role() = 'ADMIN');

COMMIT;
