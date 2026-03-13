const MP_API_BASE = "https://api.mercadopago.com";

function getAccessToken() {
  const token = process.env.MELI_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MELI_ACCESS_TOKEN");
  }
  return token;
}

export type MercadoPagoOrderResponse = {
  id?: string | number;
  status?: string;
  external_reference?: string;
  transactions?: {
    payments?: Array<{
      id?: string | number;
      status?: string;
      payment_method?: {
        id?: string;
        type?: string;
        data?: {
          qr_code?: string;
          qr_code_base64?: string;
        };
      };
      interaction?: {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
          ticket_url?: string;
        };
      };
    }>;
  };
  qr_data?: {
    qr_code?: string;
    qr_code_base64?: string;
  };
};

async function mpFetch<T>(path: string, init: RequestInit) {
  const token = getAccessToken();

  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
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

export function extractPixData(order: MercadoPagoOrderResponse) {
  const payment = order.transactions?.payments?.[0];

  const qrCodeBase64 =
    order.qr_data?.qr_code_base64 ??
    payment?.payment_method?.data?.qr_code_base64 ??
    payment?.interaction?.transaction_data?.qr_code_base64 ??
    null;

  const qrCodeText =
    order.qr_data?.qr_code ??
    payment?.payment_method?.data?.qr_code ??
    payment?.interaction?.transaction_data?.qr_code ??
    null;

  return {
    qrCodeBase64,
    qrCodeText,
    paymentId: payment?.id ? String(payment.id) : null,
    orderStatus: order.status ?? null,
  };
}
