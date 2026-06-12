"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  CheckCircle,
  KeyRound,
  Shield,
  ArrowRight,
  Package,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useOrderHistoryStore } from "@/lib/store/order-history-store";
import { track } from "@vercel/analytics";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const addOrder = useOrderHistoryStore((s) => s.addOrder);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(false);

    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      const json = res.ok ? await res.json() : null;

      if (json?.ok) {
        setPickupCode(json.data.pickupCode);

        // Evento de funil — uma vez por pedido (revisitas não contam de novo)
        const trackedKey = `purchase_tracked_${orderId}`;
        if (!sessionStorage.getItem(trackedKey)) {
          sessionStorage.setItem(trackedKey, "1");
          track("purchase", { orderId });
        }

        // Save to local storage
        addOrder({
          orderId,
          pickupCode: json.data.pickupCode,
          email: "",
          total: 0,
          date: json.data.createdAt ?? new Date().toISOString(),
          status: json.data.status,
        });
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  }, [orderId, addOrder]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return (
    <div className="relative flex flex-col items-center gap-6">
      <div className="rounded-full bg-pastel-sage/30 p-5">
        <CheckCircle className="size-10 text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          Pedido confirmado!
        </h1>
        <p
          className="text-sm text-muted-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Seu pedido foi criado com sucesso.
        </p>
      </div>

      {/* Pickup code highlight */}
      <div className="w-full space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
          <KeyRound className="size-4" />
          <span>Seu código de retirada</span>
        </div>
        {loading ? (
          <p className="text-lg text-muted-foreground">Carregando...</p>
        ) : pickupCode ? (
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground">
            {pickupCode}
          </p>
        ) : fetchError ? (
          <div className="space-y-3">
            <p
              className="text-sm text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Não foi possível carregar seu código de retirada.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={fetchOrder}
            >
              <RefreshCw className="mr-2 size-4" />
              Tentar novamente
            </Button>
            {orderId && (
              <p
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Pedido #{orderId.slice(0, 8)}
              </p>
            )}
          </div>
        ) : (
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground">
            —
          </p>
        )}
      </div>

      {/* Security warning */}
      <div className="flex items-start gap-3 rounded-2xl bg-pastel-rose/15 p-4 text-left">
        <Shield className="mt-0.5 size-5 shrink-0 text-foreground/60" />
        <div>
          <p
            className="text-sm font-medium text-foreground"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Guarde seu código com segurança
          </p>
          <p
            className="mt-1 text-xs text-muted-foreground"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Este código é a única forma de retirar seu pedido no Dallas Motel.
            Não compartilhe com ninguém.
          </p>
        </div>
      </div>

      {/* Pickup info */}
      <div className="flex items-center gap-2 rounded-full bg-pastel-peach/20 px-4 py-2 text-sm text-foreground/70">
        <span style={{ fontFamily: "Inter, sans-serif" }}>
          Retirada: <strong>14h às 5h</strong> • Todos os dias
        </span>
      </div>

      {/* Actions */}
      <div className="flex w-full flex-col gap-3 pt-2">
        <Button className="h-12 rounded-full" asChild>
          <Link href="/pedidos">
            <Package className="mr-2 size-4" />
            Meus Pedidos
          </Link>
        </Button>
        <Button variant="outline" className="h-12 rounded-full" asChild>
          <Link href="/">
            Voltar ao Catálogo
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
        <Button variant="ghost" className="h-10 rounded-full text-sm" asChild>
          <Link href="/como-funciona">Como Funciona a Retirada</Link>
        </Button>
      </div>
    </div>
  );
}

function CheckoutSuccessSkeleton() {
  return (
    <div className="relative flex w-full animate-pulse flex-col items-center gap-6">
      <div className="size-20 rounded-full bg-muted" />
      <div className="flex w-full flex-col items-center gap-2">
        <div className="h-7 w-56 rounded bg-muted" />
        <div className="h-4 w-44 rounded bg-muted" />
      </div>
      <div className="h-32 w-full rounded-2xl bg-muted" />
      <div className="h-20 w-full rounded-2xl bg-muted" />
      <div className="flex w-full flex-col gap-3 pt-2">
        <div className="h-12 w-full rounded-full bg-muted" />
        <div className="h-12 w-full rounded-full bg-muted" />
        <div className="h-10 w-full rounded-full bg-muted" />
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-sage/10 via-background to-pastel-lavender/10" />
      <Suspense fallback={<CheckoutSuccessSkeleton />}>
        <CheckoutSuccessContent />
      </Suspense>
    </main>
  );
}
