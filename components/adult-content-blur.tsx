"use client";

import { EyeOff } from "lucide-react";
import { useAgeModeStore } from "@/lib/store/age-mode-store";
import { cn } from "@/lib/utils";

// Páginas com URL própria (produto, categoria) chegam por link direto, fora
// do catálogo filtrado da home. Imagens +18 ficam borradas até o visitante
// escolher o catálogo completo no AgeGate. O SSR já sai borrado (modo
// "unset"), então nada explícito aparece antes da hidratação.
export function AdultContentBlur({
  isAdult,
  children,
  className,
  compact = false,
}: {
  isAdult: boolean;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const mode = useAgeModeStore((state) => state.mode);
  const setMode = useAgeModeStore((state) => state.setMode);
  const hidden = isAdult && mode !== "adult";

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "h-full w-full transition-[filter] duration-300",
          hidden && "pointer-events-none blur-2xl",
        )}
        aria-hidden={hidden || undefined}
      >
        {children}
      </div>
      {hidden && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/30 p-3 text-center">
          <EyeOff className="size-5 text-foreground/70" />
          {!compact && (
            <>
              <p className="text-sm font-medium text-foreground">
                Imagem do catálogo +18
              </p>
              {mode === "sfw" && (
                <button
                  type="button"
                  onClick={() => setMode("unset")}
                  className="min-h-11 rounded-full px-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Mudar catálogo
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
