import { EyeOff, Package, QrCode } from "lucide-react";

const benefits = [
  {
    icon: EyeOff,
    title: "Retirada 100% anônima",
    description: "Sem contato e sem cadastro — só o seu código.",
    iconBg: "bg-pastel-lavender/30",
  },
  {
    icon: Package,
    title: "Embalagem discreta",
    description: "Nada que identifique a loja ou o conteúdo.",
    iconBg: "bg-pastel-rose/30",
  },
  {
    icon: QrCode,
    title: "Pagamento via PIX",
    description: "Aprovação na hora, sem cartão de crédito.",
    iconBg: "bg-pastel-sage/30",
  },
];

export function BenefitsStrip() {
  return (
    <section
      aria-label="Benefícios da loja"
      className="relative border-y border-border/40 bg-card/60"
    >
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-3 md:px-6 md:py-6">
        {benefits.map((benefit) => (
          <div key={benefit.title} className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${benefit.iconBg}`}
            >
              <benefit.icon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {benefit.title}
              </p>
              <p
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {benefit.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
