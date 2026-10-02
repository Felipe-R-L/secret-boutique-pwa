import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDashed, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOT_PLOT_MAX_VISITORS,
  FUNNEL_STAGES,
  SMALL_SAMPLE_VISITORS,
  type AnalyticsReport,
  type Diagnosis,
} from "@/lib/analytics/report";
import { TRAFFIC_SOURCE_LABELS } from "@/lib/analytics/events";
import { DotPlot } from "./dot-plot";
import { VizTheme, stageColor } from "./viz-theme";

const PERIODS = [7, 14, 30];

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function percent(value: number | null) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0).replace(".", ",")}%`;
}

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border border-border bg-card p-4 md:p-5",
        className,
      )}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

const DIAGNOSIS_STATUS = {
  alert: {
    icon: AlertTriangle,
    label: "Atenção",
    iconClass: "text-[#c98500]",
    border: "border-[#fab219]/60",
  },
  ok: {
    icon: CheckCircle2,
    label: "Sem sinal de problema",
    iconClass: "text-[#0ca30c]",
    border: "border-border",
  },
  no_data: {
    icon: CircleDashed,
    label: "Dados insuficientes",
    iconClass: "text-muted-foreground",
    border: "border-dashed border-border",
  },
} as const;

function DiagnosisCard({ diagnosis }: { diagnosis: Diagnosis }) {
  const status = DIAGNOSIS_STATUS[diagnosis.status];
  const Icon = status.icon;
  return (
    <article
      className={cn("space-y-2 rounded-xl border bg-card p-4", status.border)}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{diagnosis.title}</h4>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon className={cn("size-4", status.iconClass)} aria-hidden />
          {status.label}
        </span>
      </div>
      <p className="text-sm">{diagnosis.headline}</p>
      {diagnosis.evidence.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {diagnosis.evidence.map((item) => (
            <li
              key={item.text}
              className={cn(
                "flex gap-1.5",
                item.triggered && "font-medium text-foreground",
              )}
            >
              {item.triggered ? (
                <AlertTriangle
                  className="mt-0.5 size-3 shrink-0 text-[#c98500]"
                  aria-label="Disparou o alerta"
                />
              ) : (
                <span aria-hidden>•</span>
              )}
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function AnalyticsDashboard({ report }: { report: AnalyticsReport }) {
  const { kpis, funnel, retention } = report;
  const top = funnel[0]?.visitors ?? 0;

  return (
    <div className="viz-root space-y-6">
      <VizTheme />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Métricas da loja</h2>
          <p className="text-sm text-muted-foreground">
            Visitas anônimas e onde as pessoas desistem da compra.
          </p>
        </div>
        <nav
          aria-label="Período"
          className="flex gap-1 rounded-full bg-muted p-1 text-sm"
        >
          {PERIODS.map((days) => (
            <Link
              key={days}
              href={`/admin/analytics?dias=${days}`}
              aria-current={report.periodDays === days ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                report.periodDays === days
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {days} dias
            </Link>
          ))}
        </nav>
      </div>

      {!report.hasEvents ? (
        <div className="space-y-2 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">Ainda não há visitas registradas</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            As métricas começam a aparecer depois que esta versão estiver no ar
            e os primeiros clientes abrirem a loja. Volte em alguns dias.
          </p>
        </div>
      ) : (
        <>
          {report.smallSample && (
            <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Só {kpis.visitors} visitantes no período (menos de{" "}
              {SMALL_SAMPLE_VISITORS}). Trate as conclusões abaixo como pistas,
              não como certeza.
            </p>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              {
                label: "Visitantes",
                value: kpis.visitors.toLocaleString("pt-BR"),
                detail: `${kpis.visitorsPerDay.toFixed(1).replace(".", ",")} por dia`,
              },
              {
                label: "Visitas",
                value: kpis.sessions.toLocaleString("pt-BR"),
                detail: "dias distintos por visitante",
              },
              {
                label: "Pedidos",
                value: kpis.orders.toLocaleString("pt-BR"),
                detail: "não cancelados, no período",
              },
              {
                label: "Conversão",
                value: percent(kpis.conversion),
                detail: "visitantes que fizeram pedido",
              },
              {
                label: "Ticket médio",
                value: kpis.avgTicket === null ? "—" : brl(kpis.avgTicket),
                detail: "valor médio por pedido",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="space-y-1 rounded-xl border border-border bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground">{kpi.detail}</p>
              </div>
            ))}
          </div>

          {/* Diagnóstico */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Diagnóstico</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {report.diagnoses.map((diagnosis) => (
                <DiagnosisCard key={diagnosis.key} diagnosis={diagnosis} />
              ))}
            </div>
          </div>

          {/* Dot plot */}
          <Section
            title="Cada visitante, dia a dia"
            description={`Cada linha é uma pessoa (anônima), da chegada mais recente no topo; cada coluna é um dia. O ponto mostra que ela esteve na loja naquele dia, e a cor, até onde chegou na compra. Linhas com vários pontos são clientes que voltam.${
              report.dotPlot.totalVisitors > DOT_PLOT_MAX_VISITORS
                ? ` Mostrando os ${DOT_PLOT_MAX_VISITORS} mais recentes de ${report.dotPlot.totalVisitors}.`
                : ""
            }`}
          >
            <DotPlot
              days={report.days}
              stageLabels={FUNNEL_STAGES.map((s) => s.label)}
              rows={report.dotPlot.rows.map((row) => ({
                visitorId: row.visitorId,
                sourceLabel: TRAFFIC_SOURCE_LABELS[row.source],
                days: row.days,
              }))}
            />
            <ul className="grid gap-2 text-sm sm:grid-cols-3">
              <li className="rounded-lg bg-muted/50 p-3">
                <span className="block text-lg font-semibold tabular-nums">
                  {retention.returning}
                </span>
                <span className="text-muted-foreground">
                  voltaram em mais de um dia (
                  {percent(
                    kpis.visitors > 0
                      ? retention.returning / kpis.visitors
                      : null,
                  )}
                  )
                </span>
              </li>
              <li className="rounded-lg bg-muted/50 p-3">
                <span className="block text-lg font-semibold tabular-nums">
                  {retention.boughtFirstDay}
                </span>
                <span className="text-muted-foreground">
                  compraram no primeiro dia de visita
                </span>
              </li>
              <li className="rounded-lg bg-muted/50 p-3">
                <span className="block text-lg font-semibold tabular-nums">
                  {retention.boughtAfterReturning}
                </span>
                <span className="text-muted-foreground">
                  compraram só depois de voltar
                </span>
              </li>
            </ul>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Funil */}
            <Section
              title="Funil de compra"
              description="Quantos visitantes chegaram a cada etapa, e quantos pararam nela."
            >
              <ol className="space-y-3">
                {funnel.map((step, i) => {
                  const share = top > 0 ? step.visitors / top : 0;
                  const next = funnel[i + 1];
                  const lost = next ? step.visitors - next.visitors : null;
                  return (
                    <li key={step.label} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span>{step.label}</span>
                        <span className="tabular-nums">
                          {step.visitors}{" "}
                          <span className="text-muted-foreground">
                            ({percent(top > 0 ? share : null)})
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(share * 100, step.visitors > 0 ? 1.5 : 0)}%`,
                            background: stageColor(i),
                          }}
                        />
                      </div>
                      {lost !== null && lost > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {lost} pararam aqui
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Section>

            {/* Origem */}
            <Section
              title="De onde vêm os visitantes"
              description="Origem da primeira visita e quantos dessa origem compraram."
            >
              {report.sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                <ul className="space-y-3">
                  {report.sources.map((source) => {
                    const share =
                      kpis.visitors > 0 ? source.visitors / kpis.visitors : 0;
                    return (
                      <li key={source.source} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span>{source.label}</span>
                          <span className="tabular-nums">
                            {source.visitors}{" "}
                            <span className="text-muted-foreground">
                              · {source.buyers} compraram (
                              {percent(
                                source.visitors > 0
                                  ? source.buyers / source.visitors
                                  : null,
                              )}
                              )
                            </span>
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(share * 100, 1.5)}%`,
                              background: "var(--viz-bar)",
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>

          {/* Produtos */}
          <Section
            title="Produtos: interesse x carrinho"
            description="Produto muito visto e pouco adicionado costuma indicar preço alto, foto fraca ou descrição que não convence."
          >
            {report.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguém abriu produtos no período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Produto</th>
                      <th className="py-2 pr-3 text-right font-medium">
                        Preço
                      </th>
                      <th className="py-2 pr-3 text-right font-medium">
                        Viram
                      </th>
                      <th className="py-2 pr-3 text-right font-medium">
                        Adicionaram
                      </th>
                      <th className="py-2 text-right font-medium">Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.products.slice(0, 15).map((product) => {
                      const rate =
                        product.viewers > 0
                          ? product.adders / product.viewers
                          : null;
                      const weak =
                        product.viewers >= 10 && rate !== null && rate < 0.05;
                      return (
                        <tr
                          key={product.productId}
                          className="border-t border-border"
                        >
                          <td className="py-2 pr-3">
                            <span className="block">{product.name}</span>
                            {weak && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <AlertTriangle
                                  className="size-3 text-[#c98500]"
                                  aria-hidden
                                />
                                muito visto, pouco adicionado
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {product.price === null ? "—" : brl(product.price)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {product.viewers}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {product.adders}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {percent(rate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
