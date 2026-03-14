import Link from "next/link";
import { Shield, Truck, Lock, Heart } from "lucide-react";

const navLinks = [
  { href: "/", label: "Loja" },
  { href: "/como-funciona", label: "Como Funciona" },
  { href: "/sobre", label: "Sobre Nós" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      {/* Trust badges section */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:py-16">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-pastel-peach/40">
              <Truck className="size-5 text-foreground/70" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Entrega Discreta</h4>
              <p
                className="mt-1 text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Embalagem neutra sem identificação
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-pastel-sage/40">
              <Shield className="size-5 text-foreground/70" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Compra Segura</h4>
              <p
                className="mt-1 text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Proteção total dos seus dados
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-pastel-lavender/40">
              <Lock className="size-5 text-foreground/70" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Privacidade</h4>
              <p
                className="mt-1 text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Sua privacidade é nossa prioridade
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-pastel-rose/40">
              <Heart className="size-5 text-foreground/70" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Qualidade Premium</h4>
              <p
                className="mt-1 text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Produtos selecionados com cuidado
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <div className="border-t border-border/50 bg-gradient-to-b from-card to-pastel-lavender/5">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <img
                src="/logo.png"
                alt="Secret Boutique"
                className="h-10 w-auto opacity-70"
              />
              <p
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Bem-estar sexual com privacidade e sem julgamentos
              </p>
            </div>

            <nav className="flex flex-wrap justify-center gap-4 md:gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Copyright section */}
      <div className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p
              className="text-sm text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              &copy; {new Date().getFullYear()} The Secret Boutique. Todos os
              direitos reservados.
            </p>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Somente para maiores de 18 anos
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
