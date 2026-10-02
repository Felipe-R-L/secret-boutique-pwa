// Textos das formas de pagamento, compartilhados entre o site, o painel e as
// notificações push.

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix",
  CARD: "Cartão",
  CASH: "Dinheiro",
};

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** "Cartão na maquininha" ou "Dinheiro — troco p/ R$ 100,00". */
export function describeInPersonPayment(
  method: string,
  cashChangeFor?: number | null,
): string {
  if (method === "CASH") {
    return cashChangeFor
      ? `Dinheiro — troco p/ ${formatBrl(Number(cashChangeFor))}`
      : "Dinheiro — sem troco";
  }
  if (method === "CARD") return "Cartão na maquininha";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/** Troco que a recepção precisa levar, ou null quando não há. */
export function cashChangeDue(
  cashChangeFor: number | null | undefined,
  totalAmount: number,
): number | null {
  if (!cashChangeFor) return null;
  const due = Number((Number(cashChangeFor) - Number(totalAmount)).toFixed(2));
  return due > 0 ? due : null;
}
