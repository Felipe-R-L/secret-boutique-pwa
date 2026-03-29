import { create } from "zustand";

export interface ProductSpecs {
  [key: string]: string;
}

export interface ProductVariantAttribute {
  key: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  label: string;
  price: number;
  stock_quantity: number;
  in_stock: boolean;
  images?: string[];
  attributes: ProductVariantAttribute[];
  is_default?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  curatorship?: string | null;
  image?: string;
  image_url?: string | null;
  images?: string[];
  category: string;
  specs?: ProductSpecs;
  rating?: number;
  reviews?: number;
  inStock?: boolean;
  in_stock?: boolean;
  is_featured?: boolean;
  stock_quantity?: number;
  variants?: ProductVariant[];
}

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export function getCartItemUnitPrice(item: CartItem): number {
  return item.variant?.price ?? item.product.price;
}

export function getCartItemKey(productId: string, variantId?: string | null) {
  return `${productId}:${variantId ?? "base"}`;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product: Product, variant?: ProductVariant) => {
    set((state) => {
      const existingItem = state.items.find(
        (item) =>
          getCartItemKey(item.product.id, item.variant?.id) ===
          getCartItemKey(product.id, variant?.id),
      );

      if (existingItem) {
        return {
          items: state.items.map((item) =>
            getCartItemKey(item.product.id, item.variant?.id) ===
            getCartItemKey(product.id, variant?.id)
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        };
      }

      return { items: [...state.items, { product, variant, quantity: 1 }] };
    });
  },

  removeItem: (productId: string, variantId?: string) => {
    set((state) => ({
      items: state.items.filter(
        (item) =>
          getCartItemKey(item.product.id, item.variant?.id) !==
          getCartItemKey(productId, variantId),
      ),
    }));
  },

  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId, variantId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        getCartItemKey(item.product.id, item.variant?.id) ===
        getCartItemKey(productId, variantId)
          ? { ...item, quantity }
          : item,
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    return get().items.reduce(
      (total, item) => total + getCartItemUnitPrice(item) * item.quantity,
      0,
    );
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
