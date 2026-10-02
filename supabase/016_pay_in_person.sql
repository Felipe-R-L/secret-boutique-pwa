-- Pagamento presencial: cartão na maquininha ou dinheiro.
--
-- O hóspede pode pedir pelo site sem cadastro e pagar na entrega (quarto) ou
-- na retirada (recepção), e a recepção pode lançar o pedido de quem só ligou.
-- Por isso o email deixa de ser obrigatório — ele só existe nos pedidos Pix,
-- onde o Mercado Pago exige um pagador.

-- 1. Formas de pagamento aceitas
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('PIX', 'CARD', 'CASH'));

-- 2. Pagamento presencial só dentro do motel (quarto ou recepção)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_in_person_only_at_motel;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_in_person_only_at_motel CHECK (
    payment_method = 'PIX'
    OR delivery_method IN ('MOTEL_PICKUP', 'ROOM_DELIVERY')
  );

-- 3. Email opcional (pedido presencial não pede dados pessoais)
ALTER TABLE public.orders
  ALTER COLUMN customer_email DROP NOT NULL;

-- 4. Troco: valor da nota com que o hóspede vai pagar em dinheiro
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cash_change_for numeric(10, 2);
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_cash_change_only_for_cash;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_cash_change_only_for_cash CHECK (
    cash_change_for IS NULL
    OR (payment_method = 'CASH' AND cash_change_for >= total_amount)
  );

-- 5. Canal de origem: site (QR, TV, Instagram) ou lançado pela recepção
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'SITE';
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_channel_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_channel_check CHECK (channel IN ('SITE', 'RECEPTION'));

-- Pedidos de balcão antigos gravavam um email "de fachada" para o Pix
-- (RECEPTION_PIX_EMAIL, por padrão vendas@thesecretboutique.com.br).
UPDATE public.orders
  SET channel = 'RECEPTION'
  WHERE channel = 'SITE'
    AND (
      customer_email = 'vendas@thesecretboutique.com.br'
      OR customer_name = 'Venda balcão'
    );

-- 6. Consulta de pedidos em aberto por quarto (limite anti-trote no checkout)
CREATE INDEX IF NOT EXISTS idx_orders_open_by_room
  ON public.orders (room_number, created_at)
  WHERE status = 'PENDING';
