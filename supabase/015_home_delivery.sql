-- Entrega a domicílio: endereço externo + taxa fixa de frete.
--
-- Adiciona delivery_fee e as colunas de endereço em orders, habilita o método
-- HOME_DELIVERY e ajusta as constraints de delivery_method / room_number, além
-- de exigir endereço completo quando a entrega for a domicílio.

-- 1. Delivery fee + external address columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_cep text,
  ADD COLUMN IF NOT EXISTS delivery_street text,
  ADD COLUMN IF NOT EXISTS delivery_number text,
  ADD COLUMN IF NOT EXISTS delivery_complement text,
  ADD COLUMN IF NOT EXISTS delivery_neighborhood text,
  ADD COLUMN IF NOT EXISTS delivery_city text,
  ADD COLUMN IF NOT EXISTS delivery_state text;

-- 2. Allow HOME_DELIVERY as a delivery method
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_method_check
  CHECK (delivery_method IN ('MOTEL_PICKUP', 'ROOM_DELIVERY', 'HOME_DELIVERY'));

-- 3. Room number rules: required for ROOM_DELIVERY, null for the others.
--    Home delivery uses the address columns instead of a room number.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_room_required_for_delivery;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_room_required_for_delivery CHECK (
    (
      delivery_method = 'ROOM_DELIVERY'
      AND room_number IS NOT NULL
      AND length(trim(room_number)) > 0
    )
    OR (
      delivery_method IN ('MOTEL_PICKUP', 'HOME_DELIVERY')
      AND room_number IS NULL
    )
  );

-- 4. Address required for HOME_DELIVERY (complement stays optional)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_address_required_for_home_delivery;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_address_required_for_home_delivery CHECK (
    delivery_method <> 'HOME_DELIVERY'
    OR (
      delivery_cep IS NOT NULL AND length(trim(delivery_cep)) > 0
      AND delivery_street IS NOT NULL AND length(trim(delivery_street)) > 0
      AND delivery_number IS NOT NULL AND length(trim(delivery_number)) > 0
      AND delivery_neighborhood IS NOT NULL AND length(trim(delivery_neighborhood)) > 0
      AND delivery_city IS NOT NULL AND length(trim(delivery_city)) > 0
      AND delivery_state IS NOT NULL AND length(trim(delivery_state)) > 0
    )
  );
