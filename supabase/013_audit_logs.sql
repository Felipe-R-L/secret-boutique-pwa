-- Audit log de ações administrativas.
--
-- Registra ações (mutações) e navegação no painel admin para rastreabilidade.
-- Escrita exclusivamente via service role (camada de aplicação — lib/audit),
-- que ignora RLS por design; nenhuma policy de INSERT é concedida a
-- anon/authenticated, então o log não pode ser adulterado pela chave do cliente.
-- Leitura SOMENTE por ADMIN — STAFF tem as ações registradas, mas não vê o log.
--
-- Idempotente: pode ser reaplicado sem efeitos colaterais.

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid,
  actor_email  text,
  actor_role   text,
  action       text NOT NULL,
  category     text NOT NULL DEFAULT 'general',
  target_type  text,
  target_id    text,
  target_label text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  path         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_category_idx
  ON public.audit_logs (category);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON public.audit_logs (actor_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- current_admin_role() já é criado nos scripts 005/011. Leitura só para ADMIN.
DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_read
ON public.audit_logs
FOR SELECT
USING (public.current_admin_role() = 'ADMIN');

-- Sem policies de INSERT/UPDATE/DELETE: escrita acontece apenas via service role.

COMMIT;
