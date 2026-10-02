"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSource, trackEvent } from "@/lib/analytics/client";

const TRUST_PAGES: Record<string, string> = {
  "/sobre": "sobre",
  "/como-funciona": "como-funciona",
  "/privacidade": "privacidade",
};

/**
 * Registra page_view a cada troca de rota e trust_page_view nas páginas que o
 * visitante lê para decidir se confia na loja. Vai no layout raiz.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // Lê a origem antes que outro componente limpe os parâmetros da URL
    // (ex.: ?quarto= é removido pelo RoomParamCapture).
    getSource();
    trackEvent("page_view");
    const trustPage = TRUST_PAGES[pathname];
    if (trustPage) {
      trackEvent("trust_page_view", { props: { page: trustPage } });
    }
  }, [pathname]);

  return null;
}
