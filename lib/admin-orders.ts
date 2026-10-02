// Colunas dos pedidos no painel. Compartilhada entre a carga inicial
// (app/admin/orders/page.tsx) e a ressincronização do realtime no navegador.
export const ADMIN_ORDER_COLUMNS =
  "id,customer_name,customer_email,delivery_method,room_number,delivery_fee_cents,delivery_cep,delivery_street,delivery_number,delivery_complement,delivery_neighborhood,delivery_city,delivery_state,payment_method,cash_change_for_cents,channel,status,total_cents,pickup_code,created_at,updated_at";

export const ADMIN_ORDER_LIMIT = 200;
