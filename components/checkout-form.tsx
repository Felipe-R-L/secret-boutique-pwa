"use client";

import React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  CheckCircle,
  Shield,
  AlertCircle,
  DoorOpen,
  Store,
  BedDouble,
  Home,
  Loader2,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart-store";
import { initializeCheckout } from "@/lib/actions/checkout";
import { HOME_DELIVERY_FEE } from "@/lib/schemas";
import { useOrderHistoryStore } from "@/lib/store/order-history-store";
import { fetchAddressByCep, formatCep } from "@/lib/viacep";
import { track } from "@vercel/analytics";

type DeliveryMethod = "MOTEL_PICKUP" | "ROOM_DELIVERY" | "HOME_DELIVERY";
type PaymentMethod = "CARD" | "CASH" | "PIX";

interface CheckoutFormProps {
  onSuccess: (orderId: string) => void;
}

const DELIVERY_OPTIONS: Array<{
  method: DeliveryMethod;
  title: string;
  description: string;
  icon: typeof Store;
}> = [
  {
    method: "MOTEL_PICKUP",
    title: "Retirar na recepção",
    description: "Retire e pague na portaria.",
    icon: Store,
  },
  {
    method: "ROOM_DELIVERY",
    title: "Entrega no quarto",
    description: "Levamos até o seu quarto. Pague na entrega.",
    icon: BedDouble,
  },
  {
    method: "HOME_DELIVERY",
    title: "Entrega a domicílio",
    description: `Entrega no seu endereço (+ ${new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(HOME_DELIVERY_FEE)} de frete).`,
    icon: Home,
  },
];

const PAYMENT_OPTIONS: Array<{
  method: PaymentMethod;
  title: string;
  description: string;
  icon: typeof Store;
}> = [
  {
    method: "CARD",
    title: "Cartão na entrega",
    description: "Débito ou crédito na maquininha.",
    icon: CreditCard,
  },
  {
    method: "CASH",
    title: "Dinheiro na entrega",
    description: "Levamos troco se precisar.",
    icon: Banknote,
  },
  {
    method: "PIX",
    title: "Pix agora",
    description: "Pague online. Pede nome, CPF e e-mail.",
    icon: QrCode,
  },
];

