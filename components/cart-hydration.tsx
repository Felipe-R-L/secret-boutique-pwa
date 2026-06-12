"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cart-store";

// Reidrata o carrinho do sessionStorage depois do mount, evitando
// divergência entre o HTML do servidor e o primeiro render do cliente.
export function CartHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
