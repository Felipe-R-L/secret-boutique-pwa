import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/mercadopago/client";
import { sendVoucherEmail } from "@/lib/services/email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function parseSignature(header: string | null) {
  if (!header) return null;

  const parts = header.split(",").map((item) => item.trim());
  const parsed: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) parsed[key] = value;
  }

  if (!parsed.ts || !parsed.v1) return null;
  return { ts: parsed.ts, v1: parsed.v1 };
}

function validateWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const parsed = parseSignature(signatureHeader);
  if (!parsed) return false;

  const payload = `${parsed.ts}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(parsed.v1);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function extractOrderId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as {
    data?: { id?: string | number };
    resource?: string;
  };

  if (candidate.data?.id) {
    return String(candidate.data.id);
  }

  if (candidate.resource && typeof candidate.resource === "string") {
    const parts = candidate.resource.split("/");
    return parts[parts.length - 1] || null;
  }

  return null;
}

function mapOrderStatus(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase();

  if (["paid", "processed", "approved"].includes(normalized)) {
    return "PAID" as const;
  }

  if (["cancelled", "canceled"].includes(normalized)) {
    return "CANCELLED" as const;
  }

  if (["expired"].includes(normalized)) {
    return "EXPIRED" as const;
  }

  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const isValid = validateWebhookSignature(
    rawBody,
    request.headers.get("x-signature"),
  );

  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 },
    );
  }

  let payload: unknown = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const mpOrderId = extractOrderId(payload);
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
    .from("orders")
    .select("id,status")
    .eq("mercadopago_order_id", mpOrderId)
    .maybeSingle();

  if (orderLookupError || !order) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "Order not mapped",
    });
  }

  if (order.status === mappedStatus) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: mappedStatus, updated_at: new Date().toISOString() })
    .eq("id", order.id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 },
    );
  }

  if (mappedStatus === "PAID") {
    try {
      await sendVoucherEmail(order.id);
    } catch (emailError) {
      console.error("Failed sending voucher email", emailError);
    }
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    status: mappedStatus,
  });
}
