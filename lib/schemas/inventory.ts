import { z } from "zod";

export const stockEntrySchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().positive("Quantidade deve ser positiva"),
    invoiceTotal: z.coerce
      .number()
      .positive("Valor total da NF deve ser positivo"),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const stockAdjustmentSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().positive("Quantidade deve ser positiva"),
    type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT"]),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
