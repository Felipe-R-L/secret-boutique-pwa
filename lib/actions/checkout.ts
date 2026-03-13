"use server";

import { initializeCheckoutSchema } from "@/lib/schemas";
import {
  createPixOrder,
  extractPixData,
  getOrderById,
} from "@/lib/mercadopago/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type CheckoutResult =
  | { ok: true; orderId: string; totalAmount: number }
  | { ok: false; error: string };

export async function initializeCheckout(
  input: unknown,
): Promise<CheckoutResult> {
  const parsed = initializeCheckoutSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors.join(", ") ||
        "Invalid checkout payload",
    };
  }

  const supabase = createServiceRoleClient();

  const productIds = parsed.data.items.map((item) => item.productId);
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,price,in_stock")
    .in("id", productIds);

  if (productError || !products) {
    return {
      ok: false,
      error: productError?.message ?? "Could not fetch product prices",
    };
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  let totalAmount = 0;
  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return { ok: false, error: `Product not found: ${item.productId}` };
    }

    if (product.in_stock === false) {
      return { ok: false, error: `Product out of stock: ${item.productId}` };
    }

    totalAmount += Number(product.price) * item.quantity;
  }

  totalAmount = Number(totalAmount.toFixed(2));

  const orderInsert = {
    customer_name: parsed.data.customerName,
    customer_email: parsed.data.customerEmail,
    delivery_method: parsed.data.deliveryMethod,
    room_number:
      parsed.data.deliveryMethod === "ROOM_DELIVERY"
        ? (parsed.data.roomNumber?.trim() ?? null)
        : null,
    payment_method: parsed.data.paymentMethod,
    status: "PENDING" as const,
    total_amount: totalAmount,
  };

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert(orderInsert)
    .select("id")
    .single();

  if (orderError || !orderData) {
    return {
      ok: false,
      error: orderError?.message ?? "Could not create order",
    };
  }

  const orderItems = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId)!;

    return {
      order_id: orderData.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: Number(product.price),
    };
  });

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderData.id);
    return { ok: false, error: itemsError.message };
  }

  return {
    ok: true,
    orderId: orderData.id,
    totalAmount,
  };
}

export async function checkOrderStatus(orderId: unknown) {
  if (typeof orderId !== "string") {
    return { ok: false as const, error: "Invalid order id" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id,status,total_amount")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Order not found" };
  }

  return {
    ok: true as const,
    data: {
      id: data.id,
      status: data.status,
      totalAmount: Number(data.total_amount),
    },
  };
}

export async function generatePixOrder(orderId: unknown) {
  if (typeof orderId !== "string") {
    return { ok: false as const, error: "Invalid order id" };
  }

  const supabase = createServiceRoleClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id,customer_name,customer_email,total_amount,status,mercadopago_order_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return {
      ok: false as const,
      error: orderError?.message ?? "Order not found",
    };
  }

  let mpOrderId = order.mercadopago_order_id;

  if (!mpOrderId) {
    const payload = {
      type: "online",
      processing_mode: "automatic",
      external_reference: order.id,
      total_amount: Number(order.total_amount),
      description: `Pedido ${order.id}`,
      payer: {
        email: order.customer_email,
        first_name: order.customer_name,
      },
      transactions: {
        payments: [
          {
            amount: Number(order.total_amount),
            payment_method: {
              id: "pix",
            },
          },
        ],
      },
    };

    let mpOrder;
    try {
      mpOrder = await createPixOrder(payload);
    } catch (error) {
      return {
        ok: false as const,
        error:
          error instanceof Error ? error.message : "Could not create PIX order",
      };
    }

    if (!mpOrder.id) {
      return {
        ok: false as const,
        error: "Mercado Pago did not return order id",
      };
    }

    mpOrderId = String(mpOrder.id);

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        mercadopago_order_id: mpOrderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      return { ok: false as const, error: updateError.message };
    }

    const pix = extractPixData(mpOrder);
    return {
      ok: true as const,
      orderId: order.id,
      mercadopagoOrderId: mpOrderId,
      qrCodeBase64: pix.qrCodeBase64,
      digitableLine: pix.qrCodeText,
      status: order.status,
    };
  }

  try {
    const mpOrder = await getOrderById(mpOrderId);
    const pix = extractPixData(mpOrder);

    return {
      ok: true as const,
      orderId: order.id,
      mercadopagoOrderId: mpOrderId,
      qrCodeBase64: pix.qrCodeBase64,
      digitableLine: pix.qrCodeText,
      status: order.status,
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not fetch PIX order",
    };
  }
}
