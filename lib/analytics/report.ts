import "server-only";
import { formatCents } from "@/lib/money";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  TRAFFIC_SOURCE_LABELS,
  TRAFFIC_SOURCES,
  type TrafficSource,
} from "@/lib/analytics/events";

// Monta o relatório do painel /admin/analytics a partir de analytics_events
// (comportamento anônimo) e de orders (pedidos reais).

const TIME_ZONE = "America/Sao_Paulo";
const MAX_EVENTS = 100_000;
const PAGE_SIZE = 1000;
export const DOT_PLOT_MAX_VISITORS = 150;
// Abaixo disso, qualquer conclusão é palpite.
export const SMALL_SAMPLE_VISITORS = 30;

// Estágios do funil, do mais raso ao mais fundo. O índice é o nível.
export const FUNNEL_STAGES = [
  { key: "visited", label: "Visitou a loja" },
  { key: "viewed", label: "Viu um produto" },
  { key: "added", label: "Adicionou ao carrinho" },
  { key: "checkout", label: "Abriu o checkout" },
  { key: "payment", label: "Escolheu o pagamento" },
  { key: "ordered", label: "Fez o pedido" },
] as const;

export type StageIndex = 0 | 1 | 2 | 3 | 4 | 5;

type EventRow = {
  visitor_id: string;
  event: string;
  source: string | null;
  product_id: string | null;
  value_cents: number | null;
  props: Record<string, unknown> | null;
  created_at: string;
};

export type DotPlotRow = {
  visitorId: string;
  source: TrafficSource;
  firstSeen: string;
  // dia (yyyy-mm-dd) -> estágio mais fundo e nº de eventos naquele dia
  days: Record<string, { stage: StageIndex; events: number }>;
};

export type DiagnosisStatus = "alert" | "ok" | "no_data";

export type Evidence = { text: string; triggered: boolean };

export type Diagnosis = {
  key: "traffic" | "price" | "trust" | "catalog";
  title: string;
  status: DiagnosisStatus;
  headline: string;
  evidence: Evidence[];
};

export type AnalyticsReport = {
  periodDays: number;
  days: string[];
  hasEvents: boolean;
  smallSample: boolean;
  kpis: {
    visitors: number;
    visitorsPerDay: number;
    sessions: number;
    orders: number;
    conversion: number | null;
    /** Centavos. */
    avgTicketCents: number | null;
  };
  funnel: Array<{ label: string; visitors: number }>;
  dotPlot: { rows: DotPlotRow[]; totalVisitors: number };
  retention: {
    returning: number;
    boughtFirstDay: number;
    boughtAfterReturning: number;
    buyers: number;
  };
  sources: Array<{
    source: TrafficSource;
    label: string;
    visitors: number;
    buyers: number;
  }>;
  products: Array<{
    productId: string;
    name: string;
    /** Centavos. */
    priceCents: number | null;
    viewers: number;
    adders: number;
    removals: number;
  }>;
  diagnoses: Diagnosis[];
};

