import Link from "next/link";
import { Shield, Package, Lock, Heart, Instagram } from "lucide-react";
import { INSTAGRAM_URL, INSTAGRAM_HANDLE, WHATSAPP_URL } from "@/lib/site-contact";

const navLinks = [
  { href: "/", label: "Loja" },
  { href: "/como-funciona", label: "Como Funciona" },
  { href: "/sobre", label: "Sobre Nós" },
  { href: "/privacidade", label: "Privacidade" },
];

function WhatsappGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      {/* Trust badges section */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:py-16">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-pastel-peach/40">
              <Package className="size-5 text-foreground/70" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Embalagem Discreta</h4>
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
                width={324}
                height={118}
                className="h-10 w-auto opacity-70"
              />
              <p
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Bem-estar sexual com privacidade e sem julgamentos
              </p>

              <div className="mt-2 flex items-center gap-3">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Instagram @${INSTAGRAM_HANDLE}`}
                  className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-pastel-rose/40 hover:text-foreground"
                >
                  <Instagram className="size-4" />
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-[#25D366]/15 hover:text-[#25D366]"
                >
                  <WhatsappGlyph className="size-4" />
                </a>
              </div>
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
