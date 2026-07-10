"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logAdminNavigation } from "@/lib/actions/audit";

/**
 * Registra a navegação dentro do painel admin. Montado no layout, observa o
 * pathname e dispara um log a cada troca de rota (deduplicando repetições
 * consecutivas). Best-effort: nunca interfere na navegação.
 */
export function AuditTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    logAdminNavigation(pathname).catch(() => {
      // silencioso — auditoria não pode atrapalhar o uso do painel
    });
  }, [pathname]);

  return null;
}
