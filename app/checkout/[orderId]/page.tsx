"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, QrCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkOrderStatus, generatePixOrder } from "@/lib/actions/checkout";

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [isLoadingPix, setIsLoadingPix] = useState(true);
  const [error, setError] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [digitableLine, setDigitableLine] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("PENDING");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    let alive = true;

    const loadPix = async () => {
      setIsLoadingPix(true);

      // Retrieve payer info from sessionStorage (set by checkout form)
      let payerInfo: {
        firstName: string;
        lastName: string;
        cpf: string;
        email: string;
      } | undefined;

      try {
        const stored = sessionStorage.getItem(`payer_${orderId}`);
        if (stored) {
          payerInfo = JSON.parse(stored);
          // Clean up after use
          sessionStorage.removeItem(`payer_${orderId}`);
        }
      } catch {
        // ignore parse errors
      }

      const result = await generatePixOrder(orderId, payerInfo);

      if (!alive) return;

      if (!result.ok) {
        setError(result.error);
        setIsLoadingPix(false);
        return;
      }

      setQrCodeBase64(result.qrCodeBase64);
      setDigitableLine(result.digitableLine);
      setTicketUrl(result.ticketUrl ?? null);
      setStatus(result.status ?? "PENDING");
      setIsLoadingPix(false);
    };

    void loadPix();

    return () => {
      alive = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(async () => {
      const result = await checkOrderStatus(orderId);
      if (!result.ok) return;

      setStatus(result.data.status);

      if (result.data.status === "PAID") {
        clearInterval(interval);
        router.push(`/checkout/success?orderId=${orderId}`);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, router]);

  const qrSrc = useMemo(() => {
    if (!qrCodeBase64) return null;
    return `data:image/png;base64,${qrCodeBase64}`;
  }, [qrCodeBase64]);

  const handleCopy = async () => {
    if (!digitableLine) return;
    await navigator.clipboard.writeText(digitableLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 p-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Pagamento via PIX</h1>
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-pastel-sage opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-pastel-sage" />
          </span>
          <p className="text-sm text-muted-foreground">
            Aguardando pagamento...
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        {isLoadingPix ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/cart">Voltar ao carrinho</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <QrCode className="size-6 text-primary" />
            </div>

            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt="QR Code PIX"
                className="mx-auto size-64 rounded-xl border border-border"
              />
            ) : ticketUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Clique no botão abaixo para abrir o pagamento Pix:
                </p>
                <Button asChild className="w-full rounded-xl">
                  <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                    Pagar via Pix
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                QR Code não retornado pela API. Use a linha digitável abaixo.
              </p>
            )}

            {digitableLine && (
              <div className="rounded-xl border border-border bg-muted p-3 text-left">
                <p className="mb-1 text-xs text-muted-foreground">
                  Pix Copia e Cola
                </p>
                <p className="break-all font-mono text-xs leading-relaxed">
                  {digitableLine}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 w-full rounded-lg text-xs"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 size-3" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 size-3" /> Copiar código
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Esta página verifica o status automaticamente a cada 3 segundos.
            </p>
          </div>
        )}
      </section>

      <Button asChild variant="outline" className="rounded-xl">
        <Link href="/">Voltar ao catálogo</Link>
      </Button>
    </main>
  );
}
