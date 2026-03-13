"use client";

import React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, CheckCircle } from "lucide-react";
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

export function CheckoutForm({ onSuccess }: CheckoutFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [roomNumber, setRoomNumber] = useState("");
  const [pickupAtLobby, setPickupAtLobby] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
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
  const canGoToStepThree =
    customerName.trim().length > 1 && customerEmail.includes("@");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    if (items.length === 0) {
      setSubmitError("Seu carrinho esta vazio.");
      return;
    }

    setIsSubmitting(true);

    const result = await initializeCheckout({
      deliveryMethod: getDeliveryMethod(),
      roomNumber: pickupAtLobby ? undefined : roomNumber.trim(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      paymentMethod: "PIX",
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

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
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground",
            )}
          >
            Etapa {currentStep}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">1. Metodo de Retirada</h3>

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
                Numero do quarto
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
            className="w-full"
            onClick={() => setStep(2)}
            disabled={!canGoToStepTwo}
          >
            Continuar
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">2. Dados do Cliente</h3>

          <div className="space-y-2">
            <label
              htmlFor="customer-name"
              className="text-sm text-muted-foreground"
            >
              Nome ou apelido
            </label>
            <Input
              id="customer-name"
              type="text"
              placeholder="Como devemos chamar voce"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-12 rounded-xl"
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

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button
              type="button"
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
                  O QR Code sera gerado na etapa de pagamento.
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
                : `Room Delivery (${roomNumber.trim()})`}
            </p>
            <p className="font-medium">Cliente: {customerName.trim()}</p>
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
