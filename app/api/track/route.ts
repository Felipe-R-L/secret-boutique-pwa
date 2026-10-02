import { NextResponse } from "next/server";
import { z } from "zod";
import { ANALYTICS_EVENTS, TRAFFIC_SOURCES } from "@/lib/analytics/events";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Recebe eventos anônimos do navegador (lib/analytics/client.ts) e grava em
// analytics_events. Responde 204 sempre que possível: métrica nunca pode
// quebrar a loja nem revelar detalhes de erro.

const propValue = z.union([
  z.string().max(120),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const trackSchema = z
  .object({
    event: z.enum(ANALYTICS_EVENTS),
    visitorId: z.string().uuid(),
    sessionId: z.string().uuid(),
    source: z.enum(TRAFFIC_SOURCES).optional(),
    path: z.string().max(200).optional(),
    productId: z.string().uuid().optional(),
    value: z.number().finite().min(0).max(100000).optional(),
    props: z
      .record(z.string().max(40), propValue)
      .refine((p) => Object.keys(p).length <= 12, "too many props")
      .optional(),
  })
  .strict();

const BOT_PATTERN =
  /bot|crawler|spider|preview|headless|lighthouse|facebookexternalhit/i;

// Rate limit simples em memória (por instância): o suficiente para conter
// um loop no cliente ou script ingênuo. Não é defesa contra ataque dedicado.
const WINDOW_MS = 5 * 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 120;
const hits = new Map<string, { count: number; start: number }>();

function rateLimited(visitorId: string): boolean {
  const now = Date.now();
  const entry = hits.get(visitorId);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(visitorId, { count: 1, start: now });
    if (hits.size > 5000) {
      for (const [key, value] of hits) {
        if (now - value.start > WINDOW_MS) hits.delete(key);
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_EVENTS_PER_WINDOW;
}

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const userAgent = request.headers.get("user-agent") ?? "";
    if (!userAgent || BOT_PATTERN.test(userAgent)) return noContent();

    const raw = await request.text();
    if (raw.length > 4000) return noContent();

    const parsed = trackSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return new NextResponse(null, { status: 400 });
    }

    const data = parsed.data;
    if (rateLimited(data.visitorId)) return noContent();

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("analytics_events").insert({
      visitor_id: data.visitorId,
      session_id: data.sessionId,
      event: data.event,
      path: data.path ?? null,
      source: data.source ?? null,
      product_id: data.productId ?? null,
      value: data.value ?? null,
      props: data.props ?? {},
    });

    if (error) console.error("[track] insert falhou:", error.message);
  } catch (error) {
    console.error("[track] evento descartado:", error);
  }

  return noContent();
}
