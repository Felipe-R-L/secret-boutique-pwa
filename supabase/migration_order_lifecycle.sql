-- Migration: Order Lifecycle Enhancements
-- Run this in Supabase SQL Editor

-- 1. Change status column to text to support new status values
ALTER TABLE orders 
  ALTER COLUMN status TYPE text;

-- 2. Drop old CHECK constraint and add new one with all statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('PENDING', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'EXPIRED'));

-- 3. Add pickup_code column (short 6-char code for anonymous pickup)
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS pickup_code text UNIQUE;

-- 4. Add completed_at timestamp
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 5. Enable Realtime on orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 6. Create index on pickup_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders (pickup_code) WHERE pickup_code IS NOT NULL;
