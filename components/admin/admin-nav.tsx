"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/auth/admin";

const links: Array<{ href: string; label: string; adminOnly: boolean }> = [
  { href: "/admin/orders", label: "Pedidos", adminOnly: false },
  { href: "/admin/dashboard", label: "Dashboard", adminOnly: true },
  { href: "/admin/products", label: "Produtos", adminOnly: true },
  { href: "/admin/inventory", label: "Estoque", adminOnly: true },
  { href: "/admin/settings", label: "Configurações da Loja", adminOnly: true },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const visibleLinks =
    role === "ADMIN" ? links : links.filter((link) => !link.adminOnly);

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {visibleLinks.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
