import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// Sessão do Supabase só importa no painel e no login. Rodar em toda rota
// pública fazia uma chamada ao Supabase por request e impedia o cache da
// vitrine (home, produtos, categorias).
export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
