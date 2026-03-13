"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkOrderStatus, generatePixOrder } from "@/lib/actions/checkout";

type Props = {
  params: { orderId: string };
};

export default function CheckoutPaymentPage(_props: Props) {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [isLoadingPix, setIsLoadingPix] = useState(true);
  const [error, setError] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [digitableLine, setDigitableLine] = useState<string | null>(null);
  const [status, setStatus] = useState("PENDING");

  useEffect(() => {
    if (!orderId) return;

    let alive = true;

    const loadPix = async () => {
      setIsLoadingPix(true);
      const result = await generatePixOrder(orderId);

      if (!alive) return;

      if (!result.ok) {
        setError(result.error);
        setIsLoadingPix(false);
        return;
      }

      setQrCodeBase64(result.qrCodeBase64);
      setDigitableLine(result.digitableLine);
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 p-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Pagamento via PIX</h1>
        <p className="text-sm text-muted-foreground">
          Status atual: <strong>{status}</strong>
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        {isLoadingPix ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
            <Button asChild variant="outline" className="w-full">
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
                className="mx-auto size-64 rounded-md border border-border"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                QR Code nao retornado pela API. Use a linha digitavel.
              </p>
            )}

            {digitableLine && (
              <div className="rounded-lg border border-border bg-muted p-3 text-left">
                <p className="mb-1 text-xs text-muted-foreground">
                  Linha digitavel
                </p>
                <p className="break-all font-mono text-sm">{digitableLine}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Esta pagina verifica o status automaticamente a cada 3 segundos.
            </p>
          </div>
        )}
      </section>

      <Button asChild variant="outline">
        <Link href="/">Voltar ao catalogo</Link>
      </Button>
    </main>
  );
}
