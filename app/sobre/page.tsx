import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Lock, Heart, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Sobre Nós | The Secret Boutique",
  description:
    "Conheça a história da Secret Boutique, a sua boutique íntima. Autocuidado, produtos de beleza e bem-estar sexual com total privacidade no JR Dallas Motel em Pitangueiras.",
};

const values = [
  {
    icon: Lock,
    title: "Privacidade Total",
    description:
      "Nenhum dado pessoal é coletado. Sua identidade é protegida do início ao fim.",
    color: "from-pastel-lavender/40 to-pastel-lavender/10",
  },
  {
    icon: Heart,
    title: "Sem Julgamentos",
    description:
      "Para todas as pessoas, sem exceção. Aqui você é livre para explorar o que te faz bem.",
    color: "from-pastel-rose/40 to-pastel-rose/10",
  },
  {
    icon: Sparkles,
    title: "Autocuidado",
    description:
      "Produtos selecionados com carinho para trazer mais prazer e bem-estar à sua vida.",
    color: "from-pastel-peach/40 to-pastel-peach/10",
  },
];

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pastel-rose/15 via-background to-pastel-sage/15" />
          <div className="absolute left-1/2 top-0 size-96 -translate-x-1/2 rounded-full bg-pastel-lavender/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center md:px-6 md:py-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-pastel-rose/30 px-4 py-2 text-sm font-medium text-accent-foreground">
              <Heart className="size-4" />
              <span>Nossa História</span>
            </div>
            <h1 className="font-sans text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl xl:text-6xl">
              Bem-estar sexual com{" "}
              <span className="text-primary">privacidade</span> e sem{" "}
              <span className="text-primary">julgamentos</span>
            </h1>
          </div>
        </section>

        {/* Story */}
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-20">
          <div className="space-y-6">
            <p
              className="text-lg leading-relaxed text-foreground/90 md:text-xl"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              A <strong>Secret Boutique</strong> nasceu dentro do{" "}
              <strong>Dallas Motel</strong>, em Pitangueiras, com uma missão
              simples e poderosa: trazer{" "}
              <em>bem-estar sexual e autocuidado</em> com total privacidade e sem
              julgamentos para qualquer pessoa.
            </p>
            <p
              className="text-base leading-relaxed text-muted-foreground md:text-lg"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Acreditamos que cuidar de si é um ato de amor. Que explorar o
              prazer é natural, saudável e não deve ser motivo de vergonha.
              Por isso criamos um espaço onde você pode escolher seus produtos
              com calma, sem pressa e sem olhares.
            </p>
            <p
              className="text-base leading-relaxed text-muted-foreground md:text-lg"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Aqui, não pedimos seu nome, seu email, nem nenhuma informação
              pessoal. Você compra, recebe um código, e retira quando quiser —
              simples assim. Porque privacidade não é um luxo, é um direito.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="bg-gradient-to-b from-background to-pastel-lavender/10">
          <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-20">
            <h2 className="mb-10 text-center font-sans text-2xl font-semibold text-foreground md:text-3xl">
              Nossos Valores
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {values.map((value) => (
                <div
                  key={value.title}
                  className={`group overflow-hidden rounded-3xl bg-gradient-to-b ${value.color} border border-border/30 p-8 text-center transition-all duration-300 hover:border-primary/20 hover:shadow-lg`}
                >
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-background/80">
                    <value.icon className="size-7 text-primary" />
                  </div>
                  <h3 className="mb-2 font-sans text-lg font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed text-muted-foreground"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/50 bg-card">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6 md:py-24">
            <h2 className="mb-4 font-sans text-2xl font-semibold text-foreground md:text-3xl">
              Pronta(o) para se cuidar?
            </h2>
            <p
              className="mx-auto mb-8 max-w-md text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Explore nossos produtos selecionados com carinho para o seu
              bem-estar.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="group h-12 rounded-full px-8"
                asChild
              >
                <Link href="/">
                  Explorar Produtos
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full px-8"
                asChild
              >
                <Link href="/como-funciona">Como Funciona</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
