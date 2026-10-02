-- Observabilidade mínima da loja: eventos anônimos de navegação e funil.
--
-- Cada linha é um evento de um visitante anônimo (uuid gerado no navegador).
-- Nada de IP, user agent, nome, email ou CPF. Serve ao painel /admin/analytics
-- (tráfego, funil, dot plot por visitante e diagnóstico de desistência).
--
-- Escrita só pela service role (rota /api/track); leitura só ADMIN.
-- Idempotente: pode ser reaplicado.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigserial PRIMARY KEY,
  visitor_id uuid NOT NULL,
  session_id uuid NOT NULL,
  event text NOT NULL,
  path text,
  source text,
  product_id uuid,
  value numeric(10, 2),
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_check;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_check CHECK (
    event IN (
      'page_view',
      'age_gate_choice',
      'product_view',
      'add_to_cart',
      'remove_from_cart',
      'cart_view',
      'checkout_step',
      'payment_selected',
      'checkout_error',
      'order_created',
      'trust_page_view',
      'whatsapp_click',
      'instagram_click'
    )
  );

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_source_check;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_source_check CHECK (
    source IS NULL
    OR source IN ('tv', 'qr_quarto', 'instagram', 'whatsapp', 'google', 'direto', 'outro')
  );

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON public.analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor
  ON public.analytics_events (visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event
  ON public.analytics_events (event, created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Sem policy de INSERT/UPDATE/DELETE: só a service role (que ignora RLS)
-- grava. Leitura direta só para ADMIN.
DROP POLICY IF EXISTS analytics_events_admin_read ON public.analytics_events;
CREATE POLICY analytics_events_admin_read
ON public.analytics_events
FOR SELECT
USING (public.current_admin_role() = 'ADMIN');
