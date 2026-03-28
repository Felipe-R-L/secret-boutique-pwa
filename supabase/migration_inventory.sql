-- Migration: Inventory Management System
-- Run this in Supabase SQL Editor

-- 1. Add stock_quantity column to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

-- 2. Create inventory_movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ENTRY', 'EXIT', 'SALE', 'ADJUSTMENT')),
  quantity integer NOT NULL CHECK (quantity > 0),
  invoice_total numeric(12, 2),
  unit_cost numeric(12, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Index for fast lookups by product
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id
  ON inventory_movements (product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at
  ON inventory_movements (created_at DESC);

-- 4. Function to recalculate stock after movement insert
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  delta integer;
  new_qty integer;
BEGIN
  -- Determine delta based on movement type
  IF NEW.type IN ('ENTRY', 'ADJUSTMENT') THEN
    delta := NEW.quantity;
  ELSIF NEW.type IN ('EXIT', 'SALE') THEN
    delta := -NEW.quantity;
  ELSE
    delta := 0;
  END IF;

  -- Update product stock
  UPDATE products
  SET
    stock_quantity = GREATEST(stock_quantity + delta, 0),
    in_stock = (stock_quantity + delta) > 0,
    updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger on inventory_movements insert
DROP TRIGGER IF EXISTS trg_update_product_stock ON inventory_movements;
CREATE TRIGGER trg_update_product_stock
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- 6. View: product cost summary (weighted average cost)
CREATE OR REPLACE VIEW product_cost_summary AS
SELECT
  product_id,
  COUNT(*) AS total_entries,
  SUM(quantity) AS total_units_entered,
  SUM(invoice_total) AS total_invested,
  CASE
    WHEN SUM(quantity) > 0 THEN ROUND(SUM(invoice_total) / SUM(quantity), 2)
    ELSE 0
  END AS weighted_avg_cost
FROM inventory_movements
WHERE type = 'ENTRY' AND invoice_total IS NOT NULL
GROUP BY product_id;

-- 7. Sync in_stock flag with stock_quantity for existing products
UPDATE products
SET in_stock = (stock_quantity > 0);
