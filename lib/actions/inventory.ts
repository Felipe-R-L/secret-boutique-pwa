'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext } from '@/lib/auth/admin';
import { logAudit } from '@/lib/audit/log';
import {
  stockEntrySchema,
  stockAdjustmentSchema,
} from '@/lib/schemas/inventory';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { applyVariantStockDelta } from '@/lib/server/product-variants';

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createStockEntry(input: unknown): Promise<ActionResult> {
  const context = await requireAdminContext({ write: true });

  const parsed = stockEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors.join(', ') ||
        'Dados inválidos para entrada de estoque',
    };
  }

  // Custo unitário em centavos, arredondado para o centavo mais próximo.
  const unitCostCents = Math.round(
    parsed.data.invoiceTotalCents / parsed.data.quantity,
  );

  const supabase = createServiceRoleClient();

  const { error } = await supabase.from('inventory_movements').insert({
    product_id: parsed.data.productId,
    type: 'ENTRY' as const,
    quantity: parsed.data.quantity,
    invoice_total_cents: parsed.data.invoiceTotalCents,
    unit_cost_cents: unitCostCents,
    notes: parsed.data.notes?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit(
    {
      action: 'inventory.entry',
      category: 'inventory',
      targetType: 'product',
      targetId: parsed.data.productId,
      metadata: {
        quantity: parsed.data.quantity,
        invoiceTotalCents: parsed.data.invoiceTotalCents,
        unitCostCents,
      },
    },
    context,
  );

  revalidatePath('/');
  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products');
  revalidatePath('/admin/dashboard');
  return { ok: true };
}

export async function createStockAdjustment(
  input: unknown,
): Promise<ActionResult> {
  const context = await requireAdminContext({ write: true });

  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors.join(', ') ||
        'Dados inválidos para ajuste de estoque',
    };
  }

  const supabase = createServiceRoleClient();

  const { productId, type, quantity, variantId, variantLabel } = parsed.data;

  const { error } = await supabase.from('inventory_movements').insert({
    product_id: productId,
    type,
    quantity,
    variant_id: variantId ?? null,
    variant_label: variantId ? variantLabel?.trim() || null : null,
    notes: parsed.data.notes?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // When the movement targets a specific variant, the DB trigger skips the
  // aggregate update — we own the JSONB variant math here and recompute the
  // product's aggregate stock. ENTRY/ADJUSTMENT add stock, EXIT removes it.
  if (variantId) {
    const delta = type === 'EXIT' ? -quantity : quantity;
    try {
      await applyVariantStockDelta(supabase, productId, variantId, delta);
    } catch (variantError) {
      return {
        ok: false,
        error:
          variantError instanceof Error
            ? variantError.message
            : 'Falha ao atualizar o estoque da variante.',
      };
    }
  }

  await logAudit(
    {
      action: 'inventory.adjustment',
      category: 'inventory',
      targetType: 'product',
      targetId: productId,
      metadata: {
        type,
        quantity,
        ...(variantId ? { variantId, variantLabel } : {}),
      },
    },
    context,
  );

  revalidatePath('/');
  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products');
  revalidatePath('/admin/dashboard');
  return { ok: true };
}

export type InventoryMovement = {
  id: string;
  product_id: string;
  product_name: string;
  variant_label: string | null;
  type: 'ENTRY' | 'EXIT' | 'SALE' | 'ADJUSTMENT';
  quantity: number;
  invoice_total_cents: number | null;
  unit_cost_cents: number | null;
  notes: string | null;
  created_at: string;
};

export async function getInventoryMovements(
  productId?: string,
  limit = 50,
): Promise<
  { ok: true; data: InventoryMovement[] } | { ok: false; error: string }
> {
  await requireAdminContext({ adminOnly: true });

  const supabase = createServiceRoleClient();

  let query = supabase
    .from('inventory_movements')
    .select(
      'id,product_id,type,quantity,invoice_total_cents,unit_cost_cents,notes,created_at,variant_label,products(name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: error.message };
  }

  const movements: InventoryMovement[] = (data ?? []).map(
    (row: Record<string, unknown>) => {
      const product = row.products as
        | { name: string }
        | { name: string }[]
        | null;
      const productName = Array.isArray(product)
        ? product[0]?.name
        : product?.name;
      return {
        id: row.id as string,
        product_id: row.product_id as string,
        product_name: productName ?? 'Produto desconhecido',
        variant_label: (row.variant_label as string | null) ?? null,
        type: row.type as InventoryMovement['type'],
        quantity: Number(row.quantity),
        invoice_total_cents:
          row.invoice_total_cents != null
            ? Number(row.invoice_total_cents)
            : null,
        unit_cost_cents:
          row.unit_cost_cents != null ? Number(row.unit_cost_cents) : null,
        notes: row.notes as string | null,
        created_at: row.created_at as string,
      };
    },
  );

  return { ok: true, data: movements };
}

/** Custo médio ponderado por unidade, em centavos. */
function averageCostCents(totalInvestedCents: number, totalUnits: number) {
  return totalUnits > 0 ? Math.round(totalInvestedCents / totalUnits) : 0;
}

/** Margem sobre o preço de venda, em % com uma casa decimal. */
function marginPct(priceCents: number, costCents: number) {
  if (priceCents <= 0) return 0;
  return Math.round(((priceCents - costCents) * 1000) / priceCents) / 10;
}

export type ProductCostSummary = {
  product_id: string;
  product_name: string;
  product_price_cents: number;
  stock_quantity: number;
  total_entries: number;
  total_units_entered: number;
  total_invested_cents: number;
  weighted_avg_cost_cents: number;
  profit_margin_pct: number;
};

// Valores monetários em centavos; percentuais em %.
export type DashboardMetrics = {
  avgTicketCents: number;
  totalRevenueCents: number;
  totalProfitCents: number;
  totalOrders: number;
  totalCostInvestedCents: number;
  avgProfitMarginPct: number;
  projectedInventoryRevenueCents: number;
  projectedInventoryProfitCents: number;
  productRankBySales: Array<{
    product_id: string;
    product_name: string;
    total_sold: number;
    total_revenue_cents: number;
  }>;
  productRankByProfit: Array<{
    product_id: string;
    product_name: string;
    profit_margin_pct: number;
    total_profit_cents: number;
    weighted_avg_cost_cents: number;
    sell_price_cents: number;
  }>;
  costSummaries: ProductCostSummary[];
};

export async function getDashboardMetrics(): Promise<
  { ok: true; data: DashboardMetrics } | { ok: false; error: string }
> {
  await requireAdminContext({ adminOnly: true });

  const supabase = createServiceRoleClient();

  // 1. Completed orders for avg ticket & total revenue
  const { data: completedOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id,total_cents')
    .in('status', ['COMPLETED', 'PAID', 'PREPARING', 'READY_FOR_PICKUP']);

  if (ordersError) {
    return { ok: false, error: ordersError.message };
  }

  const totalOrders = completedOrders?.length ?? 0;
  const totalRevenueCents = (completedOrders ?? []).reduce(
    (sum, o) => sum + o.total_cents,
    0,
  );
  const avgTicketCents =
    totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

  // 2. Sales ranking from order_items
  const { data: salesData, error: salesError } = await supabase
    .from('order_items')
    .select('product_id,quantity,unit_price_cents,products(name)');

  if (salesError) {
    return { ok: false, error: salesError.message };
  }

  const salesByProduct = new Map<
    string,
    { name: string; totalSold: number; totalRevenueCents: number }
  >();

  for (const item of salesData ?? []) {
    const prod = item.products as unknown;
    const productData = Array.isArray(prod) ? prod[0] : prod;
    const name = (productData as { name?: string } | null)?.name ?? '?';
    const existing = salesByProduct.get(item.product_id) ?? {
      name,
      totalSold: 0,
      totalRevenueCents: 0,
    };
    existing.totalSold += item.quantity;
    existing.totalRevenueCents += item.unit_price_cents * item.quantity;
    salesByProduct.set(item.product_id, existing);
  }

  const productRankBySales = Array.from(salesByProduct.entries())
    .map(([id, data]) => ({
      product_id: id,
      product_name: data.name,
      total_sold: data.totalSold,
      total_revenue_cents: data.totalRevenueCents,
    }))
    .sort((a, b) => b.total_sold - a.total_sold)
    .slice(0, 10);

  // 3. Cost data from inventory_movements (ENTRY type)
  const { data: costData, error: costError } = await supabase
    .from('inventory_movements')
    .select(
      'product_id,quantity,invoice_total_cents,products(name,price_cents,stock_quantity)',
    )
    .eq('type', 'ENTRY');

  if (costError) {
    return { ok: false, error: costError.message };
  }

  const costByProduct = new Map<
    string,
    {
      name: string;
      priceCents: number;
      stock_quantity: number;
      totalEntries: number;
      totalUnits: number;
      totalInvestedCents: number;
    }
  >();

  for (const row of costData ?? []) {
    const prod = row.products as unknown;
    const productData = Array.isArray(prod) ? prod[0] : prod;
    const pName = (productData as { name?: string } | null)?.name ?? '?';
    const pPriceCents =
      (productData as { price_cents?: number } | null)?.price_cents ?? 0;
    const pStockQty =
      (productData as { stock_quantity?: number } | null)?.stock_quantity ?? 0;
    const existing = costByProduct.get(row.product_id) ?? {
      name: pName,
      priceCents: pPriceCents,
      stock_quantity: pStockQty,
      totalEntries: 0,
      totalUnits: 0,
      totalInvestedCents: 0,
    };
    existing.totalEntries += 1;
    existing.totalUnits += row.quantity;
    existing.totalInvestedCents += Number(row.invoice_total_cents ?? 0);
    costByProduct.set(row.product_id, existing);
  }

  const costSummaries: ProductCostSummary[] = Array.from(
    costByProduct.entries(),
  )
    .map(([id, d]) => {
      const avgCostCents = averageCostCents(d.totalInvestedCents, d.totalUnits);
      return {
        product_id: id,
        product_name: d.name,
        product_price_cents: d.priceCents,
        stock_quantity: d.stock_quantity,
        total_entries: d.totalEntries,
        total_units_entered: d.totalUnits,
        total_invested_cents: d.totalInvestedCents,
        weighted_avg_cost_cents: avgCostCents,
        profit_margin_pct: marginPct(d.priceCents, avgCostCents),
      };
    })
    .sort((a, b) => {
      if (b.profit_margin_pct !== a.profit_margin_pct) {
        return b.profit_margin_pct - a.profit_margin_pct;
      }

      const profitA =
        (a.product_price_cents - a.weighted_avg_cost_cents) * a.stock_quantity;
      const profitB =
        (b.product_price_cents - b.weighted_avg_cost_cents) * b.stock_quantity;
      if (profitB !== profitA) {
        return profitB - profitA;
      }

      return a.product_name.localeCompare(b.product_name, 'pt-BR');
    });

  const totalCostInvestedCents = costSummaries.reduce(
    (sum, c) => sum + c.total_invested_cents,
    0,
  );

  const projectedInventoryRevenueCents = costSummaries.reduce(
    (sum, item) => sum + item.product_price_cents * item.stock_quantity,
    0,
  );

  const projectedInventoryProfitCents = costSummaries.reduce(
    (sum, item) =>
      sum +
      (item.product_price_cents - item.weighted_avg_cost_cents) *
        item.stock_quantity,
    0,
  );

  const marginsWithData = costSummaries.filter(c => c.profit_margin_pct > 0);
  const avgProfitMarginPct =
    marginsWithData.length > 0
      ? Number(
          (
            marginsWithData.reduce((sum, c) => sum + c.profit_margin_pct, 0) /
            marginsWithData.length
          ).toFixed(1),
        )
      : 0;

  // 4. Profit ranking: combine sales data with cost data
  const productProfitRows = Array.from(costByProduct.entries()).map(
    ([id, d]) => {
      const avgCostCents = averageCostCents(d.totalInvestedCents, d.totalUnits);
      const sales = salesByProduct.get(id);
      const totalProfitCents = sales
        ? sales.totalRevenueCents - avgCostCents * sales.totalSold
        : 0;
      return {
        product_id: id,
        product_name: d.name,
        profit_margin_pct: marginPct(d.priceCents, avgCostCents),
        total_profit_cents: totalProfitCents,
        weighted_avg_cost_cents: avgCostCents,
        sell_price_cents: d.priceCents,
      };
    },
  );

  const totalProfitCents = productProfitRows.reduce(
    (sum, item) => sum + item.total_profit_cents,
    0,
  );

  const productRankByProfit = productProfitRows
    .sort((a, b) => {
      if (b.profit_margin_pct !== a.profit_margin_pct) {
        return b.profit_margin_pct - a.profit_margin_pct;
      }

      if (b.total_profit_cents !== a.total_profit_cents) {
        return b.total_profit_cents - a.total_profit_cents;
      }

      return a.product_name.localeCompare(b.product_name, 'pt-BR');
    })
    .slice(0, 10);

  return {
    ok: true,
    data: {
      avgTicketCents,
      totalRevenueCents,
      totalProfitCents,
      totalOrders,
      totalCostInvestedCents,
      avgProfitMarginPct,
      projectedInventoryRevenueCents,
      projectedInventoryProfitCents,
      productRankBySales,
      productRankByProfit,
      costSummaries,
    },
  };
}
