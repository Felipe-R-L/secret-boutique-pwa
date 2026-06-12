"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/auth/admin";
import { productMutationSchema } from "@/lib/schemas";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function toUniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );
}

const deleteProductSchema = z
  .object({
    productId: z.string().uuid(),
  })
  .strict();

export async function upsertProduct(input: unknown) {
  await requireAdminContext({ write: true });

  const parsed = productMutationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.flatten().formErrors.join(", ") ||
        "Invalid product payload",
    };
  }

  const specsJson = parsed.data.specs.reduce<Record<string, string>>(
    (acc, item) => {
      acc[item.key] = item.value;
      return acc;
    },
    {},
  );

  const normalizedVariants = parsed.data.variants.map((variant) => ({
    id: variant.id?.trim() || crypto.randomUUID(),
    sku: variant.sku.trim(),
    label: variant.label.trim(),
    price: Number(variant.price),
    stock_quantity: variant.stockQuantity,
    in_stock: variant.inStock && variant.stockQuantity > 0,
    images: toUniqueStrings(variant.images),
    attributes: variant.attributes.map((attribute) => ({
      key: attribute.key.trim(),
      value: attribute.value.trim(),
    })),
    is_default: variant.isDefault,
  }));

  const hasVariants = normalizedVariants.length > 0;
  const aggregateImages = toUniqueStrings([
    ...(parsed.data.imageUrls ?? []),
    ...normalizedVariants.flatMap((variant) => variant.images),
  ]);
  const aggregatePrice = hasVariants
    ? Math.min(...normalizedVariants.map((variant) => variant.price))
    : parsed.data.price;
  const aggregateStockQuantity = hasVariants
    ? normalizedVariants.reduce(
        (total, variant) => total + variant.stock_quantity,
        0,
      )
    : undefined;
  const aggregateInStock = hasVariants
    ? normalizedVariants.some((variant) => variant.in_stock)
    : parsed.data.inStock;

  const supabase = createServiceRoleClient();

  const productPayload = {
    name: parsed.data.name,
    price: aggregatePrice,
    description: parsed.data.description,
    curatorship: parsed.data.curatorship?.trim() || null,
    category: parsed.data.category,
    is_featured: parsed.data.isFeatured,
    is_adult: parsed.data.isAdult,
    in_stock: aggregateInStock,
    specs: specsJson,
    images: aggregateImages,
    image_url:
      (aggregateImages.length > 0
        ? aggregateImages[0]
        : parsed.data.imageUrl) ?? null,
    variants: normalizedVariants,
    ...(typeof aggregateStockQuantity === "number"
      ? { stock_quantity: aggregateStockQuantity }
      : {}),
    updated_at: new Date().toISOString(),
  };

  const mutation = parsed.data.productId
    ? supabase
        .from("products")
        .update(productPayload)
        .eq("id", parsed.data.productId)
    : supabase.from("products").insert(productPayload);

  const { error } = await mutation;

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteProduct(input: unknown) {
  await requireAdminContext({ write: true });

  const parsed = deleteProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten().formErrors.join(", ") || "Invalid payload",
    };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", parsed.data.productId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Bulk CSV import (products + initial stock entry)
// ---------------------------------------------------------------------------

export type DuplicateMode = "skip" | "update" | "allow";

export type ImportOptions = {
  duplicates?: DuplicateMode;
};

export type ImportReport = {
  inserted: number;
  updated: number;
  skipped: number;
  failedCount: number;
  errors: { row: number; name?: string; message: string }[];
  warnings: { row: number; name?: string; message: string }[];
};

// Header aliases (pt-BR + en). First non-empty match wins.
const IMPORT_FIELD_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "produto", "titulo", "título"],
  salePrice: ["preco_venda", "preço_venda", "preco", "preço", "venda", "price"],
  cost: ["custo", "preco_custo", "preço_custo", "cost"],
  description: ["descricao", "descrição", "description", "desc"],
  category: ["categoria", "category"],
  image: ["imagem", "image", "url", "imagem_url", "image_url", "foto"],
  quantity: ["quantidade", "quantity", "qtd", "qty", "estoque"],
  featured: ["destaque", "featured", "is_featured"],
  adult: ["adulto", "adult", "nsfw", "is_adult", "+18", "18+"],
  curatorship: ["curadoria", "curatorship"],
  variant: ["variante", "variacao", "variação", "variant"],
  attribute: ["atributo", "attribute"],
  attrValue: ["valor", "value"],
  sku: ["sku", "cod", "codigo", "código", "ref", "referencia"],
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "produto"
  );
}

function importField(row: Record<string, string>, key: string): string {
  for (const alias of IMPORT_FIELD_ALIASES[key] ?? [key]) {
    const value = row[alias];
    if (value !== undefined && value !== "") return value.trim();
  }
  return "";
}

// Parses pt-BR or en numbers: "1.234,56", "45,90", "45.90", "R$ 12".
function parseLocaleNumber(raw: string): number {
  let s = raw.replace(/r\$/i, "").replace(/\s/g, "").trim();
  if (!s) return NaN;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  return parseFloat(s);
}

