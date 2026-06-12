import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VoucherEmail } from '@/emails/voucher-email';
import { ReadyForPickupEmail } from '@/emails/ready-for-pickup-email';
import { OrderCompletedEmail } from '@/emails/order-completed-email';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

function getResend() {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resendKey || !from) {
    throw new Error('Missing RESEND_API_KEY or RESEND_FROM_EMAIL');
  }

  return { resend: new Resend(resendKey), from };
}

export async function sendVoucherEmail(orderId: string) {
  const { resend, from } = getResend();

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id,customer_name,customer_email,total_amount,status,pickup_code,delivery_method,room_number',
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error(error?.message ?? 'Order not found');
  }

  if (order.status !== 'PAID') {
    throw new Error('Order is not paid');
  }

  const html = await render(
    VoucherEmail({
      customerName: order.customer_name,
      deliveryMethod: order.delivery_method,
      orderId: order.id,
      pickupCode: order.pickup_code ?? order.id.slice(0, 8),
      roomNumber: order.room_number,
      totalAmount: Number(order.total_amount),
    }),
  );

  const subject =
    order.delivery_method === 'ROOM_DELIVERY'
      ? `Pedido confirmado — entrega no quarto ${order.room_number ?? ''}`.trim()
      : `Pedido confirmado — código ${order.pickup_code ?? order.id.slice(0, 8)}`;

  await resend.emails.send({
    from,
    to: order.customer_email,
    subject,
    html,
  });
}

export async function sendReadyForPickupEmail(orderId: string) {
  const { resend, from } = getResend();

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id,customer_name,customer_email,pickup_code,delivery_method,room_number',
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error(error?.message ?? 'Order not found');
  }

  const html = await render(
    ReadyForPickupEmail({
      customerName: order.customer_name,
      deliveryMethod: order.delivery_method,
      orderId: order.id,
      pickupCode: order.pickup_code ?? order.id.slice(0, 8),
      roomNumber: order.room_number,
    }),
  );

  const subject =
    order.delivery_method === 'ROOM_DELIVERY'
      ? `Pedido a caminho do quarto ${order.room_number ?? ''}`.trim()
      : `Pedido pronto para retirada — código ${order.pickup_code ?? order.id.slice(0, 8)}`;

  await resend.emails.send({
    from,
    to: order.customer_email,
    subject,
    html,
  });
}

export async function sendOrderCompletedEmail(orderId: string) {
  const { resend, from } = getResend();

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id,customer_name,customer_email,completed_at')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error(error?.message ?? 'Order not found');
  }

  const html = await render(
    OrderCompletedEmail({
      customerName: order.customer_name,
      orderId: order.id,
      completedAt: order.completed_at ?? new Date().toISOString(),
    }),
  );

  await resend.emails.send({
    from,
    to: order.customer_email,
    subject: `Pedido retirado com sucesso — The Secret Boutique`,
    html,
  });
}
