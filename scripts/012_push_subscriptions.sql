-- Web Push subscriptions para ADMIN/STAFF receberem alertas de pedidos novos.
-- Cada navegador/dispositivo inscrito gera uma linha (endpoint é único).

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Apenas o próprio usuário (ADMIN/STAFF autenticado) gerencia suas inscrições.
-- O envio em si é feito pelo service role (server), que ignora RLS.
DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;

CREATE POLICY push_subscriptions_select_own
ON public.push_subscriptions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own
ON public.push_subscriptions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_update_own
ON public.push_subscriptions
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete_own
ON public.push_subscriptions
FOR DELETE
USING (user_id = auth.uid());
