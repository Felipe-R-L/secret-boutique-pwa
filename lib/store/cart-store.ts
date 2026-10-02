import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { trackEvent } from "@/lib/analytics/client";

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
  /** Centavos (R$ 49,90 = 4990). */
  price_cents: number;
  stock_quantity: number;
  in_stock: boolean;
  images?: string[];
  attributes: ProductVariantAttribute[];
  is_default?: boolean;
}

export interface Product {
  id: string;
  name: string;
  /** Centavos; com variações, é o menor preço entre elas. */
  price_cents: number;
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
  is_adult?: boolean;
  stock_quantity?: number;
  variants?: ProductVariant[];
}

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

/** Preço unitário do item, em centavos. */
export function getCartItemUnitPriceCents(item: CartItem): number {
  return item.variant?.price_cents ?? item.product.price_cents;
}

export function getCartItemKey(productId: string, variantId?: string | null) {
  return `${productId}:${variantId ?? "base"}`;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (
    productId: string,
    variantId: string | undefined,
    quantity: number,
  ) => void;
  clearCart: () => void;
  /** Total do carrinho, em centavos. */
  getTotalCents: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

  addItem: (product: Product, variant?: ProductVariant) => {
    trackEvent("add_to_cart", {
      productId: product.id,
      valueCents: variant?.price_cents ?? product.price_cents,
      props: { qty: 1 },
    });
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
    const removed = get().items.find(
      (item) =>
        getCartItemKey(item.product.id, item.variant?.id) ===
        getCartItemKey(productId, variantId),
    );
    if (removed) {
      trackEvent("remove_from_cart", {
        productId,
        valueCents: getCartItemUnitPriceCents(removed) * removed.quantity,
      });
    }
    set((state) => ({
      items: state.items.filter(
        (item) =>
          getCartItemKey(item.product.id, item.variant?.id) !==
          getCartItemKey(productId, variantId),
      ),
    }));
  },

  updateQuantity: (
    productId: string,
    variantId: string | undefined,
    quantity: number,
  ) => {
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

  getTotalCents: () => {
    return get().items.reduce(
      (total, item) => total + getCartItemUnitPriceCents(item) * item.quantity,
      0,
    );
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
    }),
    {
      name: "secret-boutique-cart",
      // v1: preços em centavos. Carrinho salvo antes disso tem preço em
      // reais e é descartado (vive só na sessão, então não perde muito).
      version: 1,
      migrate: () => ({ items: [] }),
      // sessionStorage: o carrinho sobrevive a reloads, mas morre ao fechar o
      // navegador — meio-termo alinhado à proposta de privacidade da loja.
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ items: state.items }),
      // Rehidratação manual pós-mount (CartHydration) para não divergir do SSR.
      skipHydration: true,
    },
  ),
);