function parseBrl(value: string): number | null {
  const normalized = value.replace(/[^\d,]/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function CheckoutForm({ onSuccess }: CheckoutFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("MOTEL_PICKUP");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomFromQr, setRoomFromQr] = useState(false);
  const [confirmRoomOpen, setConfirmRoomOpen] = useState(false);

  // Endereço (entrega a domicílio)
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  useEffect(() => {
    try {
      const savedRoom = sessionStorage.getItem("sb-room")?.trim();
      if (savedRoom) {
        setRoomNumber(savedRoom);
        setDeliveryMethod("ROOM_DELIVERY");
        setRoomFromQr(true);
      }
    } catch {
      // armazenamento bloqueado — mantém o default (recepção)
    }
  }, []);

  // Dentro do motel o padrão é pagar na entrega, sem cadastro. Pix fica como
  // opção (e é obrigatório na entrega a domicílio).
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [cashChangeFor, setCashChangeFor] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { getTotal, clearCart, items } = useCartStore();
  const addOrderToHistory = useOrderHistoryStore((s) => s.addOrder);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const isHome = deliveryMethod === "HOME_DELIVERY";
  const isRoom = deliveryMethod === "ROOM_DELIVERY";
  const deliveryFee = isHome ? HOME_DELIVERY_FEE : 0;
  const orderTotal = getTotal() + deliveryFee;
  // Entrega a domicílio só aceita Pix.
  const effectivePayment: PaymentMethod = isHome ? "PIX" : paymentMethod;
  const isPix = effectivePayment === "PIX";
  const cashChangeValue = parseBrl(cashChangeFor);
  const cashChangeInvalid =
    effectivePayment === "CASH" &&
    cashChangeValue !== null &&
    cashChangeValue < orderTotal;
  const cepDigitsOnly = cep.replace(/\D/g, "");

  const addressComplete =
    cepDigitsOnly.length === 8 &&
    street.trim().length > 0 &&
    addressNumber.trim().length > 0 &&
    neighborhood.trim().length > 0 &&
    city.trim().length > 0 &&
    uf.trim().length > 0;

  const canGoToStepTwo = isRoom
    ? roomNumber.trim().length > 0
    : isHome
      ? addressComplete
      : true;

  const cpfDigits = cpf.replace(/\D/g, "");
  const emailsMatch =
    customerEmail.length > 0 &&
    customerEmail.toLowerCase() === emailConfirmation.toLowerCase();
  const pixDataComplete =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    cpfDigits.length === 11 &&
    customerEmail.includes("@") &&
    emailsMatch;
  const canGoToStepThree = isPix ? pixDataComplete : !cashChangeInvalid;

  const handleCepLookup = async (rawCep: string) => {
    setCepError("");
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const address = await fetchAddressByCep(digits);
      setStreet(address.street);
      setNeighborhood(address.neighborhood);
      setCity(address.city);
      setUf(address.state);
    } catch (error) {
      setCepError(
        error instanceof Error ? error.message : "Erro ao consultar o CEP",
      );
    } finally {
      setCepLoading(false);
    }
  };

  const deliveryLabel = (() => {
    if (isRoom) return `Entrega no Quarto (${roomNumber.trim()})`;
    if (isHome) return "Entrega a domicílio";
    return "Retirar na recepção";
  })();

  const paymentLabel = (() => {
    if (effectivePayment === "PIX") return "Pix (pagamento online)";
    const where = isRoom ? "na entrega" : "na retirada";
    if (effectivePayment === "CARD") return `Cartão ${where}`;
    return cashChangeValue
      ? `Dinheiro ${where} — troco para ${formatPrice(cashChangeValue)}`
      : `Dinheiro ${where} — sem troco`;
  })();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    if (items.length === 0) {
      setSubmitError("Seu carrinho está vazio.");
      return;
    }

    if (isPix && !emailsMatch) {
      setSubmitError("Os emails não coincidem.");
      return;
    }

    setIsSubmitting(true);
    track("begin_checkout", {
      items: items.length,
      total: orderTotal,
      payment: effectivePayment,
    });

    const pixPayer = isPix
      ? {
          customerName: `${firstName.trim()} ${lastName.trim()}`,
          customerEmail: customerEmail.trim(),
          payerFirstName: firstName.trim(),
          payerLastName: lastName.trim(),
          payerCpf: cpfDigits,
        }
      : {};

    const result = await initializeCheckout({
      deliveryMethod,
      roomNumber: isRoom ? roomNumber.trim() : undefined,
      deliveryCep: isHome ? cepDigitsOnly : undefined,
      deliveryStreet: isHome ? street.trim() : undefined,
      deliveryNumber: isHome ? addressNumber.trim() : undefined,
      deliveryComplement: isHome ? complement.trim() || undefined : undefined,
      deliveryNeighborhood: isHome ? neighborhood.trim() : undefined,
      deliveryCity: isHome ? city.trim() : undefined,
      deliveryState: isHome ? uf.trim().toUpperCase() : undefined,
      ...pixPayer,
      paymentMethod: effectivePayment,
      cashChangeFor:
        effectivePayment === "CASH" && cashChangeValue
          ? cashChangeValue
          : undefined,
      items: items.map((item) => ({
        productId: item.product.id,
        variantId: item.variant?.id,
        quantity: item.quantity,
      })),
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    if (!isPix) {
      // Sem pagamento online: o pedido já está com a recepção.
      addOrderToHistory({
        orderId: result.orderId,
        pickupCode: result.pickupCode,
        email: "",
        total: result.totalAmount,
        date: new Date().toISOString(),
        status: "PENDING",
        paymentMethod: result.paymentMethod,
        deliveryMethod,
        roomNumber: isRoom ? roomNumber.trim() : null,
      });
      clearCart();
      onSuccess(result.orderId);
      router.push(`/checkout/success?orderId=${result.orderId}`);
      return;
    }

    // Store payer info in sessionStorage for the payment page (not persisted)
    sessionStorage.setItem(
      `payer_${result.orderId}`,
      JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cpf: cpfDigits,
        email: customerEmail.trim(),
      }),
    );

    clearCart();
    onSuccess(result.orderId);
    router.push(`/checkout/${result.orderId}`);
  };

  const handleContinueFromStepOne = () => {
    if (isRoom) {
      setConfirmRoomOpen(true);
    } else {
      setStep(2);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {[1, 2, 3].map((currentStep) => (
          <div
            key={currentStep}
            className={cn(
              "rounded-full px-3 py-1",
              currentStep === step
                ? "bg-primary text-primary-foreground"
                : currentStep < step
                  ? "bg-pastel-sage/40 text-foreground"
                  : "bg-muted text-muted-foreground",
            )}
          >
            Etapa {currentStep}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">1. Método de Entrega</h3>

          <div className="space-y-3">
            {DELIVERY_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = deliveryMethod === option.method;
              return (
                <button
                  key={option.method}
                  type="button"
                  onClick={() => {
                    setDeliveryMethod(option.method);
                    if (option.method !== "ROOM_DELIVERY") {
                      setRoomFromQr(false);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full",
                      selected
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {option.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "size-4 rounded-full border-2",
                      selected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {isRoom && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-center">
              <label
                htmlFor="room-number"
                className="block text-sm font-medium text-foreground"
              >
                Número do quarto
              </label>
              <div className="flex justify-center">
                <Input
                  id="room-number"
                  type="text"
                  inputMode="numeric"
                  placeholder="000"
                  maxLength={10}
                  value={roomNumber}
                  onChange={(e) => {
                    setRoomNumber(e.target.value);
                    setRoomFromQr(false);
                  }}
                  className="size-24 rounded-2xl border-2 text-center font-sans !text-3xl font-bold tracking-wider md:size-28"
                />
              </div>
              <p
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {roomFromQr
                  ? "Quarto identificado pelo QR Code — confira se é o seu."
                  : "Confira o número na porta ou na chave do quarto."}
              </p>
            </div>
          )}

          {isHome && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="space-y-2">
                <label htmlFor="cep" className="text-sm text-muted-foreground">
                  CEP
                </label>
                <div className="relative">
                  <Input
                    id="cep"
                    type="text"
                    inputMode="numeric"
                    placeholder="00000-000"
                    value={cep}
                    maxLength={9}
                    onChange={(e) => {
                      const masked = formatCep(e.target.value);
                      setCep(masked);
                      if (masked.replace(/\D/g, "").length === 8) {
                        void handleCepLookup(masked);
                      }
                    }}
                    onBlur={(e) => void handleCepLookup(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-3.5 size-5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {cepError && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3" />
                    {cepError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="street"
                  className="text-sm text-muted-foreground"
                >
                  Rua / Logradouro
                </label>
                <Input
                  id="street"
                  type="text"
                  placeholder="Rua, avenida..."
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="address-number"
                    className="text-sm text-muted-foreground"
                  >
                    Número
                  </label>
                  <Input
                    id="address-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label
                    htmlFor="complement"
                    className="text-sm text-muted-foreground"
                  >
                    Complemento (opcional)
                  </label>
                  <Input
                    id="complement"
                    type="text"
                    placeholder="Apto, bloco..."
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="neighborhood"
                  className="text-sm text-muted-foreground"
                >
                  Bairro
                </label>
                <Input
                  id="neighborhood"
                  type="text"
                  placeholder="Bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <label
                    htmlFor="city"
                    className="text-sm text-muted-foreground"
                  >
                    Cidade
                  </label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="uf" className="text-sm text-muted-foreground">
                    UF
                  </label>
                  <Input
                    id="uf"
                    type="text"
                    placeholder="UF"
                    maxLength={2}
                    value={uf}
                    onChange={(e) =>
                      setUf(e.target.value.toUpperCase().slice(0, 2))
                    }
                    className="h-12 rounded-xl uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={handleContinueFromStepOne}
            disabled={!canGoToStepTwo}
          >
            Continuar
          </Button>

          {/* Confirmação do quarto — evita pedido entregue na porta errada */}
          <AlertDialog open={confirmRoomOpen} onOpenChange={setConfirmRoomOpen}>
            <AlertDialogContent className="max-w-xs rounded-3xl text-center">
              <AlertDialogHeader className="items-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-pastel-lavender/30">
                  <DoorOpen className="size-6 text-primary" />
                </div>
                <AlertDialogTitle>Confirme o quarto</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    <span className="block font-sans text-4xl font-bold tracking-wider text-foreground">
                      {roomNumber.trim()}
                    </span>
                    <span
                      className="mt-2 block text-sm"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Seu pedido será entregue neste quarto. O número está
                      correto?
                    </span>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                <AlertDialogAction
                  className="w-full rounded-full"
                  onClick={() => setStep(2)}
                >
                  Sim, é esse
                </AlertDialogAction>
                <AlertDialogCancel className="w-full rounded-full">
                  Corrigir número
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">2. Pagamento</h3>

          {isHome ? (
            <p className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
              Entregas a domicílio são pagas online, via Pix.
            </p>
          ) : (
            <div className="space-y-3">
              {PAYMENT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = paymentMethod === option.method;
                const description =
                  option.method === "PIX"
                    ? option.description
                    : `${option.description} ${isRoom ? "Na porta do quarto." : "Na recepção."}`;
                return (
                  <button
                    key={option.method}
                    type="button"
                    onClick={() => setPaymentMethod(option.method)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full",
                        selected
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {option.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "size-4 rounded-full border-2",
                        selected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {!isPix && (
            <div className="flex items-start gap-3 rounded-xl bg-pastel-lavender/15 p-3">
              <Shield className="mt-0.5 size-4 shrink-0 text-primary/60" />
              <p
                className="text-xs leading-relaxed text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <strong>Sem cadastro.</strong> Não pedimos nome, CPF nem e-mail
                — você só paga quando receber o pedido, em embalagem discreta.
              </p>
            </div>
          )}

          {effectivePayment === "CASH" && (
            <div className="space-y-2">
              <label
                htmlFor="cash-change"
                className="text-sm text-muted-foreground"
              >
                Troco para quanto? (opcional)
              </label>
              <Input
                id="cash-change"
                type="text"
                inputMode="decimal"
                placeholder={`Ex.: ${formatPrice(Math.ceil(orderTotal / 50) * 50 || 50)}`}
                value={cashChangeFor}
                onChange={(e) => setCashChangeFor(e.target.value)}
                className={cn(
                  "h-12 rounded-xl",
                  cashChangeInvalid && "border-destructive ring-destructive/20",
                )}
              />
              {cashChangeInvalid ? (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" />O valor precisa ser maior
                  que o total ({formatPrice(orderTotal)}).
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Deixe em branco se for pagar o valor exato.
                </p>
              )}
            </div>
          )}

          {isPix && (
            <>
              {/* CPF/Name disclaimer */}
              <div className="flex items-start gap-3 rounded-xl bg-pastel-lavender/15 p-3">
                <Shield className="mt-0.5 size-4 shrink-0 text-primary/60" />
                <p
                  className="text-xs leading-relaxed text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  O CPF e nome completo são exigidos pelo{" "}
                  <strong>Banco Central</strong> para pagamentos via Pix.{" "}
                  <strong>Não armazenamos</strong> essas informações — elas são
                  enviadas diretamente ao processador de pagamento.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="first-name"
                    className="text-sm text-muted-foreground"
                  >
                    Nome
                  </label>
                  <Input
                    id="first-name"
                    type="text"
                    placeholder="Seu nome"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="last-name"
                    className="text-sm text-muted-foreground"
                  >
                    Sobrenome
                  </label>
                  <Input
                    id="last-name"
                    type="text"
                    placeholder="Seu sobrenome"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="cpf" className="text-sm text-muted-foreground">
                  CPF
                </label>
                <Input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  className="h-12 rounded-xl"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="customer-email"
                  className="text-sm text-muted-foreground"
                >
                  Email
                </label>
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="voce@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email-confirm"
                  className="text-sm text-muted-foreground"
                >
                  Confirme o email
                </label>
                <Input
                  id="email-confirm"
                  type="email"
                  placeholder="Repita seu email"
                  value={emailConfirmation}
                  onChange={(e) => setEmailConfirmation(e.target.value)}
                  className={cn(
                    "h-12 rounded-xl",
                    emailConfirmation.length > 0 &&
                      !emailsMatch &&
                      "border-destructive ring-destructive/20",
                  )}
                />
                {emailConfirmation.length > 0 && !emailsMatch && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3" />
                    Os emails não coincidem
                  </p>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setStep(1)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => setStep(3)}
              disabled={!canGoToStepThree}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">3. Confirmar pedido</h3>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              {effectivePayment === "PIX" ? (
                <QrCode className="size-6 text-primary" />
              ) : effectivePayment === "CARD" ? (
                <CreditCard className="size-6 text-primary" />
              ) : (
                <Banknote className="size-6 text-primary" />
              )}
              <div>
                <p className="text-sm font-medium text-primary">
                  {paymentLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPix
                    ? "O QR Code será gerado na etapa de pagamento."
                    : isRoom
                      ? "Você paga quando o pedido chegar ao quarto."
                      : "Você paga quando retirar o pedido na recepção."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">Resumo</p>
            <p className="mt-1 font-medium">Entrega: {deliveryLabel}</p>
            {isHome && (
              <p className="text-xs text-muted-foreground">
                {street.trim()}, {addressNumber.trim()}
                {complement.trim() ? ` - ${complement.trim()}` : ""} —{" "}
                {neighborhood.trim()}, {city.trim()}/{uf.trim().toUpperCase()} —
                CEP {cep.trim()}
              </p>
            )}
            {isPix && (
              <>
                <p className="mt-1 font-medium">
                  Cliente: {firstName.trim()} {lastName.trim()}
                </p>
                <p className="font-medium">Email: {customerEmail.trim()}</p>
              </>
            )}
          </div>

          {submitError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(getTotal())}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Frete</span>
              <span>
                {deliveryFee > 0 ? formatPrice(deliveryFee) : "Grátis"}
              </span>
            </div>
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatPrice(orderTotal)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
              >
                Voltar
              </Button>

              <Button
                type="submit"
                className="w-full rounded-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Processando..."
                ) : (
                  <>
                    <CheckCircle className="size-5" />
                    {isPix ? "Finalizar Pedido" : "Confirmar Pedido"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
