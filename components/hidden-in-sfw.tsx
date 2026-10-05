"use client";

import { useAgeModeStore } from "@/lib/store/age-mode-store";

// Quem escolheu o catálogo livre (SFW) não vê itens +18 nas listas.
export function HiddenInSfw({
  isAdult,
  children,
}: {
  isAdult: boolean;
  children: React.ReactNode;
}) {
  const mode = useAgeModeStore((state) => state.mode);
  if (isAdult && mode === "sfw") return null;
  return <>{children}</>;
}

// Lista em que tudo é +18 fica vazia no modo SFW: explica em vez de sumir.
export function SfwEmptyNotice({ allAdult }: { allAdult: boolean }) {
  const mode = useAgeModeStore((state) => state.mode);
  const setMode = useAgeModeStore((state) => state.setMode);
  if (!allAdult || mode !== "sfw") return null;

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-3xl bg-pastel-sage/15 px-4 py-10 text-center"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <p className="font-medium text-foreground">
        Todos os itens daqui são do catálogo +18.
      </p>
      <p className="text-sm text-muted-foreground">
        Você está vendo o catálogo livre (SFW).
      </p>
      <button
        type="button"
        onClick={() => setMode("unset")}
        className="min-h-11 px-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Mudar catálogo
      </button>
    </div>
  );
}
