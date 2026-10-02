import { z } from "zod";

export const stockEntrySchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().positive("Quantidade deve ser positiva"),
    // Centavos.
    invoiceTotalCents: z.coerce
      .number()
      .int()
      .positive("Valor total da NF deve ser positivo"),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const stockAdjustmentSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().positive("Quantidade deve ser positiva"),
    type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT"]),
    // Optional: target a specific product variant. When present, the
    // adjustment decrements/increments that variant's stock inside the
    // products.variants JSONB and recomputes the aggregate stock_quantity.
    variantId: z.string().trim().min(1).optional(),
    variantLabel: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
