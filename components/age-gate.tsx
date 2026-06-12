"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgeModeStore } from "@/lib/store/age-mode-store";

// Modal mínima de escolha de catálogo. A pergunta é apresentada como uma
// preferência de conteúdo (SFW vs +18), não como uma barreira — o visitante
// sempre tem um caminho para continuar navegando, o que reduz bounce.
export function AgeGate() {
  const mode = useAgeModeStore((state) => state.mode);
  const setMode = useAgeModeStore((state) => state.setMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useAgeModeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  if (!hydrated || mode !== "unset") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escolha de catálogo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <h2 className="font-sans text-xl font-semibold text-foreground">
          Como você prefere ver a loja?
        </h2>
        <p
          className="mt-2 text-sm leading-relaxed text-muted-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Temos produtos de bem-estar adulto (+18) e também itens livres, para
          todos os públicos. Escolha o catálogo — dá para mudar quando quiser.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            className="h-12 rounded-full text-sm font-semibold"
            onClick={() => setMode("adult")}
          >
            <Sparkles className="mr-2 size-4" />
            Tenho 18 anos ou mais — catálogo completo
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-full text-sm font-semibold"
            onClick={() => setMode("sfw")}
          >
            <Leaf className="mr-2 size-4" />
            Ver apenas produtos livres (SFW)
          </Button>
        </div>

        <p
          className="mt-4 text-xs text-muted-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Sua escolha fica só neste dispositivo. Sem cookies de rastreamento ·{" "}
          <Link
            href="/privacidade"
            className="text-primary underline-offset-4 hover:underline"
          >
            Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
