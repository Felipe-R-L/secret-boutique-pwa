"use client";

import { isCents } from "@/lib/money";
import type { AnalyticsEvent, TrackData, TrafficSource } from "./events";

// Identificadores anônimos: um uuid por navegador (visitante) e outro por
// sessão (expira após 30 min parado). Nenhum dado pessoal sai daqui.

const VISITOR_KEY = "sb-vid";
const SOURCE_KEY = "sb-src";
const SESSION_KEY = "sb-sid";
const SESSION_TTL_MS = 30 * 60 * 1000;

let memoryVisitorId: string | null = null;
let memorySession: { id: string; last: number } | null = null;
let memorySource: TrafficSource | null = null;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback para navegadores antigos (TVs, webviews).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getVisitorId(): string {
  try {
    const stored = localStorage.getItem(VISITOR_KEY);
    if (stored) return stored;
    const id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    memoryVisitorId ??= uuid();
    return memoryVisitorId;
  }
}

export function getSessionId(): string {
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as { id: string; last: number })
      : null;
    const session =
      parsed && now - parsed.last < SESSION_TTL_MS
        ? { id: parsed.id, last: now }
        : { id: uuid(), last: now };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session.id;
  } catch {
    if (!memorySession || now - memorySession.last >= SESSION_TTL_MS) {
      memorySession = { id: uuid(), last: now };
    }
    memorySession.last = now;
    return memorySession.id;
  }
}

function detectSource(): TrafficSource {
  const url = new URL(window.location.href);
  const utm = (url.searchParams.get("utm_source") ?? "").toLowerCase();
  if (utm === "tv") return "tv";
  let roomFromQr = false;
  try {
    // O RoomParamCapture guarda o quarto e tira ?quarto= da URL; pode ter
    // rodado antes deste código.
    roomFromQr = Boolean(sessionStorage.getItem("sb-room"));
  } catch {
    // armazenamento bloqueado
  }
  if (
    roomFromQr ||
    url.searchParams.has("quarto") ||
    url.searchParams.has("room")
  ) {
    return "qr_quarto";
  }
  const ref = document.referrer.toLowerCase();
  if (utm === "instagram" || ref.includes("instagram.")) return "instagram";
  if (
    utm === "whatsapp" ||
    ref.includes("whatsapp.") ||
    ref.includes("wa.me")
  ) {
    return "whatsapp";
  }
  if (utm === "google" || ref.includes("google.")) return "google";
  if (!ref || ref.includes(window.location.hostname)) return "direto";
  return "outro";
}

/** Origem da PRIMEIRA visita deste visitante (fica gravada). */
export function getSource(): TrafficSource {
  try {
    const stored = localStorage.getItem(SOURCE_KEY) as TrafficSource | null;
    if (stored) return stored;
    const source = detectSource();
    localStorage.setItem(SOURCE_KEY, source);
    return source;
  } catch {
    memorySource ??= detectSource();
    return memorySource;
  }
}

function shouldTrack(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.pathname.startsWith("/admin")) return false;
  if (navigator.doNotTrack === "1") return false;
  return true;
}

function device(): "mobile" | "desktop" {
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

/**
 * Registra um evento anônimo. Nunca lança erro e nunca bloqueia a interface.
 */
export function trackEvent(event: AnalyticsEvent, data: TrackData = {}): void {
  try {
    if (!shouldTrack()) return;

    const body = JSON.stringify({
      event,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      source: getSource(),
      path: window.location.pathname,
      productId: data.productId,
      valueCents: isCents(data.valueCents) ? data.valueCents : undefined,
      props: { ...(data.props ?? {}), device: device() },
    });

    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/track", blob)) return;

    void fetch("/api/track", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Métrica nunca pode atrapalhar a compra.
  }
}
