import { z } from "zod";

export const adminRoleSchema = z.enum(["ADMIN", "STAFF"]);
export const orderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);
export const deliveryMethodSchema = z.enum([
  "MOTEL_PICKUP",
  "ROOM_DELIVERY",
  "HOME_DELIVERY",
]);

export const paymentMethodSchema = z.enum(["PIX", "CARD", "CASH"]);

// Cartão na maquininha ou dinheiro: pagos na entrega (quarto) ou na retirada
// (recepção). Só existem dentro do motel — entrega a domicílio é sempre Pix.
export const IN_PERSON_PAYMENT_METHODS = ["CARD", "CASH"] as const;

export function isInPersonPayment(method: string | null | undefined) {
  return method === "CARD" || method === "CASH";
}

// Valores monetários são sempre centavos inteiros (ver lib/money.ts).
const centsSchema = z.coerce.number().int();

// Taxa fixa de entrega a domicílio, em centavos. Fonte da verdade
// compartilhada entre o cálculo server-side (checkout) e o formulário.
export const HOME_DELIVERY_FEE_CENTS = 500;

export const upsertAdminUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: adminRoleSchema,
  })
  .strict();

export const updateStoreSettingsSchema = z
  .object({
    heroTitle: z.string().trim().min(1).max(120),
    heroSubtitle: z.string().trim().min(1).max(280),
  })
  .strict();

export const updateStoreCategoriesSchema = z
  .object({
    categories: z
      .array(z.string().trim().min(1).max(80))
      .max(50)
      .transform((items) =>
        Array.from(new Set(items.map((item) => item.trim()))),
      ),
  })
  .strict();

const productVariantAttributeSchema = z
  .object({
    key: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(120),
  })
  .strict();

const productVariantSchema = z
  .object({
    id: z.string().trim().min(1).max(120).optional(),
    sku: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(140),
    priceCents: centsSchema.positive(),
    stockQuantity: z.coerce.number().int().min(0),
    inStock: z.coerce.boolean().default(true),
    isDefault: z.coerce.boolean().default(false),
    images: z.array(z.string().url()).max(20).default([]),
    attributes: z.array(productVariantAttributeSchema).max(12).default([]),
  })
  .strict();

export const productMutationSchema = z
  .object({
    productId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(140),
    priceCents: centsSchema.positive(),
    description: z.string().trim().min(1).max(1500),
    curatorship: z.string().trim().max(6000).optional(),
    category: z.string().trim().min(1).max(80),
    isFeatured: z.coerce.boolean().default(false),
    // Conteúdo adulto: ativado por padrão; o admin desmarca nos itens SFW.
    isAdult: z.coerce.boolean().default(true),
    inStock: z.coerce.boolean().default(true),
    imageUrl: z.string().url().optional(),
    imageUrls: z.array(z.string().url()).max(20).optional(),
    specs: z
      .array(
        z
          .object({
            key: z.string().trim().min(1).max(80),
            value: z.string().trim().min(1).max(200),
          })
          .strict(),
      )
      .default([]),
    variants: z.array(productVariantSchema).max(60).default([]),
  })
  .strict();

export const submitAnonymousReviewSchema = z
  .object({
    productId: z.string().uuid(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(4000).optional(),
  })
  .strict();

export const checkoutItemSchema = z
  .object({
    productId: z.string().uuid(),
    variantId: z.string().trim().min(1).max(120).optional(),
    quantity: z.number().int().min(1).max(20),
  })
  .strict();

// CPF validation: 11 digits only
const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().length(11, "CPF deve ter 11 dígitos"));

