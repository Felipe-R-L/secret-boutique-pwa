// Dinheiro é sempre um inteiro em centavos (R$ 49,90 = 4990), no banco e no
// código. Reais com casas decimais só existem nas bordas: o que o usuário
// digita (parseBrlToCents), o que aparece na tela (formatCents) e o que vai
// para o Mercado Pago (centsToDecimalString).

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function isCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

/** 4990 → "R$ 49,90". */
export function formatCents(cents: number): string {
  return brlFormatter.format(cents / 100);
}

/** 4990 → "49.90" (formato decimal que APIs como o Mercado Pago esperam). */
export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}${reais}.${rest}`;
}

/**
 * Lê um valor digitado em reais e devolve centavos, sem passar por float.
 *
 * Aceita vírgula ou ponto como separador decimal, porque muitos teclados de
 * celular só mostram o ponto: "50", "50,00", "50.00", "50,5", "1.234,56",
 * "1,234.56" e "R$ 50" funcionam. O último separador seguido de 1 ou 2
 * dígitos é o decimal; os demais são de milhar ("1.000" = mil reais).
 */
export function parseBrlToCents(input: string): number | null {
  const value = input.replace(/R\$|\s/g, "");
  if (!value || !/^[\d.,]+$/.test(value)) return null;

  const decimal = value.match(/^(.*?)[.,](\d{1,2})$/);
  const integerPart = (decimal ? decimal[1] : value).replace(/[.,]/g, "");
  const fraction = decimal ? decimal[2].padEnd(2, "0") : "00";
  if (!/^\d*$/.test(integerPart) || (!integerPart && !decimal)) return null;

  const cents = Number(integerPart || "0") * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
}
