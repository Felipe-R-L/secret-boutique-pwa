import { Sparkles } from "lucide-react";

interface ProductCuratorshipProps {
  curatorship?: string | null;
}

export function ProductCuratorship({ curatorship }: ProductCuratorshipProps) {
  if (!curatorship || curatorship.trim().length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-background to-rose-50 p-5">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-3 py-1 text-xs font-medium text-amber-800">
        <Sparkles className="size-3.5" />
        Curadoria da Loja
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {curatorship}
      </p>
    </section>
  );
}
