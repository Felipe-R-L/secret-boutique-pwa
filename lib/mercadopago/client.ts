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

async function mpFetch<T>(path: string, init: RequestInit) {
  const token = getAccessToken();

  const idempotencyHeaders: Record<string, string> =
    init.method === "POST"
      ? { "X-Idempotency-Key": crypto.randomUUID() }
      : {};

  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...idempotencyHeaders,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new Error(`Mercado Pago API error (${response.status}): ${text}`);
  }

  return data;
}

export async function createPixOrder(payload: unknown) {
  return mpFetch<MercadoPagoOrderResponse>("/v1/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrderById(orderId: string) {
  return mpFetch<MercadoPagoOrderResponse>(`/v1/orders/${orderId}`, {
    method: "GET",
  });
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
