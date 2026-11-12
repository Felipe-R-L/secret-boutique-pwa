import "server-only";
import { MercadoPagoConfig, MercadoPagoError, Order } from "mercadopago";

const MP_API_BASE = "https://api.mercadopago.com";

function getAccessToken() {
  const token = process.env.MELI_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MELI_ACCESS_TOKEN");
  }
  return token;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MercadoPagoOrderResponse = Record<string, any>;

type OrderCreateBody = Parameters<Order["create"]>[0]["body"];

/**
 * Cliente da Orders API do SDK oficial. Um por chamada: o SDK grava as
 * `requestOptions` no próprio config, então reaproveitar a instância vazaria
 * chave de idempotência de uma chamada para a outra.
 */
function orderClient() {
  return new Order(
    new MercadoPagoConfig({
      accessToken: getAccessToken(),
      // Uma nova tentativa só (mesma chave de idempotência): a recepção espera.
      options: { timeout: 15000, maxRetries: 1 },
    }),
  );
}

/** Erros do SDK viram Error com status e causas, que é o que os logs mostram. */
async function call<T>(fn: () => Promise<T>): Promise<MercadoPagoOrderResponse> {
  try {
    return (await fn()) as MercadoPagoOrderResponse;
  } catch (error) {
    if (error instanceof MercadoPagoError) {
      const causes = error.causes?.length ? ` ${JSON.stringify(error.causes)}` : "";
      throw new Error(
        `Mercado Pago API error (${error.status}): ${error.message}${causes}`,
      );
    }
    throw error;
  }
}

export async function createPixOrder(payload: unknown) {
  return call(() =>
    orderClient().create({ body: payload as OrderCreateBody }),
  );
}

/** ID do terminal Point da recepção (`MODELO__SERIAL`), ou null se não configurado. */
export function getPointTerminalId(): string | null {
  return process.env.MP_POINT_TERMINAL_ID?.trim() || null;
}

/**
 * Envia a cobrança para a maquininha Point (precisa estar em modo PDV). Sem
 * `default_type`, o terminal aceita todos os meios: cartão ou QR (Pix) na tela.
 * O resultado chega pelo webhook do tópico Order ou pela consulta da order.
 */
export async function createPointOrder(input: {
  externalReference: string;
  amount: string;
  description: string;
}) {
  const terminalId = getPointTerminalId();
  if (!terminalId) {
    throw new Error("Maquininha não configurada (MP_POINT_TERMINAL_ID).");
  }

  const body = {
    type: "point",
    external_reference: input.externalReference,
    description: input.description.slice(0, 150),
    // Mesmo prazo da tela de espera da recepção; o padrão do MP é 15 min.
    expiration_time: "PT10M",
    transactions: { payments: [{ amount: input.amount }] },
    config: {
      point: { terminal_id: terminalId, print_on_terminal: "no_ticket" },
    },
  };
  return call(() =>
    orderClient().create({ body: body as unknown as OrderCreateBody }),
  );
}

/**
 * Cancela uma order do Mercado Pago. Com `atTerminal`, cancela também a que a
 * maquininha já puxou (status `at_terminal`).
 *
 * O SDK não deixa mandar o header `x-allow-cancelable-status`, então esse caso
 * vai direto na API (é o único).
 */
export async function cancelMpOrder(orderId: string, atTerminal = false) {
  if (!atTerminal) {
    return call(() => orderClient().cancel({ id: orderId }));
  }

  const response = await fetch(
    `${MP_API_BASE}/v1/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
        "x-allow-cancelable-status": "at_terminal",
      },
      cache: "no-store",
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Mercado Pago API error (${response.status}): ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as MercadoPagoOrderResponse;
}

/** Estorno total da order (Pix online ou Point). O MP aceita até 90 dias. */
export async function refundMpOrder(orderId: string) {
  return call(() => orderClient().refund({ id: orderId }));
}

export async function getOrderById(orderId: string) {
  return call(() => orderClient().get({ id: orderId }));
}

/**
 * Deep-search the MP order response for QR code data.
 * The Orders API v1 nests Pix data in various locations depending on the
 * processing mode and payment status.
 */
export function extractPixData(order: MercadoPagoOrderResponse) {
  const payment = order.transactions?.payments?.[0];

  // The Orders API v1 puts QR data directly in payment_method (not .data)
  const qrCodeBase64 =
    payment?.payment_method?.qr_code_base64 ??
    order.qr_data?.qr_code_base64 ??
    payment?.payment_method?.data?.qr_code_base64 ??
    payment?.point_of_interaction?.transaction_data?.qr_code_base64 ??
    null;

  const qrCodeText =
    payment?.payment_method?.qr_code ??
    order.qr_data?.qr_code ??
    payment?.payment_method?.data?.qr_code ??
    payment?.point_of_interaction?.transaction_data?.qr_code ??
    null;

  const ticketUrl =
    payment?.payment_method?.ticket_url ??
    payment?.point_of_interaction?.transaction_data?.ticket_url ??
    null;

  return {
    qrCodeBase64,
    qrCodeText,
    ticketUrl,
    paymentId: payment?.id ? String(payment.id) : null,
    orderStatus: order.status ?? null,
  };
}
