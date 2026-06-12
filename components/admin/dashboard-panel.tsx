'use client';

import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  Trophy,
  BarChart3,
} from 'lucide-react';
import type { DashboardMetrics } from '@/lib/actions/inventory';

interface DashboardPanelProps {
  metrics: DashboardMetrics;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function DashboardPanel({ metrics }: DashboardPanelProps) {
  const kpiCards = [
    {
      title: 'Ticket Médio',
      value: formatCurrency(metrics.avgTicket),
      detail: `${metrics.totalOrders} pedido${metrics.totalOrders !== 1 ? 's' : ''} processado${metrics.totalOrders !== 1 ? 's' : ''}`,
      icon: ShoppingCart,
      cardClassName:
        'rounded-xl border border-border bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 space-y-2',
      accentClassName: 'text-blue-600',
      valueClassName: 'text-blue-900',
      detailClassName: 'text-blue-600/70',
    },
    {
      title: 'Faturamento Total',
      value: formatCurrency(metrics.totalRevenue),
      detail: 'Pedidos pagos, em preparo e prontos para retirada',
      icon: DollarSign,
      cardClassName:
        'rounded-xl border border-border bg-gradient-to-br from-green-50 to-green-100/50 p-5 space-y-2',
      accentClassName: 'text-green-600',
      valueClassName: 'text-green-900',
      detailClassName: 'text-green-600/70',
    },
    {
      title: 'Lucro Total',
      value: formatCurrency(metrics.totalProfit),
      detail: 'Estimado com base nos custos médios cadastrados',
      icon: TrendingUp,
      cardClassName:
        'rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 space-y-2',
      accentClassName: 'text-emerald-600',
      valueClassName: 'text-emerald-900',
      detailClassName: 'text-emerald-600/70',
    },
    {
      title: 'Faturamento do Estoque',
      value: formatCurrency(metrics.projectedInventoryRevenue),
      detail: 'Venda potencial do estoque atual pelo preco de tabela',
      icon: DollarSign,
      cardClassName:
        'rounded-xl border border-border bg-gradient-to-br from-cyan-50 to-cyan-100/50 p-5 space-y-2',
      accentClassName: 'text-cyan-600',
      valueClassName: 'text-cyan-900',
      detailClassName: 'text-cyan-600/70',
    },
    {
      title: 'Lucro do Estoque',
      value: formatCurrency(metrics.projectedInventoryProfit),
      detail: 'Lucro potencial do estoque atual pelo custo medio',
      icon: BarChart3,
      cardClassName:
        'rounded-xl border border-border bg-gradient-to-br from-teal-50 to-teal-100/50 p-5 space-y-2',
      accentClassName: 'text-teal-600',
      valueClassName: 'text-teal-900',
      detailClassName: 'text-teal-600/70',
    },
    {
      title: 'Margem Média',
      value: `${metrics.avgProfitMarginPct}%`,
      detail: 'Margem de lucro média entre produtos com custo',
      icon: Percent,
      cardClassName:
        'rounded-xl border border-border bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 space-y-2',
      accentClassName: 'text-purple-600',
      valueClassName: 'text-purple-900',
      detailClassName: 'text-purple-600/70',
    },
    {
      title: 'Total Investido',
      value: formatCurrency(metrics.totalCostInvested),
      detail: 'Entradas de estoque registradas para revenda',
      icon: TrendingUp,
      cardClassName:
        'rounded-xl border border-border bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 space-y-2',
      accentClassName: 'text-amber-600',
      valueClassName: 'text-amber-900',
      detailClassName: 'text-amber-600/70',
    },
  ] as const;

  return (
    <div className='space-y-8'>
      {/* KPI Cards */}
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {kpiCards.map(card => {
          const Icon = card.icon;

          return (
            <div key={card.title} className={card.cardClassName}>
              <div
                className={`flex items-center gap-2 ${card.accentClassName}`}
              >
                <Icon className='size-5' />
                <span className='text-xs font-medium uppercase tracking-wide'>
                  {card.title}
                </span>
              </div>
              <p className={`text-2xl font-bold ${card.valueClassName}`}>
                {card.value}
              </p>
              <p className={`text-xs ${card.detailClassName}`}>{card.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Rankings */}
      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Most Sold */}
        <section className='rounded-xl border border-border p-5 space-y-4'>
          <div className='flex items-center gap-2'>
            <Trophy className='size-5 text-amber-500' />
            <h3 className='text-base font-semibold'>Mais Vendidos</h3>
          </div>

          {metrics.productRankBySales.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Nenhuma venda registrada ainda.
            </p>
          ) : (
            <div className='space-y-2'>
              {metrics.productRankBySales.map((item, index) => (
                <div
                  key={item.product_id}
                  className='flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5'
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : index === 1
                          ? 'bg-gray-200 text-gray-600'
                          : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>
                      {item.product_name}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {item.total_sold} vendido
                      {item.total_sold !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className='text-sm font-semibold tabular-nums'>
                    {formatCurrency(item.total_revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Most Profitable */}
        <section className='rounded-xl border border-border p-5 space-y-4'>
          <div className='flex items-center gap-2'>
            <BarChart3 className='size-5 text-green-500' />
            <h3 className='text-base font-semibold'>Mais Lucrativos</h3>
          </div>
          <p className='text-xs text-muted-foreground'>
            Ordenado por margem de lucro, com desempate por lucro realizado.
          </p>

          {metrics.productRankByProfit.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Cadastre custos para ver a margem de lucro.
            </p>
          ) : (
            <div className='space-y-2'>
              {metrics.productRankByProfit.map((item, index) => (
                <div
                  key={item.product_id}
                  className='flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5'
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0
                        ? 'bg-green-100 text-green-700'
                        : index === 1
                          ? 'bg-emerald-100 text-emerald-600'
                          : index === 2
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>
                      {item.product_name}
                    </p>
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span>
                        Custo: {formatCurrency(item.weighted_avg_cost)}
                      </span>
                      <span>→</span>
                      <span>Venda: {formatCurrency(item.sell_price)}</span>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-semibold text-green-700'>
                      {item.profit_margin_pct}% margem
                    </p>
                    <p className='text-xs tabular-nums text-muted-foreground'>
                      Lucro: {formatCurrency(item.total_profit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Cost per Product Table */}
      {metrics.costSummaries.length > 0 && (
        <section className='space-y-4'>
          <h3 className='text-base font-semibold'>Custo por Produto</h3>
          <div className='overflow-x-auto rounded-xl border border-border'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border bg-muted/50'>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                    Produto
                  </th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                    Preço Venda
                  </th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                    Custo Médio
                  </th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                    Margem
                  </th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                    Estoque
                  </th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                    Total Investido
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.costSummaries.map(item => (
                  <tr
                    key={item.product_id}
                    className='border-b border-border last:border-0'
                  >
                    <td className='px-4 py-3 font-medium'>
                      {item.product_name}
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums'>
                      {formatCurrency(item.product_price)}
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums'>
                      {formatCurrency(item.weighted_avg_cost)}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.profit_margin_pct >= 50
                            ? 'bg-green-100 text-green-700'
                            : item.profit_margin_pct >= 20
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.profit_margin_pct}%
                      </span>
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums'>
                      {item.stock_quantity} un.
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums text-muted-foreground'>
                      {formatCurrency(item.total_invested)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
