import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  ShoppingBag,
  CreditCard,
  KeyRound,
  Package,
  Shield,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Como Funciona — The Secret Boutique",
  description:
    "Entenda como funciona o processo de compra e retirada anônima na Secret Boutique.",
};

const steps = [
  {
    icon: ShoppingBag,
    number: "01",
    title: "Escolha seus produtos",
    description:
      "Navegue pelo catálogo e adicione ao carrinho os produtos que desejar. Sem cadastro, sem dados pessoais.",
    color: "bg-pastel-rose",
  },
  {
    icon: CreditCard,
    number: "02",
    title: "Finalize o pedido",
    description:
      "Pagamento rápido via Pix. Sem necessidade de criar conta ou fornecer informações pessoais.",
    color: "bg-pastel-lavender",
  },
  {
    icon: KeyRound,
    number: "03",
    title: "Receba seu código",
    description:
      "Você recebe um número de pedido único e anônimo. Este código é a sua única forma de retirar o produto.",
    color: "bg-pastel-sage",
  },
  {
    icon: Package,
    number: "04",
    title: "Retire no Dallas Motel",
    description:
      "Apresente apenas o código no Dallas Motel em Pitangueiras. Embalagem neutra, sem identificação.",
    color: "bg-pastel-peach",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pastel-rose/20 via-background to-pastel-lavender/20" />
          {/* Decorative blobs */}
          <div className="absolute -left-20 -top-20 size-64 rounded-full bg-pastel-rose/15 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 size-64 rounded-full bg-pastel-lavender/15 blur-3xl" />

          <div className="relative mx-auto max-w-4xl px-4 py-16 text-center md:px-6 md:py-24">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pastel-sage/30 px-4 py-2 text-sm font-medium text-secondary-foreground">
              <Shield className="size-4" />
              <span>Privacidade Total</span>
            </div>
            <h1 className="font-sans text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Como funciona a<br />
              <span className="text-primary">retirada anônima</span>
            </h1>
            <p
              className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Compre com total privacidade. Não coletamos nenhum dado pessoal —
              seu código é a única coisa que você precisa.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-20">
          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 md:p-8"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div
                    className={`flex size-14 items-center justify-center rounded-2xl ${step.color}`}
                  >
                    <step.icon className="size-6 text-foreground/80" />
                  </div>
                  <span className="font-sans text-4xl font-bold text-border">
                    {step.number}
                  </span>
                </div>
                <h3 className="mb-2 font-sans text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Schedule visual */}
        <section className="bg-gradient-to-b from-background to-pastel-lavender/10">
          <div className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
            <div className="rounded-3xl border border-border/50 bg-card p-6 md:p-10">
              <div className="flex flex-col items-center gap-8 md:flex-row">
                {/* Clock visual */}
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <div className="relative flex size-32 items-center justify-center rounded-full bg-gradient-to-br from-pastel-peach to-pastel-rose md:size-40">
                    <Clock className="size-12 text-foreground/60 md:size-16" />
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-pastel-sage/40 px-4 py-2">
                    <span
                      className="text-sm font-semibold text-secondary-foreground"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Todos os dias
                    </span>
                  </div>
                </div>

                {/* Schedule info */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="mb-3 font-sans text-2xl font-semibold text-foreground md:text-3xl">
                    Horário de Retirada
                  </h2>
                  <div className="mb-4 flex items-center justify-center gap-3 md:justify-start">
                    <div className="rounded-xl bg-primary/10 px-4 py-3">
                      <span className="font-sans text-2xl font-bold text-primary">
                        14h
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="h-0.5 w-8 bg-primary/30" />
                      <span
                        className="my-1 text-xs text-muted-foreground"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        até
                      </span>
                      <div className="h-0.5 w-8 bg-primary/30" />
                    </div>
                    <div className="rounded-xl bg-primary/10 px-4 py-3">
                      <span className="font-sans text-2xl font-bold text-primary">
                        5h
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-sm leading-relaxed text-muted-foreground"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    A retirada funciona todos os dias, incluindo finais de semana
                    e feriados. Basta apresentar seu código de pedido — nenhum
                    documento é necessário.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy section */}
        <section className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
              Sua privacidade é{" "}
              <span className="text-primary">inegociável</span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            <div className="rounded-2xl bg-pastel-rose/20 p-6 text-center">
              <EyeOff className="mx-auto mb-3 size-8 text-foreground/60" />
              <h4 className="mb-1 font-sans text-base font-semibold text-foreground">
                Sem dados pessoais
              </h4>
              <p
                className="text-sm text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Não coletamos nome, email ou qualquer informação pessoal.
              </p>
            </div>
            <div className="rounded-2xl bg-pastel-lavender/20 p-6 text-center">
              <KeyRound className="mx-auto mb-3 size-8 text-foreground/60" />
              <h4 className="mb-1 font-sans text-base font-semibold text-foreground">
                Código é único
              </h4>
              <p
                className="text-sm text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Seu número de pedido é a única forma de retirar. Não compartilhe
                com ninguém.
              </p>
            </div>
            <div className="rounded-2xl bg-pastel-sage/20 p-6 text-center">
              <Eye className="mx-auto mb-3 size-8 text-foreground/60" />
              <h4 className="mb-1 font-sans text-base font-semibold text-foreground">
                Embalagem neutra
              </h4>
              <p
                className="text-sm text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Todos os produtos são entregues em embalagem sem identificação.
              </p>
            </div>
          </div>
        </section>

        {/* Dallas CTA */}
        <section className="border-t border-border/50 bg-card">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center md:px-6 md:py-16">
            <h3 className="mb-2 font-sans text-xl font-semibold text-foreground md:text-2xl">
              Dallas Motel — Pitangueiras, SP
            </h3>
            <p
              className="mx-auto mb-6 max-w-lg text-sm text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Tradição e discrição. O ponto de retirada da Secret Boutique.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12 rounded-full px-6" asChild>
                <Link href="/">Explorar Produtos</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full px-6"
                asChild
              >
                <a
                  href="https://www.jrdallasmotel.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Conhecer o Dallas
                  <ExternalLink className="ml-2 size-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
