// Cidades atendidas pela entrega a domicílio (motoboy) e o frete de cada uma,
// em centavos. A cidade é identificada pela faixa de CEP — fonte da verdade
// compartilhada entre o cálculo server-side (checkout) e o formulário.
// Faixas conferidas no ViaCEP: Taiúva começa em 14720, Terra Roxa em 14745 e
// Taquaral em 14765, então os vizinhos não entram por engano.

export type DeliveryZone = {
  city: string;
  state: string;
  cepStart: number;
  cepEnd: number;
  feeCents: number;
  // Subtotal (só produtos) a partir do qual o frete sai grátis.
  freeShippingFromCents?: number;
};

// Subtotal mínimo (só produtos) para pedir entrega por motoboy.
export const MIN_HOME_DELIVERY_SUBTOTAL_CENTS = 2000;

export const DELIVERY_ZONES: readonly DeliveryZone[] = [
  {
    city: "Pitangueiras",
    state: "SP",
    cepStart: 14750000,
    cepEnd: 14764999,
    feeCents: 500,
    freeShippingFromCents: 6000,
  },
  {
    city: "Viradouro",
    state: "SP",
    cepStart: 14740000,
    cepEnd: 14744999,
    feeCents: 1000,
  },
  {
    city: "Bebedouro",
    state: "SP",
    cepStart: 14700000,
    cepEnd: 14719999,
    feeCents: 1500,
  },
];

// Cidade com frete grátis acima de um valor (Pitangueiras), para o texto da
// opção de entrega no checkout.
export const FREE_SHIPPING_ZONE = DELIVERY_ZONES.find(
  (zone) => zone.freeShippingFromCents !== undefined,
);

// "Pitangueiras, Viradouro e Bebedouro"
export const DELIVERY_AREA_LABEL = new Intl.ListFormat("pt-BR", {
  style: "long",
  type: "conjunction",
}).format(DELIVERY_ZONES.map((zone) => zone.city));

export function findDeliveryZone(
  rawCep: string | null | undefined,
): DeliveryZone | null {
  const digits = (rawCep ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const cep = Number(digits);
  return (
    DELIVERY_ZONES.find(
      (zone) => cep >= zone.cepStart && cep <= zone.cepEnd,
    ) ?? null
  );
}

export function deliveryFeeCents(
  zone: DeliveryZone,
  subtotalCents: number,
): number {
  if (
    zone.freeShippingFromCents !== undefined &&
    subtotalCents >= zone.freeShippingFromCents
  ) {
    return 0;
  }
  return zone.feeCents;
}
