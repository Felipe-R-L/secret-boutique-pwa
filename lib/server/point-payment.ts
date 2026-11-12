import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { AdminContext } from "@/lib/auth/admin";
import { logAudit } from "@/lib/audit/log";
import {
  cancelMpOrder,
  getOrderById,
  type MercadoPagoOrderResponse,
} from "@/lib/mercadopago/client";
import { decrementOrderStockByVariants } from "@/lib/server/product-variants";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

/** Status da order Point no Mercado Pago, já normalizado para a recepção. */
export type PointState =
  | "waiting" // created / at_terminal: na maquininha, aguardando o cliente
  | "paid"
  | "failed" // recusado no terminal
  | "canceled"
  | "expired"
  | "action_required"
  | "unknown";

export function isPointOrder(mpOrder: MercadoPagoOrderResponse | null) {
  return (mpOrder?.type ?? "").toLowerCase() === "point";
}

export function pointStateOf(mpOrder: MercadoPagoOrderResponse): PointState {
  const status = String(mpOrder.status ?? "").toLowerCase();
  if (status === "created" || status === "at_terminal") return "waiting";
  if (status === "processed") return "paid";
  if (status === "failed") return "failed";
  if (status === "canceled" || status === "cancelled") return "canceled";
  if (status === "expired") return "expired";
  if (status === "action_required") return "action_required";
  return "unknown";
}

/**
 * Forma de pagamento real usada na maquininha. A order Point aceita cartão ou
 * QR (Pix/saldo); tudo que não é cartão é gravado como Pix.
 */
export function pointPaymentMethodOf(
  mpOrder: MercadoPagoOrderResponse,
): "CARD" | "PIX" {
  const payment = mpOrder.transactions?.payments?.[0];
  const type = String(payment?.payment_method?.type ?? "").toLowerCase();
  return type.includes("card") ? "CARD" : "PIX";
}

function generatePickupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return code;
}

type SettleOutcome =
  | { settled: true; pickupCode: string; method: "CARD" | "PIX" }
  | { settled: false; reason: "not_paid" | "not_mapped" | "not_pending" };

/**
 * Fecha o pedido cuja order Point foi paga: grava a forma real (cartão ou Pix),
 * conclui (quem paga na maquininha recebe o produto na hora, no balcão ou na
 * porta do quarto), dá baixa no estoque e audita.
 *
 * Idempotente: a transição é condicionada a PENDING e ao id da order Point, então
 * webhook, polling da recepção e reenvios não baixam o estoque duas vezes.
 */
export async function settlePaidPointOrder(
  supabase: ServiceRoleClient,
  mpOrder: MercadoPagoOrderResponse,
  context?: AdminContext | null,
): Promise<SettleOutcome> {
  if (pointStateOf(mpOrder) !== "paid") {
    return { settled: false, reason: "not_paid" };
  }

  const mpOrderId = String(mpOrder.id);
  const { data: order } = await supabase
    .from("orders")
    .select("id,status,pickup_code,payment_method")
    .eq("mercadopago_order_id", mpOrderId)
    .maybeSingle();

  if (!order) return { settled: false, reason: "not_mapped" };
  if (order.status !== "PENDING") {
    return { settled: false, reason: "not_pending" };
  }

  const method = pointPaymentMethodOf(mpOrder);
  const pickupCode = order.pickup_code ?? generatePickupCode();
  const now = new Date().toISOString();

  const { data: updatedRows } = await supabase
    .from("orders")
    .update({
      status: "COMPLETED",
      payment_method: method,
      cash_change_for_cents: null,
      pickup_code: pickupCode,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", order.id)
    .eq("status", "PENDING")
    .eq("mercadopago_order_id", mpOrderId)
    .select("id");

  if ((updatedRows?.length ?? 0) === 0) {
    return { settled: false, reason: "not_pending" };
  }

  try {
    await decrementOrderStockByVariants(supabase, order.id);
  } catch (stockError) {
    console.error("Falha ao baixar estoque no pagamento Point:", stockError);
  }

  const payment = mpOrder.transactions?.payments?.[0];
  await logAudit(
    {
      action: "order.complete",
      category: "order",
      targetType: "order",
      targetId: order.id,
      targetLabel: order.id.slice(0, 8),
      metadata: {
        from: "PENDING",
        to: "COMPLETED",
        via: "point",
        paymentMethod: method,
        previousPaymentMethod: order.payment_method,
        mpOrderId,
        mpPaymentMethod: payment?.payment_method?.id ?? null,
        mpPaymentType: payment?.payment_method?.type ?? null,
      },
    },
    context ?? null,
  );

  try {
    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
  } catch {
    // Fora de um request do Next (ex.: script), não há cache para invalidar.
  }

  return { settled: true, pickupCode, method };
}

/**
 * Antes de fechar ou cancelar um pedido por fora da maquininha, tira dela a
 * cobrança Point que ainda esteja aberta — senão o cliente poderia pagar no
 * terminal um pedido já resolvido. Se ela já foi paga, fecha o pedido por ela
 * e devolve erro, porque a ação manual não cabe mais.
 */
export async function releaseOpenPointOrder(
  supabase: ServiceRoleClient,
  mpOrderId: string | null,
  context?: AdminContext | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mpOrderId) return { ok: true };

  let mpOrder;
  try {
    mpOrder = await getOrderById(mpOrderId);
  } catch {
    // Order Pix online antiga ou MP fora do ar: não bloqueia o balcão.
    return { ok: true };
  }
  if (!isPointOrder(mpOrder)) return { ok: true };

  const state = pointStateOf(mpOrder);
  if (state === "paid") {
    await settlePaidPointOrder(supabase, mpOrder, context);
    return {
      ok: false,
      error: "Esse pedido já foi pago na maquininha — já está concluído.",
    };
  }
  if (state === "waiting" || state === "action_required") {
    try {
      await cancelMpOrder(mpOrderId, true);
    } catch (cancelError) {
      console.error("Falha ao cancelar cobrança na maquininha:", cancelError);
      return {
        ok: false,
        error:
          "Não consegui tirar a cobrança da maquininha. Cancele na própria Point e tente de novo.",
      };
    }
  }
  return { ok: true };
}
