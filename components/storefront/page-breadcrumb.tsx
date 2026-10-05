import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/structured-data";

type Crumb = { name: string; path: string };

// Trilha visível + BreadcrumbList. O último item é a página atual.
export function PageBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav aria-label="Você está em" className="mb-6">
        <ol
          className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1">
                {isLast ? (
                  <span aria-current="page" className="text-foreground">
                    {crumb.name}
                  </span>
                ) : (
                  <>
                    <Link
                      href={crumb.path}
                      className="inline-flex min-h-11 items-center hover:text-foreground"
                    >
                      {crumb.name}
                    </Link>
                    <ChevronRight className="size-3.5" aria-hidden />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
