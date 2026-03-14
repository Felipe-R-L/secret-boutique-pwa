"use client";

import Link from "next/link";
import { ShoppingBag, Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useCartStore } from "@/lib/store/cart-store";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Loja" },
  { href: "/pedidos", label: "Meus Pedidos" },
  { href: "/como-funciona", label: "Como Funciona" },
  { href: "/sobre", label: "Sobre Nós" },
];

export function Header() {
  const itemCount = useCartStore((state) => state.getItemCount());
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Announcement bar */}
      <div className="relative overflow-hidden bg-gradient-to-r from-pastel-rose/80 via-pastel-lavender/60 to-pastel-peach/80 px-4 py-2 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-foreground/80 sm:text-sm">
          <Sparkles className="size-3.5 shrink-0" />
          <span>
            Retirada 100% anônima • Sem julgamentos • 14h às 5h
          </span>
          <Sparkles className="size-3.5 shrink-0" />
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl">
          <div className="flex h-16 items-center justify-between px-4 md:h-18 md:px-6 lg:h-20">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>

            {/* Logo */}
            <Link href="/" className="group flex flex-col items-start">
              <img
                src="/logo.png"
                alt="Secret Boutique"
                className="h-12 w-auto md:h-14 lg:h-16"
              />
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex lg:items-center lg:gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition-all duration-300 hover:bg-accent/40 hover:text-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Cart button */}
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative size-11 rounded-full transition-colors hover:bg-accent/60 lg:size-12"
            >
              <Link href="/cart" aria-label="Ver carrinho">
                <ShoppingBag className="size-5 lg:size-6" />
                {itemCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-background lg:size-6 lg:text-xs">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile menu sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle className="text-left font-sans text-lg">
              Menu
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1 px-2">
            {navLinks.map((link) => (
              <SheetClose key={link.href} asChild>
                <Link
                  href={link.href}
                  className="rounded-xl px-4 py-3 text-base font-medium text-foreground/80 transition-all duration-200 hover:bg-accent/40 hover:text-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {link.label}
                </Link>
              </SheetClose>
            ))}
          </nav>
          <div className="mt-auto border-t border-border/50 p-4">
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Retirada anônima no Dallas Motel
              <br />
              14h às 5h • Todos os dias
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