function parseBoolish(raw: string): boolean {
  return ["1", "true", "sim", "s", "x", "yes", "y"].includes(
    raw.trim().toLowerCase(),
  );
}

const HTTP_URL = /^https?:\/\//i;

export async function importProducts(
  rows: unknown,
  options?: ImportOptions,
): Promise<ImportReport> {
  await requireAdminContext({ write: true });

  const mode: DuplicateMode = options?.duplicates ?? "skip";

  const report: ImportReport = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failedCount: 0,
    errors: [],
    warnings: [],
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    report.errors.push({ row: 0, message: "Nenhuma linha para importar." });
    return report;
  }

  const supabase = createServiceRoleClient();
  const usedCategories = new Set<string>();

  // Existing product names (lower-cased) → id, for duplicate detection.
  const existingByName = new Map<string, string>();
  const { data: existingRows } = await supabase
    .from("products")
    .select("id, name");
  for (const r of existingRows ?? []) {
    if (r?.name) existingByName.set(String(r.name).trim().toLowerCase(), r.id);
  }

  // Group rows by product name so flavor/color variants of the same item
  // collapse into a single product with multiple variants.
  type IndexedRow = { record: Record<string, string>; rowNum: number };
  const groups = new Map<string, IndexedRow[]>();
  const groupOrder: string[] = [];

  rows.forEach((raw, i) => {
    const rowNum = i + 2; // +1 header, +1 for 1-based display
    if (!raw || typeof raw !== "object") {
      report.failedCount++;
      report.errors.push({ row: rowNum, message: "Linha inválida." });
      return;
    }
    const record = raw as Record<string, string>;
    const name = importField(record, "name");
    if (!name) {
      report.failedCount++;
      report.errors.push({
        row: rowNum,
        message: "Linha sem nome de produto.",
      });
      return;
    }
    const key = name.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push({ record, rowNum });
  });

  const resolveImage = (record: Record<string, string>): string | undefined => {
    const raw = importField(record, "image");
    return raw && HTTP_URL.test(raw) ? raw : undefined;
  };

  for (const key of groupOrder) {
    const items = groups.get(key)!;
    const first = items[0].record;
    const rowNum = items[0].rowNum;
    const name = importField(first, "name");
    const category = importField(first, "category");
    const description = importField(first, "description");
    const isFeatured = parseBoolish(importField(first, "featured"));
    // Coluna "adulto" opcional no CSV; sem ela, segue o padrão (+18).
    const adultRaw = importField(first, "adult");
    const isAdult = adultRaw === "" ? true : parseBoolish(adultRaw);
    const curatorship = importField(first, "curatorship") || undefined;
    const groupImage = items
      .map((item) => resolveImage(item.record))
      .find(Boolean);

    // Duplicate handling (by product name).
    const existingId = existingByName.get(key);
    if (existingId && mode === "skip") {
      report.skipped++;
      continue;
    }
    const productId = existingId && mode === "update" ? existingId : undefined;

    const hasVariantInfo = items.some(
      (item) =>
        importField(item.record, "variant") ||
        importField(item.record, "sku") ||
        (importField(item.record, "attribute") &&
          importField(item.record, "attrValue")),
    );

    // ----- Variant product: reuse upsertProduct's validated normalization -----
    if (hasVariantInfo) {
      const variants = items.map((item, idx) => {
        const r = item.record;
        const vQty = Math.trunc(parseLocaleNumber(importField(r, "quantity")));
        const qty = Number.isFinite(vQty) && vQty > 0 ? vQty : 0;
        const attrKey = importField(r, "attribute");
        const attrValue = importField(r, "attrValue");
        const vImage = resolveImage(r);
        return {
          sku: importField(r, "sku") || `${slugify(name)}-${idx + 1}`,
          label:
            importField(r, "variant") || attrValue || `Variação ${idx + 1}`,
          price: parseLocaleNumber(importField(r, "salePrice")),
          stockQuantity: qty,
          inStock: qty > 0,
          isDefault: idx === 0,
          images: vImage ? [vImage] : [],
          attributes:
            attrKey && attrValue ? [{ key: attrKey, value: attrValue }] : [],
        };
      });

      const positivePrices = variants
        .map((v) => v.price)
        .filter((p) => Number.isFinite(p) && p > 0);
      const minPrice =
        positivePrices.length > 0 ? Math.min(...positivePrices) : NaN;

      const result = await upsertProduct({
        ...(productId ? { productId } : {}),
        name,
        price: minPrice,
        description,
        category,
        isFeatured,
        isAdult,
        inStock: true,
        ...(curatorship ? { curatorship } : {}),
        ...(groupImage
          ? { imageUrl: groupImage, imageUrls: [groupImage] }
          : {}),
        specs: [],
        variants,
      });

      if (!result.ok) {
        report.failedCount++;
        report.errors.push({
          row: rowNum,
          name,
          message: `Falha ao ${productId ? "atualizar" : "criar"} produto com variantes: ${result.error}`,
        });
        continue;
      }

      if (productId) report.updated++;
      else report.inserted++;
      usedCategories.add(category);
      // Variant stock lives in the variants JSON (no ENTRY → no cost dashboard).
      continue;
    }

    // ----- Simple product: merge duplicate rows (sum quantity) -----
    const salePrice = parseLocaleNumber(importField(first, "salePrice"));
    const unitCost = parseLocaleNumber(importField(first, "cost"));
    const totalQty = items.reduce((sum, item) => {
      const q = Math.trunc(
        parseLocaleNumber(importField(item.record, "quantity")),
      );
      return sum + (Number.isFinite(q) && q > 0 ? q : 0);
    }, 0);

    // Update mode: overwrite the existing product's catalog fields (price,
    // description, category, image, destaque). Stock is left untouched so a
    // re-import never inflates inventory.
    if (productId) {
      const result = await upsertProduct({
        productId,
        name,
        price: salePrice,
        description,
        category,
        isFeatured,
        isAdult,
        inStock: true,
        ...(curatorship ? { curatorship } : {}),
        ...(groupImage
          ? { imageUrl: groupImage, imageUrls: [groupImage] }
          : {}),
        specs: [],
        variants: [],
      });
      if (!result.ok) {
        report.failedCount++;
        report.errors.push({
          row: rowNum,
          name,
          message: `Falha ao atualizar produto: ${result.error}`,
        });
      } else {
        report.updated++;
        usedCategories.add(category);
      }
      continue;
    }

    const candidate = {
      name,
      price: salePrice,
      description,
      category,
      isFeatured,
      isAdult,
      inStock: true,
      ...(curatorship ? { curatorship } : {}),
      ...(groupImage ? { imageUrl: groupImage, imageUrls: [groupImage] } : {}),
      specs: [],
      variants: [],
    };

    const parsed = productMutationSchema.safeParse(candidate);
    if (!parsed.success) {
      report.failedCount++;
      report.errors.push({
        row: rowNum,
        name: name || undefined,
        message: parsed.error.issues
          .map(
            (issue) => `${issue.path.join(".") || "campo"}: ${issue.message}`,
          )
          .join("; "),
      });
      continue;
    }

    const images =
      parsed.data.imageUrls ??
      (parsed.data.imageUrl ? [parsed.data.imageUrl] : []);

    const productPayload = {
      name: parsed.data.name,
      price: parsed.data.price,
      description: parsed.data.description,
      curatorship: parsed.data.curatorship?.trim() || null,
      category: parsed.data.category,
      is_featured: parsed.data.isFeatured,
      in_stock: parsed.data.inStock,
      specs: {},
      images,
      image_url: images[0] ?? null,
      variants: [],
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: insertError } = await supabase
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();

    if (insertError || !created) {
      report.failedCount++;
      report.errors.push({
        row: rowNum,
        name: name || undefined,
        message: `Falha ao criar produto: ${insertError?.message ?? "sem id retornado"}`,
      });
      continue;
    }

    report.inserted++;
    usedCategories.add(parsed.data.category);

    // Initial stock entry (ENTRY) → sets stock_quantity + feeds cost dashboard.
    if (totalQty > 0) {
      if (Number.isFinite(unitCost) && unitCost > 0) {
        const invoiceTotal = Number((unitCost * totalQty).toFixed(2));
        const { error: stockError } = await supabase
          .from("inventory_movements")
          .insert({
            product_id: created.id,
            type: "ENTRY" as const,
            quantity: totalQty,
            invoice_total: invoiceTotal,
            unit_cost: Number(unitCost.toFixed(2)),
            notes: "Entrada inicial (importação CSV)",
          });

        if (stockError) {
          report.warnings.push({
            row: rowNum,
            name,
            message: `Produto criado, mas a entrada de estoque falhou: ${stockError.message}`,
          });
        }
      } else {
        report.warnings.push({
          row: rowNum,
          name,
          message:
            "Quantidade informada sem custo válido — estoque não lançado.",
        });
      }
    }
  }

  // Register any new categories in store_settings so they appear in filters.
  if (usedCategories.size > 0) {
    const { data: settings } = await supabase
      .from("store_settings")
      .select("categories")
      .eq("id", 1)
      .maybeSingle();

    if (settings) {
      const current = Array.isArray(settings.categories)
        ? (settings.categories as unknown[]).filter(
            (c): c is string => typeof c === "string",
          )
        : [];
      const merged = Array.from(
        new Set([...current.map((c) => c.trim()), ...usedCategories]),
      ).filter((c) => c.length > 0);

      if (merged.length !== current.length) {
        await supabase
          .from("store_settings")
          .update({ categories: merged, updated_at: new Date().toISOString() })
          .eq("id", 1);
      }
    }
  }

  if (report.inserted > 0) {
    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/dashboard");
  }

  return report;
}
