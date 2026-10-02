"use client";

import { formatCents, parseBrlToCents } from "@/lib/money";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  Store,
  BedDouble,
  X,
  CreditCard,
  Banknote,
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createReceptionOrder,
  confirmInPersonPayment,
} from "@/lib/actions/reception";
import {
  cashChangeDueCents,
  describeInPersonPayment,
} from "@/lib/payment-labels";
import { generatePixOrder, checkOrderStatus } from "@/lib/actions/checkout";

type VariantOption = {
  id: string;
  label: string;
  price_cents: number;
  stock_quantity: number;
  in_stock: boolean;
};

type ProductOption = {
  id: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
  in_stock: boolean;
  imageUrl: string | null;
  variants: VariantOption[];
};

type CartLine = {
  key: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  unitPriceCents: number;
  quantity: number;
  maxStock: number;
};

type DeliveryMethod = "MOTEL_PICKUP" | "ROOM_DELIVERY";
type PaymentMethod = "PIX" | "CARD" | "CASH";
// registered: pedido de cartão/dinheiro para o quarto, a cobrar na entrega.
type Phase = "building" | "paying" | "paid" | "registered";

function lineKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? "base"}`;
}

export function ReceptionPos({ products }: { products: ProductOption[] }) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [variantPicker, setVariantPicker] = useState<ProductOption | null>(null);

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("MOTEL_PICKUP");
  const [roomNumber, setRoomNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [cashChangeFor, setCashChangeFor] = useState("");

  const [phase, setPhase] = useState<Phase>("building");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [digitableLine, setDigitableLine] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [status, setStatus] = useState("PENDING");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalCents = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0),
    [cart],
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, search]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const addLine = (product: ProductOption, variant?: VariantOption) => {
    const key = lineKey(product.id, variant?.id);
    const maxStock = variant ? variant.stock_quantity : product.stock_quantity;
    setCart((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key
            ? {
                ...line,
                quantity: Math.min(line.quantity + 1, Math.max(maxStock, 1)),
              }
            : line,
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          productName: product.name,
          variantId: variant?.id,
          variantLabel: variant?.label,
          unitPriceCents: variant?.price_cents ?? product.price_cents,
          quantity: 1,
          maxStock,
        },
      ];
    });
  };

  const handleProductClick = (product: ProductOption) => {
    if (product.variants.length > 0) {
      setVariantPicker(product);
      return;
    }
    addLine(product);
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((line) => {
        if (line.key !== key) return [line];
        const next = line.quantity + delta;
        if (next <= 0) return [];
        return [{ ...line, quantity: Math.min(next, Math.max(line.maxStock, 1)) }];
      }),
    );
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((line) => line.key !== key));
  };

  const resetSale = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setCart([]);
    setSearch("");
    setDeliveryMethod("MOTEL_PICKUP");
    setRoomNumber("");
    setCustomerName("");
    setPaymentMethod("CARD");
    setCashChangeFor("");
    setPhase("building");
    setOrderId(null);
    setQrCodeBase64(null);
    setDigitableLine(null);
    setTicketUrl(null);
    setPickupCode(null);
    setStatus("PENDING");
    setError("");
    setCopied(false);
  };

  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const result = await checkOrderStatus(id);
      if (!result.ok) return;
      setStatus(result.data.status);
      if (result.data.status === "PAID") {
        if (pollRef.current) clearInterval(pollRef.current);
        setPickupCode(result.data.pickupCode ?? null);
        setPhase("paid");
      }
    }, 3000);
  };

  const cashChangeCents = parseBrlToCents(cashChangeFor);
  const cashChangeInvalid =
    paymentMethod === "CASH" &&
    cashChangeCents !== null &&
    cashChangeCents < totalCents;
  const changeDueCents =
    paymentMethod === "CASH"
      ? cashChangeDueCents(cashChangeCents, totalCents)
      : null;

  const validateSale = () => {
    if (cart.length === 0) {
      setError("Adicione ao menos um produto.");
      return false;
    }
    if (deliveryMethod === "ROOM_DELIVERY" && roomNumber.trim().length === 0) {
      setError("Informe o número do quarto.");
      return false;
    }
    if (cashChangeInvalid) {
      setError("O valor para troco precisa ser maior que o total.");
      return false;
    }
    return true;
  };

  const buildOrderInput = (settleNow: boolean) => ({
    items: cart.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
    })),
    deliveryMethod,
    roomNumber:
      deliveryMethod === "ROOM_DELIVERY" ? roomNumber.trim() : undefined,
    customerName: customerName.trim() || undefined,
    paymentMethod,
    cashChangeForCents:
      paymentMethod === "CASH" && cashChangeCents ? cashChangeCents : undefined,
    settleNow,
  });

  // Cartão/dinheiro: no balcão o valor já foi recebido e a venda fecha agora;
  // para o quarto, o pedido fica "a cobrar na entrega" no painel de pedidos.
  const handleInPersonSale = async () => {
    setError("");
    if (!validateSale()) return;

    const settleNow = deliveryMethod === "MOTEL_PICKUP";
    setIsSubmitting(true);
    const created = await createReceptionOrder(buildOrderInput(settleNow));
    setIsSubmitting(false);

    if (!created.ok) {
      setError(created.error);
      return;
    }

    setOrderId(created.orderId);
    setPickupCode(created.pickupCode);
    setPhase(settleNow ? "paid" : "registered");
  };

  const handleGenerate = async () => {
    setError("");
    if (!validateSale()) return;

    setIsSubmitting(true);

    const created = await createReceptionOrder(buildOrderInput(false));

    if (!created.ok) {
      setIsSubmitting(false);
      setError(created.error);
      return;
    }

    setOrderId(created.orderId);
    setPhase("paying");

    const pix = await generatePixOrder(created.orderId);
    setIsSubmitting(false);

    if (!pix.ok) {
      setError(
        `Pedido criado, mas falhou ao gerar o Pix: ${pix.error}. Você pode confirmar manualmente ao receber.`,
      );
    } else {
      setQrCodeBase64(pix.qrCodeBase64);
      setDigitableLine(pix.digitableLine);
      setTicketUrl(pix.ticketUrl ?? null);
      setStatus(pix.status ?? "PENDING");
    }

    startPolling(created.orderId);
  };

  // Cobrança Pix que o cliente acabou pagando na maquininha ou em dinheiro.
  const handleMarkPaid = async (method: "CARD" | "CASH") => {
    if (!orderId) return;
    setIsConfirming(true);
    setError("");
    const result = await confirmInPersonPayment({
      orderId,
      method,
      // No balcão o cliente leva na hora; no quarto segue o fluxo de entrega.
      complete: deliveryMethod === "MOTEL_PICKUP",
    });
    setIsConfirming(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (pollRef.current) clearInterval(pollRef.current);
    setPickupCode(result.pickupCode ?? null);
    setPhase("paid");
  };

  const handleCopy = async () => {
    if (!digitableLine) return;
    await navigator.clipboard.writeText(digitableLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrSrc = qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null;

  // ---- PAID ----
  if (phase === "paid") {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="size-9 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-green-800">Pagamento confirmado</h3>
        <p className="text-sm text-green-700">
          {deliveryMethod === "ROOM_DELIVERY"
            ? `Prepare o pedido e leve ao quarto ${roomNumber.trim()}.`
            : "Pode entregar o pedido ao cliente."}
        </p>
        {pickupCode && (
          <div className="rounded-xl border border-green-200 bg-white p-3">
            <p className="text-xs text-muted-foreground">Código de retirada</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-foreground">
              {pickupCode}
            </p>
          </div>
        )}
        <Button className="w-full rounded-xl" onClick={resetSale}>
          Nova venda
        </Button>
      </div>
    );
  }

  // ---- REGISTERED (cobrar na entrega) ----
  if (phase === "registered") {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-purple-200 bg-purple-50 p-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-purple-100">
          <HandCoins className="size-9 text-purple-700" />
        </div>
        <h3 className="text-xl font-semibold text-purple-900">
          Pedido registrado — quarto {roomNumber.trim()}
        </h3>
        <div className="rounded-xl border border-purple-200 bg-white p-3">
          <p className="text-xs text-muted-foreground">Cobrar na entrega</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCents(totalCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            {describeInPersonPayment(paymentMethod, cashChangeCents)}
          </p>
          {changeDueCents && (
            <p className="mt-1 text-sm font-medium text-purple-800">
              Levar {formatCents(changeDueCents)} de troco
            </p>
          )}
        </div>
        <p className="text-sm text-purple-800">
          Ao entregar, confirme o recebimento em Pedidos → A cobrar.
        </p>
        <Button className="w-full rounded-xl" onClick={resetSale}>
          Nova venda
        </Button>
      </div>
    );
  }

  // ---- PAYING ----
  if (phase === "paying") {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-pastel-sage opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-pastel-sage" />
            </span>
            Aguardando pagamento — {formatCents(totalCents)}
          </div>

          {isSubmitting ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrSrc}
                  alt="QR Code PIX"
                  className="mx-auto size-64 rounded-xl border border-border"
                />
              ) : ticketUrl ? (
                <Button asChild className="w-full rounded-xl">
                  <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                    Abrir Pix
                  </a>
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                  <QrCode className="size-8" />
                  <p className="text-sm">QR não disponível — use copia e cola.</p>
                </div>
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
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2">
          <p className="pt-1 text-center text-xs text-muted-foreground">
            Cliente pagou de outro jeito?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={() => handleMarkPaid("CARD")}
              disabled={isConfirming}
            >
              <CreditCard className="mr-1 size-4" />
              {isConfirming ? "..." : "Recebi no cartão"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={() => handleMarkPaid("CASH")}
              disabled={isConfirming}
            >
              <Banknote className="mr-1 size-4" />
              {isConfirming ? "..." : "Recebi em dinheiro"}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-muted-foreground"
            onClick={resetSale}
          >
            Cancelar venda
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          O status atualiza sozinho a cada 3 segundos.
        </p>
      </div>
    );
  }

  // ---- BUILDING ----
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Catálogo */}
      <section className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="h-11 rounded-xl pl-9"
          />
        </div>

        <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {filteredProducts.map((product) => {
            const available =
              product.in_stock &&
              (product.variants.length > 0 || product.stock_quantity > 0);
            return (
              <button
                key={product.id}
                type="button"
                disabled={!available}
                onClick={() => handleProductClick(product)}
                className="flex flex-col rounded-xl border border-border bg-card p-2 text-left transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="line-clamp-2 text-xs font-medium text-foreground">
                  {product.name}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {product.variants.length > 0
                    ? "A partir de "
                    : ""}
                  {formatCents(
                    product.variants.length > 0
                      ? Math.min(...product.variants.map((v) => v.price_cents))
                      : product.price_cents,
                  )}
                </span>
                {product.variants.length > 0 && (
                  <span className="mt-0.5 text-[10px] text-primary">
                    {product.variants.length} variantes
                  </span>
                )}
              </button>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          )}
        </div>
      </section>

      {/* Pedido */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <h3 className="text-base font-semibold">Pedido</h3>

        {cart.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Toque nos produtos para adicionar.
          </p>
        ) : (
          <div className="space-y-2">
            {cart.map((line) => (
              <div
                key={line.key}
                className="flex items-center gap-2 rounded-lg border border-border p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {line.productName}
                  </p>
                  {line.variantLabel && (
                    <p className="truncate text-xs text-muted-foreground">
                      {line.variantLabel}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatCents(line.unitPriceCents)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-7 rounded-full"
                    onClick={() => changeQty(line.key, -1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">
                    {line.quantity}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-7 rounded-full"
                    onClick={() => changeQty(line.key, 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 rounded-full text-destructive"
                    onClick={() => removeLine(line.key)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Entrega */}
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Entrega</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeliveryMethod("MOTEL_PICKUP")}
              className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${
                deliveryMethod === "MOTEL_PICKUP"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border"
              }`}
            >
              <Store className="size-4" /> Recepção
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod("ROOM_DELIVERY")}
              className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${
                deliveryMethod === "ROOM_DELIVERY"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border"
              }`}
            >
              <BedDouble className="size-4" /> Quarto
            </button>
          </div>
          {deliveryMethod === "ROOM_DELIVERY" && (
            <Input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              inputMode="numeric"
              placeholder="Número do quarto"
              className="h-10 rounded-lg"
            />
          )}
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nome do cliente (opcional)"
            className="h-10 rounded-lg"
          />
        </div>

        {/* Pagamento */}
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Pagamento</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { method: "CARD", label: "Cartão", icon: CreditCard },
                { method: "CASH", label: "Dinheiro", icon: Banknote },
                { method: "PIX", label: "Pix", icon: QrCode },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.method}
                  type="button"
                  onClick={() => setPaymentMethod(option.method)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs ${
                    paymentMethod === option.method
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <Icon className="size-4" /> {option.label}
                </button>
              );
            })}
          </div>
          {paymentMethod === "CASH" && (
            <>
              <Input
                value={cashChangeFor}
                onChange={(e) => setCashChangeFor(e.target.value)}
                inputMode="decimal"
                placeholder="Troco para quanto? (opcional)"
                className="h-10 rounded-lg"
              />
              {changeDueCents && (
                <p className="text-xs text-muted-foreground">
                  Troco: {formatCents(changeDueCents)}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>{formatCents(totalCents)}</span>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {paymentMethod === "PIX" ? (
          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={handleGenerate}
            disabled={isSubmitting || cart.length === 0}
          >
            {isSubmitting ? "Gerando..." : "Gerar cobrança Pix"}
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={handleInPersonSale}
            disabled={isSubmitting || cart.length === 0}
          >
            {isSubmitting
              ? "Registrando..."
              : deliveryMethod === "MOTEL_PICKUP"
                ? `Recebi ${formatCents(totalCents)} — finalizar venda`
                : "Registrar pedido — cobrar na entrega"}
          </Button>
        )}
      </section>

      {/* Seletor de variante */}
      {variantPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{variantPicker.name}</h4>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 rounded-full"
                onClick={() => setVariantPicker(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Escolha a variante:</p>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {variantPicker.variants.map((variant) => {
                const available = variant.in_stock && variant.stock_quantity > 0;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      addLine(variantPicker, variant);
                      setVariantPicker(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left text-sm transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>
                      {variant.label}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {available ? `${variant.stock_quantity} un.` : "esgotado"}
                      </span>
                    </span>
                    <span className="font-medium">
                      {formatCents(variant.price_cents)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
