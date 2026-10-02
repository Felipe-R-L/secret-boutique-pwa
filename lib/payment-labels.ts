// Textos das formas de pagamento, compartilhados entre o site, o painel e as
// notificações push.

import { formatCents } from "@/lib/money";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix",
  CARD: "Cartão",
  CASH: "Dinheiro",
};

/** "Cartão na maquininha" ou "Dinheiro — troco p/ R$ 100,00". */
export function describeInPersonPayment(
  method: string,
  cashChangeForCents?: number | null,
): string {
  if (method === "CASH") {
    return cashChangeForCents
      ? `Dinheiro — troco p/ ${formatCents(cashChangeForCents)}`
      : "Dinheiro — sem troco";
  }
  if (method === "CARD") return "Cartão na maquininha";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/** Troco que a recepção precisa levar, em centavos, ou null quando não há. */
export function cashChangeDueCents(
  cashChangeForCents: number | null | undefined,
  totalCents: number,
): number | null {
  if (!cashChangeForCents) return null;
  const due = cashChangeForCents - totalCents;
  return due > 0 ? due : null;
}