function dayKey(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function stageOf(row: EventRow): StageIndex {
  switch (row.event) {
    case "order_created":
      return 5;
    case "payment_selected":
      return 4;
    case "checkout_step": {
      const step = Number(row.props?.step ?? 1);
      return step >= 2 ? 4 : 3;
    }
    case "add_to_cart":
    case "cart_view":
    case "remove_from_cart":
      return 2;
    case "product_view":
      return 1;
    default:
      return 0;
  }
}

function pct(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0).replace(".", ",")}%`;
}


async function fetchEvents(sinceIso: string): Promise<EventRow[]> {
  const supabase = createServiceRoleClient();
  const rows: EventRow[] = [];
  for (let from = 0; from < MAX_EVENTS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("analytics_events")
      .select("visitor_id,session_id,event,source,product_id,value_cents,props,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    rows.push(...(data as EventRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function buildAnalyticsReport(
  periodDays: number,
): Promise<AnalyticsReport> {
  const now = new Date();
  const since = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const days: string[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    days.push(dayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }

  const supabase = createServiceRoleClient();
  const [events, ordersResult, productsResult] = await Promise.all([
    fetchEvents(sinceIso),
    supabase
      .from("orders")
      .select("total_cents,status")
      .gte("created_at", sinceIso)
      .not("status", "in", "(CANCELLED,EXPIRED)"),
    supabase.from("products").select("id,name,price_cents"),
  ]);

  const orders = ordersResult.data ?? [];
  const productInfo = new Map(
    (productsResult.data ?? []).map((p) => [
      p.id as string,
      { name: p.name as string, priceCents: p.price_cents as number },
    ]),
  );

  // ---- por visitante ----
  type VisitorAgg = {
    source: TrafficSource;
    firstSeen: string;
    maxStage: StageIndex;
    days: Record<string, { stage: StageIndex; events: number }>;
    firstDay: string;
    orderedDays: Set<string>;
    sawTrustPage: boolean;
    choseSfw: boolean;
    pixChosen: boolean;
    cartValueCents: number;
  };
  const visitors = new Map<string, VisitorAgg>();
  const sessions = new Set<string>();

  const productViewers = new Map<string, Set<string>>();
  const productAdders = new Map<string, Set<string>>();
  const productRemovals = new Map<string, number>();

  for (const row of events) {
    const day = dayKey(row.created_at);
    const source = (
      TRAFFIC_SOURCES.includes(row.source as TrafficSource)
        ? row.source
        : "outro"
    ) as TrafficSource;
    let agg = visitors.get(row.visitor_id);
    if (!agg) {
      agg = {
        source,
        firstSeen: row.created_at,
        maxStage: 0,
        days: {},
        firstDay: day,
        orderedDays: new Set(),
        sawTrustPage: false,
        choseSfw: false,
        pixChosen: false,
        cartValueCents: 0,
      };
      visitors.set(row.visitor_id, agg);
    }
    sessions.add(`${row.visitor_id}:${day}`);

    const stage = stageOf(row);
    const cell = (agg.days[day] ??= { stage: 0, events: 0 });
    cell.events += 1;
    if (stage > cell.stage) cell.stage = stage;
    if (stage > agg.maxStage) agg.maxStage = stage;

    if (row.event === "order_created") agg.orderedDays.add(day);
    if (row.event === "trust_page_view") agg.sawTrustPage = true;
    if (row.event === "age_gate_choice" && row.props?.choice === "sfw") {
      agg.choseSfw = true;
    }
    if (row.event === "payment_selected" && row.props?.method === "PIX") {
      agg.pixChosen = true;
    }
    if (row.event === "cart_view" && row.value_cents) {
      agg.cartValueCents = row.value_cents;
    }

    if (row.product_id) {
      const id = row.product_id;
      if (row.event === "product_view") {
        (
          productViewers.get(id) ?? productViewers.set(id, new Set()).get(id)!
        ).add(row.visitor_id);
      } else if (row.event === "add_to_cart") {
        (
          productAdders.get(id) ?? productAdders.set(id, new Set()).get(id)!
        ).add(row.visitor_id);
      } else if (row.event === "remove_from_cart") {
        productRemovals.set(id, (productRemovals.get(id) ?? 0) + 1);
      }
    }
  }

  const all = [...visitors.values()];
  const visitorCount = all.length;
  const reached = (stage: StageIndex) =>
    all.filter((v) => v.maxStage >= stage).length;

  const funnel = FUNNEL_STAGES.map((s, i) => ({
    label: s.label,
    visitors: reached(i as StageIndex),
  }));

  const buyers = all.filter((v) => v.maxStage === 5);
  const orderCount = orders.length;
  const orderTotalCents = orders.reduce((sum, o) => sum + o.total_cents, 0);

  // ---- dot plot: visitantes mais recentes no topo (pela 1ª visita) ----
  const dotRows: DotPlotRow[] = [...visitors.entries()]
    .sort((a, b) => b[1].firstSeen.localeCompare(a[1].firstSeen))
    .slice(0, DOT_PLOT_MAX_VISITORS)
    .map(([visitorId, v]) => ({
      visitorId,
      source: v.source,
      firstSeen: v.firstSeen,
      days: v.days,
    }));

  // ---- retenção ----
  const returning = all.filter((v) => Object.keys(v.days).length > 1).length;
  const boughtFirstDay = buyers.filter((v) =>
    v.orderedDays.has(v.firstDay),
  ).length;
  const boughtAfterReturning = buyers.filter((v) =>
    [...v.orderedDays].some((d) => d !== v.firstDay),
  ).length;

  // ---- origem ----
  const sources = TRAFFIC_SOURCES.map((source) => {
    const group = all.filter((v) => v.source === source);
    return {
      source,
      label: TRAFFIC_SOURCE_LABELS[source],
      visitors: group.length,
      buyers: group.filter((v) => v.maxStage === 5).length,
    };
  })
    .filter((s) => s.visitors > 0)
    .sort((a, b) => b.visitors - a.visitors);

  // ---- produtos ----
  const productIds = new Set([
    ...productViewers.keys(),
    ...productAdders.keys(),
  ]);
  const products = [...productIds]
    .map((productId) => ({
      productId,
      name: productInfo.get(productId)?.name ?? "Produto removido",
      priceCents: productInfo.get(productId)?.priceCents ?? null,
      viewers: productViewers.get(productId)?.size ?? 0,
      adders: productAdders.get(productId)?.size ?? 0,
      removals: productRemovals.get(productId) ?? 0,
    }))
    .sort((a, b) => b.viewers - a.viewers);

  // ---- diagnóstico ----
  const visitorsPerDay = visitorCount / periodDays;
  const smallSample = visitorCount < SMALL_SAMPLE_VISITORS;
  const diagnoses: Diagnosis[] = [];

  // Cada evidência diz se foi ela que disparou o alerta, para o dono saber
  // exatamente qual número olhar.
  const ev = (text: string, triggered = false): Evidence => ({
    text,
    triggered,
  });
  const present = (items: Array<Evidence | null>) =>
    items.filter((item): item is Evidence => item !== null);

  // Pouco tráfego
  const lowTraffic = visitorsPerDay < 20;
  diagnoses.push(
    visitorCount === 0
      ? {
          key: "traffic",
          title: "Tráfego",
          status: "no_data",
          headline: "Nenhuma visita registrada no período.",
          evidence: [],
        }
      : {
          key: "traffic",
          title: "Tráfego",
          status: lowTraffic ? "alert" : "ok",
          headline: lowTraffic
            ? "Pouca gente chega à loja. Antes de mexer em preço, traga mais visitantes."
            : "O volume de visitas é suficiente para tirar conclusões do funil.",
          evidence: present([
            ev(
              `${visitorsPerDay.toFixed(1).replace(".", ",")} visitantes por dia (alerta abaixo de 20)`,
              lowTraffic,
            ),
            sources[0]
              ? ev(
                  `Maior origem: ${sources[0].label} (${sources[0].visitors} visitantes)`,
                )
              : null,
          ]),
        },
  );

  // Preço / produto
  const viewers = reached(1);
  const adders = reached(2);
  const viewToAdd = pct(adders, viewers);
  const totalAdds = [...productAdders.values()].reduce((s, v) => s + v.size, 0);
  const totalRemovals = [...productRemovals.values()].reduce(
    (s, v) => s + v,
    0,
  );
  const removalRate = pct(totalRemovals, totalAdds);
  const cartViewers = all.filter((v) => v.cartValueCents > 0);
  const cartAbandoners = cartViewers.filter((v) => v.maxStage < 3);
  const cartAbandonRate = pct(cartAbandoners.length, cartViewers.length);
  const lowAddProducts = products.filter(
    (p) => p.viewers >= 10 && p.adders / p.viewers < 0.05,
  );
  const lowViewToAdd = viewToAdd !== null && viewToAdd < 0.08;
  const manyRemovals =
    removalRate !== null && totalAdds >= 4 && removalRate >= 0.25;
  const cartAbandon =
    cartAbandonRate !== null &&
    cartViewers.length >= 5 &&
    cartAbandonRate >= 0.6;
  const priceAlert = lowViewToAdd || manyRemovals || cartAbandon;
  diagnoses.push(
    viewers < 5
      ? {
          key: "price",
          title: "Preço e produtos",
          status: "no_data",
          headline: "Ainda poucas pessoas viram produtos para avaliar preço.",
          evidence: [ev(`${viewers} visitantes viram algum produto`)],
        }
      : {
          key: "price",
          title: "Preço e produtos",
          status: priceAlert ? "alert" : "ok",
          headline: priceAlert
            ? "As pessoas olham os produtos mas não colocam no carrinho — sinal de preço, foto ou descrição."
            : "Quem vê produto costuma colocar no carrinho; preço não parece ser o bloqueio principal.",
          evidence: present([
            ev(
              `${formatPct(viewToAdd)} de quem viu um produto adicionou ao carrinho (alerta abaixo de 8%)`,
              lowViewToAdd,
            ),
            totalAdds >= 4
              ? ev(
                  `${formatPct(removalRate)} das adições foram removidas do carrinho (alerta a partir de 25%)`,
                  manyRemovals,
                )
              : null,
            cartViewers.length >= 5
              ? ev(
                  `${formatPct(cartAbandonRate)} viram o carrinho e não abriram o checkout, com carrinho médio de ${formatCents(
                    Math.round(
                      cartViewers.reduce((s, v) => s + v.cartValueCents, 0) /
                        cartViewers.length,
                    ),
                  )} (alerta a partir de 60%)`,
                  cartAbandon,
                )
              : null,
            lowAddProducts.length > 0
              ? ev(
                  `Muito vistos e quase nunca adicionados: ${lowAddProducts
                    .slice(0, 3)
                    .map((p) => p.name)
                    .join(", ")}`,
                )
              : null,
          ]),
        },
  );

  // Desconfiança / fricção no checkout
  const paymentStage = reached(4);
  const paymentToOrder = pct(buyers.length, paymentStage);
  const pixChoosers = all.filter((v) => v.pixChosen);
  const pixDropRate = pct(
    pixChoosers.filter((v) => v.maxStage < 5).length,
    pixChoosers.length,
  );
  const trustReaders = all.filter((v) => v.sawTrustPage);
  const trustDropRate = pct(
    trustReaders.filter((v) => v.maxStage < 5).length,
    trustReaders.length,
  );
  const lowPaymentToOrder =
    paymentToOrder !== null && paymentStage >= 5 && paymentToOrder < 0.6;
  const pixDrop =
    pixDropRate !== null && pixChoosers.length >= 5 && pixDropRate >= 0.4;
  const trustDrop =
    trustDropRate !== null && trustReaders.length >= 5 && trustDropRate >= 0.7;
  const trustAlert = lowPaymentToOrder || pixDrop || trustDrop;
  diagnoses.push(
    paymentStage < 5 && trustReaders.length < 5
      ? {
          key: "trust",
          title: "Confiança no checkout",
          status: "no_data",
          headline:
            "Poucas pessoas chegaram ao pagamento para medir desistência.",
          evidence: [
            ev(`${paymentStage} visitantes escolheram forma de pagamento`),
          ],
        }
      : {
          key: "trust",
          title: "Confiança no checkout",
          status: trustAlert ? "alert" : "ok",
          headline: trustAlert
            ? "Gente decidida a comprar desiste na hora de pagar — sinal de desconfiança ou de formulário pesado."
            : "Quem chega ao pagamento costuma concluir o pedido.",
          evidence: present([
            paymentStage >= 5
              ? ev(
                  `${formatPct(paymentToOrder)} de quem escolheu o pagamento fez o pedido (alerta abaixo de 60%)`,
                  lowPaymentToOrder,
                )
              : null,
            pixChoosers.length >= 5
              ? ev(
                  `${formatPct(pixDropRate)} de quem escolheu Pix (pede CPF e e-mail) desistiu (alerta a partir de 40%)`,
                  pixDrop,
                )
              : null,
            trustReaders.length >= 5
              ? ev(
                  `${formatPct(trustDropRate)} de quem leu "Sobre", "Como funciona" ou "Privacidade" saiu sem comprar (alerta a partir de 70%)`,
                  trustDrop,
                )
              : null,
          ]),
        },
  );

  // Catálogo / primeira impressão
  const leftWithoutProduct = pct(visitorCount - viewers, visitorCount);
  const sfwRate = pct(all.filter((v) => v.choseSfw).length, visitorCount);
  const manyLeaveEarly =
    leftWithoutProduct !== null && leftWithoutProduct >= 0.5;
  const manySfw = sfwRate !== null && sfwRate >= 0.2;
  const catalogAlert = manyLeaveEarly || manySfw;
  diagnoses.push(
    visitorCount < 5
      ? {
          key: "catalog",
          title: "Primeira impressão",
          status: "no_data",
          headline: "Poucas visitas para avaliar a vitrine.",
          evidence: [],
        }
      : {
          key: "catalog",
          title: "Primeira impressão",
          status: catalogAlert ? "alert" : "ok",
          headline: catalogAlert
            ? "Muita gente sai sem abrir nenhum produto — a vitrine não está prendendo."
            : "A maioria entra e abre algum produto.",
          evidence: [
            ev(
              `${formatPct(leftWithoutProduct)} saíram sem ver nenhum produto (alerta a partir de 50%)`,
              manyLeaveEarly,
            ),
            ev(
              `${formatPct(sfwRate)} escolheram o catálogo sem produtos adultos (alerta a partir de 20%)`,
              manySfw,
            ),
          ],
        },
  );

  return {
    periodDays,
    days,
    hasEvents: events.length > 0,
    smallSample,
    kpis: {
      visitors: visitorCount,
      visitorsPerDay,
      sessions: sessions.size,
      orders: orderCount,
      conversion: pct(buyers.length, visitorCount),
      avgTicketCents:
        orderCount > 0 ? Math.round(orderTotalCents / orderCount) : null,
    },
    funnel,
    dotPlot: { rows: dotRows, totalVisitors: visitorCount },
    retention: {
      returning,
      boughtFirstDay,
      boughtAfterReturning,
      buyers: buyers.length,
    },
    sources,
    products,
    diagnoses,
  };
}
