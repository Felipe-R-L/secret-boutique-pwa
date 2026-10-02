-- Dinheiro em centavos inteiros.
--
-- Todos os valores monetários deixam de ser numeric em reais e passam a ser
-- integer em centavos (R$ 49,90 = 4990), com o sufixo _cents no nome. O
-- código só converte para reais na tela, no que o usuário digita e no
-- payload do Mercado Pago (lib/money.ts).
--
-- Roda numa transação só. Os nomes das colunas mudam, então aplique junto
-- com o deploy do código que usa _cents: entre a migration e o deploy, a
-- versão antiga do site não consegue ler preços nem criar pedidos.

BEGIN;

-- A view de custo médio depende de invoice_total; é recriada no fim.
DROP VIEW IF EXISTS public.product_cost_summary;

-- Compara troco com total; se ficasse ativa, seria checada no meio da
-- conversão (um em reais, outro em centavos). Volta no fim.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_cash_change_only_for_cash;

-- 1. Produtos
ALTER TABLE public.products RENAME COLUMN price TO price_cents;
ALTER TABLE public.products
  ALTER COLUMN price_cents TYPE integer USING round(price_cents * 100)::integer;

-- Preço de cada variação, dentro do JSON: "price" (reais) → "price_cents".
UPDATE public.products p
SET variants = (
  SELECT jsonb_agg(
    CASE
      WHEN v ? 'price' THEN
        (v - 'price')
          || jsonb_build_object(
            'price_cents',
            round((v ->> 'price')::numeric * 100)::integer
          )
      ELSE v
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.variants) WITH ORDINALITY AS e(v, ord)
)
WHERE jsonb_typeof(p.variants) = 'array'
  AND jsonb_array_length(p.variants) > 0;

-- 2. Pedidos
ALTER TABLE public.orders RENAME COLUMN total_amount TO total_cents;
ALTER TABLE public.orders
  ALTER COLUMN total_cents TYPE integer USING round(total_cents * 100)::integer;

ALTER TABLE public.orders RENAME COLUMN delivery_fee TO delivery_fee_cents;
ALTER TABLE public.orders ALTER COLUMN delivery_fee_cents DROP DEFAULT;
ALTER TABLE public.orders
  ALTER COLUMN delivery_fee_cents TYPE integer
  USING round(delivery_fee_cents * 100)::integer;
ALTER TABLE public.orders ALTER COLUMN delivery_fee_cents SET DEFAULT 0;

ALTER TABLE public.orders RENAME COLUMN cash_change_for TO cash_change_for_cents;
ALTER TABLE public.orders
  ALTER COLUMN cash_change_for_cents TYPE integer
  USING round(cash_change_for_cents * 100)::integer;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_cash_change_only_for_cash CHECK (
    cash_change_for_cents IS NULL
    OR (payment_method = 'CASH' AND cash_change_for_cents >= total_cents)
  );

-- 3. Itens do pedido
ALTER TABLE public.order_items RENAME COLUMN unit_price TO unit_price_cents;
ALTER TABLE public.order_items
  ALTER COLUMN unit_price_cents TYPE integer
  USING round(unit_price_cents * 100)::integer;

-- 4. Movimentações de estoque (nota fiscal e custo unitário)
ALTER TABLE public.inventory_movements
  RENAME COLUMN invoice_total TO invoice_total_cents;
ALTER TABLE public.inventory_movements
  ALTER COLUMN invoice_total_cents TYPE bigint
  USING round(invoice_total_cents * 100)::bigint;

ALTER TABLE public.inventory_movements RENAME COLUMN unit_cost TO unit_cost_cents;
ALTER TABLE public.inventory_movements
  ALTER COLUMN unit_cost_cents TYPE bigint
  USING round(unit_cost_cents * 100)::bigint;

-- 5. Analytics (valor do item no carrinho / total do pedido)
ALTER TABLE public.analytics_events RENAME COLUMN value TO value_cents;
ALTER TABLE public.analytics_events
  ALTER COLUMN value_cents TYPE integer USING round(value_cents * 100)::integer;

-- 6. View de custo médio ponderado, agora em centavos
CREATE VIEW public.product_cost_summary AS
SELECT
  product_id,
  COUNT(*) AS total_entries,
  SUM(quantity) AS total_units_entered,
  SUM(invoice_total_cents) AS total_invested_cents,
  CASE
    WHEN SUM(quantity) > 0
      THEN ROUND(SUM(invoice_total_cents)::numeric / SUM(quantity))::bigint
    ELSE 0
  END AS weighted_avg_cost_cents
FROM public.inventory_movements
WHERE type = 'ENTRY' AND invoice_total_cents IS NOT NULL
GROUP BY product_id;

COMMIT;
