import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SavedOrder = {
  orderId: string;
  pickupCode: string | null;
  email: string;
  /** Centavos. */
  totalCents: number;
  date: string; // ISO string
  status?: string;
  // Pagamento na entrega (cartão/dinheiro) — muda o texto do status pendente.
  paymentMethod?: string;
  deliveryMethod?: string;
  roomNumber?: string | null;
};

type OrderHistoryState = {
  orders: SavedOrder[];
  addOrder: (order: SavedOrder) => void;
  mergeOrder: (orderId: string, patch: Partial<SavedOrder>) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  getOrders: () => SavedOrder[];
};

export const useOrderHistoryStore = create<OrderHistoryState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: order =>
        set(state => ({
          orders: [
            order,
            ...state.orders.filter(o => o.orderId !== order.orderId),
          ],
        })),
      mergeOrder: (orderId, patch) =>
        set(state => ({
          orders: state.orders.map(order =>
            order.orderId === orderId ? { ...order, ...patch } : order,
          ),
        })),
      updateOrderStatus: (orderId, status) =>
        set(state => ({
          orders: state.orders.map(o =>
            o.orderId === orderId ? { ...o, status } : o,
          ),
        })),
      getOrders: () => get().orders,
    }),
    {
      name: 'secret-boutique-orders',
      // v1: total em centavos (antes era `total`, em reais).
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { orders?: Array<Record<string, unknown>> };
        if (version >= 1 || !Array.isArray(state?.orders)) {
          return state as unknown as OrderHistoryState;
        }
        return {
          ...state,
          orders: state.orders.map(({ total, ...order }) => ({
            ...order,
            totalCents: Math.round(Number(total ?? 0) * 100),
          })),
        } as unknown as OrderHistoryState;
      },
    },
  ),
);
