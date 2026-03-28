"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/auth/admin";
import { stockEntrySchema, stockAdjustmentSchema } from "@/lib/schemas/inventory";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createStockEntry(input: unknown): Promise<ActionResult> {
  await requireAdminContext({ write: true });

  const parsed = stockEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors.join(", ") ||
        "Dados inválidos para entrada de estoque",
    };
  }

  const unitCost = Number(
    (parsed.data.invoiceTotal / parsed.data.quantity).toFixed(2),
  );

  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("inventory_movements").insert({
    product_id: parsed.data.productId,
    type: "ENTRY" as const,
    quantity: parsed.data.quantity,
    invoice_total: parsed.data.invoiceTotal,
    unit_cost: unitCost,
    notes: parsed.data.notes?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function createStockAdjustment(
  input: unknown,
): Promise<ActionResult> {
  await requireAdminContext({ write: true });

  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors.join(", ") ||
        "Dados inválidos para ajuste de estoque",
    };
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("inventory_movements").insert({
    product_id: parsed.data.productId,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export type InventoryMovement = {
  id: string;
  product_id: string;
  product_name: string;
  type: "ENTRY" | "EXIT" | "SALE" | "ADJUSTMENT";
  quantity: number;
  invoice_total: number | null;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
};

export async function getInventoryMovements(
  productId?: string,
  limit = 50,
): Promise<{ ok: true; data: InventoryMovement[] } | { ok: false; error: string }> {
  await requireAdminContext();

  const supabase = createServiceRoleClient();

  let query = supabase
    .from("inventory_movements")
    .select("id,product_id,type,quantity,invoice_total,unit_cost,notes,created_at,products(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: error.message };
  }

  const movements: InventoryMovement[] = (data ?? []).map((row: Record<string, unknown>) => {
    const product = row.products as { name: string } | { name: string }[] | null;
    const productName = Array.isArray(product) ? product[0]?.name : product?.name;
    return {
      id: row.id as string,
      product_id: row.product_id as string,
      product_name: productName ?? "Produto desconhecido",
      type: row.type as InventoryMovement["type"],
      quantity: Number(row.quantity),
      invoice_total: row.invoice_total != null ? Number(row.invoice_total) : null,
      unit_cost: row.unit_cost != null ? Number(row.unit_cost) : null,
      notes: row.notes as string | null,
      created_at: row.created_at as string,
    };
  });

  return { ok: true, data: movements };
}

export type ProductCostSummary = {
  product_id: string;
  product_name: string;
  product_price: number;
  stock_quantity: number;
  total_entries: number;
  total_units_entered: number;
  total_invested: number;
  weighted_avg_cost: number;
  profit_margin_pct: number;
};

export type DashboardMetrics = {
  avgTicket: number;
  totalRevenue: number;
  totalOrders: number;
  totalCostInvested: number;
  avgProfitMarginPct: number;
  productRankBySales: Array<{
    product_id: string;
    product_name: string;
    total_sold: number;
    total_revenue: number;
  }>;
  productRankByProfit: Array<{
    product_id: string;
    product_name: string;
    profit_margin_pct: number;
    total_profit: number;
    weighted_avg_cost: number;
    sell_price: number;
  }>;
  costSummaries: ProductCostSummary[];
};

export async function getDashboardMetrics(): Promise<
  { ok: true; data: DashboardMetrics } | { ok: false; error: string }
> {
  await requireAdminContext();

  const supabase = createServiceRoleClient();

  // 1. Completed orders for avg ticket & total revenue
  const { data: completedOrders, error: ordersError } = await supabase
    .from("orders")
    .select("id,total_amount")
    .in("status", ["COMPLETED", "PAID", "PREPARING", "READY_FOR_PICKUP"]);

  if (ordersError) {
    return { ok: false, error: ordersError.message };
  }

  const totalOrders = completedOrders?.length ?? 0;
  const totalRevenue = (completedOrders ?? []).reduce(
    (sum, o) => sum + Number(o.total_amount),
    0,
  );
  const avgTicket = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;

  // 2. Sales ranking from order_items
  const { data: salesData, error: salesError } = await supabase
    .from("order_items")
    .select("product_id,quantity,unit_price,products(name)");

  if (salesError) {
    return { ok: false, error: salesError.message };
  }

  const salesByProduct = new Map<
    string,
    { name: string; totalSold: number; totalRevenue: number }
  >();

  for (const item of salesData ?? []) {
    const prod = item.products as unknown;
    const productData = Array.isArray(prod) ? prod[0] : prod;
    const name = (productData as { name?: string } | null)?.name ?? "?";
    const existing = salesByProduct.get(item.product_id) ?? {
      name,
      totalSold: 0,
      totalRevenue: 0,
    };
    existing.totalSold += item.quantity;
    existing.totalRevenue += Number(item.unit_price) * item.quantity;
    salesByProduct.set(item.product_id, existing);
  }

  const productRankBySales = Array.from(salesByProduct.entries())
    .map(([id, data]) => ({
      product_id: id,
      product_name: data.name,
      total_sold: data.totalSold,
      total_revenue: Number(data.totalRevenue.toFixed(2)),
    }))
    .sort((a, b) => b.total_sold - a.total_sold)
    .slice(0, 10);

  // 3. Cost data from inventory_movements (ENTRY type)
  const { data: costData, error: costError } = await supabase
    .from("inventory_movements")
    .select("product_id,quantity,invoice_total,products(name,price,stock_quantity)")
    .eq("type", "ENTRY");

  if (costError) {
    return { ok: false, error: costError.message };
  }

  const costByProduct = new Map<
    string,
    {
      name: string;
      price: number;
      stock_quantity: number;
      totalEntries: number;
      totalUnits: number;
      totalInvested: number;
    }
  >();

  for (const row of costData ?? []) {
    const prod = row.products as unknown;
    const productData = Array.isArray(prod) ? prod[0] : prod;
    const pName = (productData as { name?: string } | null)?.name ?? "?";
    const pPrice = Number((productData as { price?: number } | null)?.price ?? 0);
    const pStockQty = (productData as { stock_quantity?: number } | null)?.stock_quantity ?? 0;
    const existing = costByProduct.get(row.product_id) ?? {
      name: pName,
      price: pPrice,
      stock_quantity: pStockQty,
      totalEntries: 0,
      totalUnits: 0,
      totalInvested: 0,
    };
    existing.totalEntries += 1;
    existing.totalUnits += row.quantity;
    existing.totalInvested += Number(row.invoice_total ?? 0);
    costByProduct.set(row.product_id, existing);
  }

  const costSummaries: ProductCostSummary[] = Array.from(
    costByProduct.entries(),
  ).map(([id, d]) => {
    const avgCost = d.totalUnits > 0 ? d.totalInvested / d.totalUnits : 0;
    const marginPct =
      d.price > 0 ? Number((((d.price - avgCost) / d.price) * 100).toFixed(1)) : 0;
    return {
      product_id: id,
      product_name: d.name,
      product_price: d.price,
      stock_quantity: d.stock_quantity,
      total_entries: d.totalEntries,
      total_units_entered: d.totalUnits,
      total_invested: Number(d.totalInvested.toFixed(2)),
      weighted_avg_cost: Number(avgCost.toFixed(2)),
      profit_margin_pct: marginPct,
    };
  });

  const totalCostInvested = costSummaries.reduce(
    (sum, c) => sum + c.total_invested,
    0,
  );

  const marginsWithData = costSummaries.filter((c) => c.profit_margin_pct > 0);
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
  const productRankByProfit = Array.from(costByProduct.entries())
    .map(([id, d]) => {
      const avgCost = d.totalUnits > 0 ? d.totalInvested / d.totalUnits : 0;
      const marginPct =
        d.price > 0 ? ((d.price - avgCost) / d.price) * 100 : 0;
      const sales = salesByProduct.get(id);
      const totalProfit = sales
        ? (d.price - avgCost) * sales.totalSold
        : 0;
      return {
        product_id: id,
        product_name: d.name,
        profit_margin_pct: Number(marginPct.toFixed(1)),
        total_profit: Number(totalProfit.toFixed(2)),
        weighted_avg_cost: Number(avgCost.toFixed(2)),
        sell_price: d.price,
      };
    })
    .sort((a, b) => b.total_profit - a.total_profit)
    .slice(0, 10);

  return {
    ok: true,
    data: {
      avgTicket,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      totalCostInvested: Number(totalCostInvested.toFixed(2)),
      avgProfitMarginPct,
      productRankBySales,
      productRankByProfit,
      costSummaries,
    },
  };
}
