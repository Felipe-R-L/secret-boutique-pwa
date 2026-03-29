"use client";

import React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, CheckCircle, Shield, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart-store";
import { initializeCheckout } from "@/lib/actions/checkout";

type DeliveryMethod = "MOTEL_PICKUP" | "ROOM_DELIVERY";

interface CheckoutFormProps {
  onSuccess: (orderId: string) => void;
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
  const [roomNumber, setRoomNumber] = useState("");
  const [pickupAtLobby, setPickupAtLobby] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { getTotal, clearCart, items } = useCartStore();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getDeliveryMethod = (): DeliveryMethod => {
    return pickupAtLobby ? "MOTEL_PICKUP" : "ROOM_DELIVERY";
  };

  const canGoToStepTwo = pickupAtLobby || roomNumber.trim().length > 0;

  const cpfDigits = cpf.replace(/\D/g, "");
  const emailsMatch =
    customerEmail.length > 0 &&
    customerEmail.toLowerCase() === emailConfirmation.toLowerCase();
  const canGoToStepThree =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    cpfDigits.length === 11 &&
    customerEmail.includes("@") &&
    emailsMatch;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    if (items.length === 0) {
      setSubmitError("Seu carrinho está vazio.");
      return;
    }

    if (!emailsMatch) {
      setSubmitError("Os emails não coincidem.");
      return;
    }

    setIsSubmitting(true);

    const result = await initializeCheckout({
      deliveryMethod: getDeliveryMethod(),
      roomNumber: pickupAtLobby ? undefined : roomNumber.trim(),
      customerName: `${firstName.trim()} ${lastName.trim()}`,
      customerEmail: customerEmail.trim(),
      payerFirstName: firstName.trim(),
      payerLastName: lastName.trim(),
      payerCpf: cpfDigits,
      paymentMethod: "PIX",
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
          <h3 className="font-medium text-foreground">1. Método de Retirada</h3>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <label htmlFor="pickup-toggle" className="text-sm text-foreground">
              Motel Pickup (retirar na portaria)
            </label>
            <Switch
              id="pickup-toggle"
              checked={pickupAtLobby}
              onCheckedChange={setPickupAtLobby}
            />
          </div>

          {!pickupAtLobby && (
            <div className="space-y-2">
              <label
                htmlFor="room-number"
                className="text-sm text-muted-foreground"
              >
                Número do quarto
              </label>
              <Input
                id="room-number"
                type="text"
                placeholder="Ex: 101"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          )}

          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={() => setStep(2)}
            disabled={!canGoToStepTwo}
          >
            Continuar
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">
            2. Dados para Pagamento
          </h3>

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
          <h3 className="font-medium text-foreground">3. Pagamento</h3>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <QrCode className="size-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">PIX (fixo)</p>
                <p className="text-xs text-muted-foreground">
                  O QR Code será gerado na etapa de pagamento.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">Resumo</p>
            <p className="mt-1 font-medium">
              Entrega:{" "}
              {pickupAtLobby
                ? "Motel Pickup"
                : `Entrega no Quarto (${roomNumber.trim()})`}
            </p>
            <p className="font-medium">
              Cliente: {firstName.trim()} {lastName.trim()}
            </p>
            <p className="font-medium">Email: {customerEmail.trim()}</p>
          </div>

          {submitError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatPrice(getTotal())}</span>
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
                    Finalizar Pedido
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
