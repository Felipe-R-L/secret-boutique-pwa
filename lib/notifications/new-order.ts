import "server-only";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { NewOrderStaffEmail } from "@/emails/new-order-staff-email";
import { formatCents } from "@/lib/money";
import {
  cashChangeDueCents,
  describeInPersonPayment,
} from "@/lib/payment-labels";
import { sendPushToAdmins } from "@/lib/push/server";
import { isInPersonPayment } from "@/lib/schemas";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Avisa a equipe (ADMIN e STAFF) de um pedido que precisa ser atendido, por
// dois canais independentes: push e email. O email existe para não depender
// só do push, que falha em silêncio quando o celular não está inscrito, está
// em economia de bateria ou o navegador perdeu a inscrição.

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://secret-boutique.com.br";

type OrderRow = {
  id: string;
  status: string;
  delivery_method: string;
  room_number: string | null;
  delivery_neighborhood: string | null;
  delivery_city: string | null;
  payment_method: string | null;
  cash_change_for_cents: number | null;
  total_cents: number;
};

function destinationOf(order: OrderRow): string {
  if (order.delivery_method === "ROOM_DELIVERY") {
    return `Quarto ${order.room_number ?? "?"}`;
  }
  if (order.delivery_method === "HOME_DELIVERY") {
    const place = [order.delivery_neighborhood, order.delivery_city]
      .filter(Boolean)
      .join(", ");
    return place ? `Entrega a domicílio — ${place}` : "Entrega a domicílio";
  }
  return "Retirada na recepção";
}

/**
 * Envia push e email de "pedido novo". Nunca lança: falha de um canal não
 * impede o outro nem quebra o checkout/webhook que chamou.
 */
export async function notifyStaffOfNewOrder(orderId: string): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id,status,delivery_method,room_number,delivery_neighborhood,delivery_city,payment_method,cash_change_for_cents,total_cents",
      )
      .eq("id", orderId)
      .maybeSingle<OrderRow>();

    if (error || !order) {
      console.error("[new-order] Pedido não encontrado", orderId, error);
      return;
    }

    const method = order.payment_method ?? "PIX";
    const inPerson = isInPersonPayment(method);
    const destination = destinationOf(order);
    const payment = inPerson
      ? describeInPersonPayment(method, order.cash_change_for_cents)
      : "Pix (pago)";
    const headline = inPerson
      ? "Novo pedido — pagar na entrega 🛍️"
      : "Novo pedido pago 🛍️";
    const changeDue =
      method === "CASH"
        ? cashChangeDueCents(order.cash_change_for_cents, order.total_cents)
        : null;
    const actionHint = inPerson
      ? `Cobrar ${formatCents(order.total_cents)} na entrega${
          changeDue ? ` — levar ${formatCents(changeDue)} de troco` : ""
        }.`
      : null;

    const results = await Promise.allSettled([
      sendPushToAdmins({
        title: headline,
        body: `${destination} • ${formatCents(order.total_cents)} • ${payment}`,
        url: "/admin/orders",
        tag: `order-${order.id}`,
      }),
      sendStaffEmail({
        orderId: order.id,
        headline,
        destination,
        payment,
        totalCents: order.total_cents,
        actionHint,
      }),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[new-order] Falha ao avisar a equipe", result.reason);
      }
    }
  } catch (err) {
    console.error("[new-order] Falha ao avisar a equipe", err);
  }
}

async function sendStaffEmail(input: {
  orderId: string;
  headline: string;
  destination: string;
  payment: string;
  totalCents: number;
  actionHint: string | null;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !from) {
    console.warn("[new-order] Resend não configurado; pulando email.");
    return;
  }

  const supabase = createServiceRoleClient();
  const [{ data: staff, error: staffError }, { data: items }] =
    await Promise.all([
      supabase.from("admin_users").select("email"),
      supabase
        .from("order_items")
        .select("quantity,variant_label,products(name)")
        .eq("order_id", input.orderId)
        .order("id", { ascending: true }),
    ]);

  if (staffError) throw new Error(staffError.message);

  const recipients = Array.from(
    new Set(
      (staff ?? [])
        .map((row) => row.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  );
  if (recipients.length === 0) return;

  const html = await render(
    NewOrderStaffEmail({
      ...input,
      items: (items ?? []).map((item) => {
        const product = (item as { products: unknown }).products as
          | { name: string | null }
          | Array<{ name: string | null }>
          | null;
        const name = Array.isArray(product)
          ? product[0]?.name
          : product?.name;
        return {
          name: name ?? "Produto",
          variant: item.variant_label,
          quantity: item.quantity,
        };
      }),
      adminUrl: `${SITE_URL}/admin/orders`,
    }),
  );

  const subject = `Novo pedido: ${input.destination} • ${formatCents(
    input.totalCents,
  )}`;

  // Um email por pessoa: ninguém vê o endereço dos colegas.
  const { error } = await new Resend(resendKey).batch.send(
    recipients.map((to) => ({ from, to, subject, html })),
  );
  if (error) throw new Error(error.message);
}
