import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json(
      { ok: false, error: 'Missing orderId' },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id,status,pickup_code,total_amount,created_at,updated_at,completed_at,delivery_method,room_number,payment_method,cash_change_for',
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json(
      { ok: false, error: 'Order not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: order.id,
      status: order.status,
      pickupCode: order.pickup_code,
      totalAmount: Number(order.total_amount),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      completedAt: order.completed_at,
      deliveryMethod: order.delivery_method,
      roomNumber: order.room_number,
      paymentMethod: order.payment_method,
      cashChangeFor:
        order.cash_change_for === null ? null : Number(order.cash_change_for),
    },
  });
}
