import { createHmac, timingSafeEqual } from 'node:crypto';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getOrderById } from '@/lib/mercadopago/client';
import { decrementOrderStockByVariants } from '@/lib/server/product-variants';
import { sendVoucherEmail } from '@/lib/services/email';
import { sendPushToAdmins } from '@/lib/push/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function parseSignature(header: string | null) {
  if (!header) return null;

  const parts = header.split(',').map(item => item.trim());
  const parsed: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) parsed[key] = value;
  }

  if (!parsed.ts || !parsed.v1) return null;
  return { ts: parsed.ts, v1: parsed.v1 };
}

function extractPayloadResourceId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as {
    data?: { id?: string | number };
    resource?: string;
  };

  if (candidate.data?.id) {
    return String(candidate.data.id);
  }

  if (candidate.resource && typeof candidate.resource === 'string') {
    const parts = candidate.resource.split('/');
    return parts[parts.length - 1] || null;
  }

  return null;
}

function extractNotificationResourceId(
  requestUrl: string,
  payload: unknown,
): string | null {
  const url = new URL(requestUrl);
  const dataId =
    url.searchParams.get('data.id') ??
    url.searchParams.get('id') ??
    extractPayloadResourceId(payload);

  return dataId?.trim() || null;
}

function buildSignatureManifest(
  requestUrl: string,
  payload: unknown,
  signatureHeader: string | null,
  requestIdHeader: string | null,
) {
  const parsed = parseSignature(signatureHeader);
  if (!parsed) return null;

  const resourceId = extractNotificationResourceId(requestUrl, payload);
  const manifestParts = [
    resourceId ? `id:${resourceId.toLowerCase()};` : '',
    requestIdHeader?.trim() ? `request-id:${requestIdHeader.trim()};` : '',
    `ts:${parsed.ts};`,
  ];

  return {
    manifest: manifestParts.join(''),
    signature: parsed.v1,
  };
}

function validateWebhookSignature(
  requestUrl: string,
  payload: unknown,
  signatureHeader: string | null,
  requestIdHeader: string | null,
) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    // Em produção a assinatura é obrigatória: sem segredo configurado,
    // rejeita tudo em vez de aceitar requisições não verificadas.
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'MERCADO_PAGO_WEBHOOK_SECRET ausente — webhook rejeitado. Configure a assinatura secreta do painel do Mercado Pago.',
      );
      return false;
    }
    return true;
  }

  const signatureData = buildSignatureManifest(
    requestUrl,
    payload,
    signatureHeader,
    requestIdHeader,
  );
  if (!signatureData) return false;

  const expected = createHmac('sha256', secret)
    .update(signatureData.manifest)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(signatureData.signature, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function extractOrderId(payload: unknown): string | null {
  return extractPayloadResourceId(payload);
}

function mapOrderStatus(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase();

  if (['paid', 'processed', 'approved'].includes(normalized)) {
    return 'PAID' as const;
  }

  if (['cancelled', 'canceled'].includes(normalized)) {
    return 'CANCELLED' as const;
  }

  if (['expired'].includes(normalized)) {
    return 'EXPIRED' as const;
  }

  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: unknown = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 },
    );
  }

  const isValid = validateWebhookSignature(
    request.url,
    payload,
    request.headers.get('x-signature'),
    request.headers.get('x-request-id'),
  );

  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: 'Invalid signature' },
      { status: 401 },
    );
  }

  const mpOrderId = extractNotificationResourceId(request.url, payload);
  if (!mpOrderId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const mpOrder = await getOrderById(mpOrderId);
  const mappedStatus = mapOrderStatus(mpOrder.status);

  if (!mappedStatus) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      status: mpOrder.status,
    });
  }

  const supabase = createServiceRoleClient();
  const { data: order, error: orderLookupError } = await supabase
    .from('orders')
    .select(
      'id,status,pickup_code,customer_name,total_amount,delivery_method,room_number',
    )
    .eq('mercadopago_order_id', mpOrderId)
    .maybeSingle();

  if (orderLookupError || !order) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: 'Order not mapped',
    });
  }

  if (order.status === mappedStatus) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // Generate pickup code if transitioning to PAID and none exists
  let pickupCode = order.pickup_code;
  if (mappedStatus === 'PAID' && !pickupCode) {
    pickupCode = generatePickupCode();
    // Check uniqueness
    let retries = 0;
    while (retries < 5) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('pickup_code', pickupCode)
        .maybeSingle();

      if (!existing) break;
      pickupCode = generatePickupCode();
      retries++;
    }
  }

  // Transição condicionada ao status lido: se o polling de fallback (ou outra
  // entrega do webhook) já transicionou, zero linhas são afetadas e os efeitos
  // colaterais (baixa de estoque, email) não rodam duas vezes.
  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update({
      status: mappedStatus,
      pickup_code: pickupCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('status', order.status)
    .select('id');

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 },
    );
  }

  if ((updatedRows?.length ?? 0) === 0) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  if (mappedStatus === 'PAID') {
    try {
      await decrementOrderStockByVariants(supabase, order.id);
    } catch (stockError) {
      console.error('Failed to deduct stock', stockError);
    }

    try {
      await sendVoucherEmail(order.id);
    } catch (emailError) {
      console.error('Failed sending voucher email', emailError);
    }

    try {
      const total = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(order.total_amount));
      const destino =
        order.delivery_method === 'ROOM_DELIVERY'
          ? `Quarto ${order.room_number ?? ''}`.trim()
          : 'Portaria';
      await sendPushToAdmins({
        title: 'Novo pedido pago 🛍️',
        body: `${order.customer_name} • ${total} • ${destino}`,
        url: '/admin/orders',
        tag: `order-${order.id}`,
      });
    } catch (pushError) {
      console.error('Failed sending push notification', pushError);
    }
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    status: mappedStatus,
  });
}
