import { create } from "zustand";
import { persist } from "zustand/middleware";

type SavedOrder = {
  orderId: string;
  pickupCode: string | null;
  email: string;
  total: number;
  date: string; // ISO string
  status?: string;
};

type OrderHistoryState = {
  orders: SavedOrder[];
  addOrder: (order: SavedOrder) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  getOrders: () => SavedOrder[];
};

export const useOrderHistoryStore = create<OrderHistoryState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders.filter((o) => o.orderId !== order.orderId)],
        })),
      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.orderId === orderId ? { ...o, status } : o,
          ),
        })),
      getOrders: () => get().orders,
    }),
    {
      name: "secret-boutique-orders",
    },
  ),
);