export const initializeCheckoutSchema = z
  .object({
    deliveryMethod: deliveryMethodSchema,
    roomNumber: z.string().trim().max(20).optional(),
    // Endereço externo — obrigatório apenas para HOME_DELIVERY.
    deliveryCep: z.string().trim().max(9).optional(),
    deliveryStreet: z.string().trim().max(200).optional(),
    deliveryNumber: z.string().trim().max(20).optional(),
    deliveryComplement: z.string().trim().max(120).optional(),
    deliveryNeighborhood: z.string().trim().max(120).optional(),
    deliveryCity: z.string().trim().max(120).optional(),
    deliveryState: z.string().trim().max(2).optional(),
    // Nome, email e dados do pagador só são exigidos no Pix (o Mercado Pago
    // precisa deles). No pagamento presencial o nome é opcional.
    customerName: z.string().trim().max(120).optional(),
    customerEmail: z.string().trim().email().max(180).optional(),
    payerFirstName: z.string().trim().min(1).max(60).optional(),
    payerLastName: z.string().trim().min(1).max(60).optional(),
    payerCpf: cpfSchema.optional(),
    paymentMethod: paymentMethodSchema,
    // Dinheiro: valor da nota (em centavos, até R$ 10.000) para a recepção
    // levar o troco.
    cashChangeForCents: z.number().int().positive().max(1_000_000).optional(),
    items: z.array(checkoutItemSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasRoom = Boolean(
      value.roomNumber && value.roomNumber.trim().length > 0,
    );
    if (value.deliveryMethod === "ROOM_DELIVERY" && !hasRoom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "roomNumber is required for ROOM_DELIVERY",
        path: ["roomNumber"],
      });
    }

    // Número de quarto só é válido para entrega no quarto.
    if (value.deliveryMethod !== "ROOM_DELIVERY" && hasRoom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "roomNumber must be empty unless ROOM_DELIVERY",
        path: ["roomNumber"],
      });
    }

    if (value.paymentMethod === "PIX") {
      if (!value.customerName || value.customerName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe seu nome para pagar com Pix",
          path: ["customerName"],
        });
      }
      const payerFields: Array<[keyof typeof value, unknown]> = [
        ["customerEmail", value.customerEmail],
        ["payerFirstName", value.payerFirstName],
        ["payerLastName", value.payerLastName],
        ["payerCpf", value.payerCpf],
      ];
      for (const [field, fieldValue] of payerFields) {
        if (!fieldValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${String(field)} é obrigatório para pagamento via Pix`,
            path: [String(field)],
          });
        }
      }
    } else if (value.deliveryMethod === "HOME_DELIVERY") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entrega a domicílio aceita apenas Pix",
        path: ["paymentMethod"],
      });
    }

    if (
      value.cashChangeForCents !== undefined &&
      value.paymentMethod !== "CASH"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Troco só vale para pagamento em dinheiro",
        path: ["cashChangeForCents"],
      });
    }

    if (value.deliveryMethod === "HOME_DELIVERY") {
      const requiredAddress: Array<
        [keyof typeof value, string | undefined]
      > = [
        ["deliveryCep", value.deliveryCep],
        ["deliveryStreet", value.deliveryStreet],
        ["deliveryNumber", value.deliveryNumber],
        ["deliveryNeighborhood", value.deliveryNeighborhood],
        ["deliveryCity", value.deliveryCity],
        ["deliveryState", value.deliveryState],
      ];

      for (const [field, fieldValue] of requiredAddress) {
        if (!fieldValue || fieldValue.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${String(field)} é obrigatório para entrega a domicílio`,
            path: [String(field)],
          });
        }
      }

      const cepDigits = (value.deliveryCep ?? "").replace(/\D/g, "");
      if (cepDigits.length !== 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CEP deve ter 8 dígitos",
          path: ["deliveryCep"],
        });
      }
    }
  });

export type InitializeCheckoutInput = z.infer<typeof initializeCheckoutSchema>;

export const adminOrderMutationSchema = z
  .object({
    id: z.string().uuid().optional(),
    customerName: z.string().trim().min(2).max(120),
    customerEmail: z.string().trim().email().max(180).optional(),
    deliveryMethod: deliveryMethodSchema,
    roomNumber: z.string().trim().max(20).optional(),
    paymentMethod: paymentMethodSchema.default("PIX"),
    status: orderStatusSchema.default("PENDING"),
    totalCents: centsSchema.min(0),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasRoom = Boolean(
      value.roomNumber && value.roomNumber.trim().length > 0,
    );

    if (value.deliveryMethod === "ROOM_DELIVERY" && !hasRoom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "roomNumber is required for ROOM_DELIVERY",
        path: ["roomNumber"],
      });
    }

    if (value.deliveryMethod === "MOTEL_PICKUP" && hasRoom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "roomNumber must be empty for MOTEL_PICKUP",
        path: ["roomNumber"],
      });
    }
  });
