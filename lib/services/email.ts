import { Resend } from "resend";
import { render } from "@react-email/render";
import { VoucherEmail } from "@/emails/voucher-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function sendVoucherEmail(orderId: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resendKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,customer_name,customer_email,total_amount,status")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error(error?.message ?? "Order not found");
  }

  if (order.status !== "PAID") {
    throw new Error("Order is not paid");
  }

  const resend = new Resend(resendKey);

  const html = await render(
    VoucherEmail({
      customerName: order.customer_name,
      orderId: order.id,
      totalAmount: Number(order.total_amount),
    }),
  );

  await resend.emails.send({
    from,
    to: order.customer_email,
    subject: `Pedido confirmado #${order.id.slice(0, 8)}`,
    html,
  });
}
