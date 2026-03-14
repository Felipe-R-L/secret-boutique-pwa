import { Resend } from "resend";
import { render } from "@react-email/render";
import { VoucherEmail } from "@/emails/voucher-email";
import { ReadyForPickupEmail } from "@/emails/ready-for-pickup-email";
import { OrderCompletedEmail } from "@/emails/order-completed-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function getResend() {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resendKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  return { resend: new Resend(resendKey), from };
}

export async function sendVoucherEmail(orderId: string) {
  const { resend, from } = getResend();

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,customer_name,customer_email,total_amount,status,pickup_code")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error(error?.message ?? "Order not found");
  }

  if (order.status !== "PAID") {
    throw new Error("Order is not paid");
  }

  const html = await render(
    VoucherEmail({
      customerName: order.customer_name,
      orderId: order.id,
      pickupCode: order.pickup_code ?? order.id.slice(0, 8),
      totalAmount: Number(order.total_amount),
    }),
  );

  await resend.emails.send({
    from,
    to: order.customer_email,
    subject: `Pedido confirmado — código ${order.pickup_code ?? order.id.slice(0, 8)}`,
    html,
  });
}

export async function sendReadyForPickupEmail(orderId: string) {
  const { resend, from } = getResend();

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,customer_name,customer_email,pickup_code")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error(error?.message ?? "Order not found");
  }

  const html = await render(
    ReadyForPickupEmail({
      customerName: order.customer_name,
      orderId: order.id,
      pickupCode: order.pickup_code ?? order.id.slice(0, 8),
    }),
  );

  await resend.emails.send({
    from,
    to: order.customer_email,
    subject: `Pedido pronto para retirada — código ${order.pickup_code ?? order.id.slice(0, 8)}`,
    html,
  });
}

export async function sendOrderCompletedEmail(orderId: string) {
  const { resend, from } = getResend();

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,customer_name,customer_email,completed_at")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error(error?.message ?? "Order not found");
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
