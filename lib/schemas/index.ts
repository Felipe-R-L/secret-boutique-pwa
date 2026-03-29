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
export const deliveryMethodSchema = z.enum(["MOTEL_PICKUP", "ROOM_DELIVERY"]);

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
    price: z.coerce.number().positive(),
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
    price: z.coerce.number().positive(),
    description: z.string().trim().min(1).max(1500),
    curatorship: z.string().trim().max(6000).optional(),
    category: z.string().trim().min(1).max(80),
    isFeatured: z.coerce.boolean().default(false),
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
    customerName: z.string().trim().min(2).max(120),
    customerEmail: z.string().trim().email().max(180),
    payerFirstName: z.string().trim().min(1).max(60),
    payerLastName: z.string().trim().min(1).max(60),
    payerCpf: cpfSchema,
    paymentMethod: z.literal("PIX"),
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

    if (value.deliveryMethod === "MOTEL_PICKUP" && hasRoom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "roomNumber must be empty for MOTEL_PICKUP",
        path: ["roomNumber"],
      });
    }
  });

export type InitializeCheckoutInput = z.infer<typeof initializeCheckoutSchema>;

export const adminOrderMutationSchema = z
  .object({
    id: z.string().uuid().optional(),
    customerName: z.string().trim().min(2).max(120),
    customerEmail: z.string().trim().email().max(180),
    deliveryMethod: deliveryMethodSchema,
    roomNumber: z.string().trim().max(20).optional(),
    paymentMethod: z.literal("PIX").default("PIX"),
    status: orderStatusSchema.default("PENDING"),
    totalAmount: z.coerce.number().min(0),
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
