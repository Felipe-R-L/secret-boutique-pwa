-- Estoque por variante nos movimentos de inventário.
--
-- Permite que uma "saída de estoque" (EXIT) manual mire uma variante específica,
-- não só o estoque agregado do produto. Adiciona variant_id/variant_label em
-- inventory_movements e ajusta o trigger update_product_stock para não duplicar
-- o agregado quando o movimento é de variante (a server action cuida do JSONB).
-- Depende de supabase/migration_inventory.sql (tabela inventory_movements + trigger).

-- 1. Add variant columns to inventory_movements
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS variant_label text;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_id
  ON inventory_movements (variant_id);

-- 2. Update the stock trigger so it skips the aggregate update for
--    variant-targeted movements. For those, the server action owns the
--    JSONB variant math AND recomputes products.stock_quantity as the sum
--    of variant stocks, so the trigger must NOT also apply the delta
--    (that would double-count).
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  delta integer;
BEGIN
  -- Variant-targeted movement: handled entirely in application code.
  IF NEW.variant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determine delta based on movement type
  IF NEW.type IN ('ENTRY', 'ADJUSTMENT') THEN
    delta := NEW.quantity;
  ELSIF NEW.type IN ('EXIT', 'SALE') THEN
    delta := -NEW.quantity;
  ELSE
    delta := 0;
  END IF;

  -- Update product stock (aggregate, whole-product movements only)
  UPDATE products
  SET
    stock_quantity = GREATEST(stock_quantity + delta, 0),
    in_stock = (stock_quantity + delta) > 0,
    updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
