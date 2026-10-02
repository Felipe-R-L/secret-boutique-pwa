// Taxonomia de eventos anônimos da loja. Compartilhada entre o cliente
// (trackEvent), a rota /api/track e o painel /admin/analytics.

export const ANALYTICS_EVENTS = [
  "page_view",
  "age_gate_choice",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "cart_view",
  "checkout_step",
  "payment_selected",
  "checkout_error",
  "order_created",
  "trust_page_view",
  "whatsapp_click",
  "instagram_click",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

// De onde o visitante chegou na primeira visita.
export const TRAFFIC_SOURCES = [
  "tv",
  "qr_quarto",
  "instagram",
  "whatsapp",
  "google",
  "direto",
  "outro",
] as const;

export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSource, string> = {
  tv: "TV do quarto",
  qr_quarto: "QR do quarto",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  google: "Google",
  direto: "Direto",
  outro: "Outros sites",
};

export type TrackData = {
  productId?: string;
  value?: number;
  props?: Record<string, string | number | boolean | null>;
};
