import "server-only";
import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getVapidPublicKey,
  getVapidPrivateKey,
  getVapidSubject,
  isWebPushConfigured,
} from "@/lib/push/config";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    getVapidSubject(),
    getVapidPublicKey(),
    getVapidPrivateKey(),
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Envia uma notificação push para TODOS os dispositivos inscritos (ADMIN/STAFF).
 * Inscrições inválidas/expiradas (404/410) são removidas automaticamente.
 * Nunca lança — falhas são logadas para não quebrar o fluxo de pedido.
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  if (!isWebPushConfigured()) {
    console.warn("[push] VAPID não configurado; pulando envio de push.");
    return;
  }

  ensureConfigured();

  const supabase = createServiceRoleClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth");

  if (error) {
    console.error("[push] Falha ao buscar inscrições", error);
    return;
  }

  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  const staleEndpoints: string[] = [];

  // Pedido novo é urgente: "high" faz o Android entregar mesmo em modo
  // soneca (com "normal", o padrão, o aviso pode chegar minutos ou horas
  // depois). Um aviso de pedido com mais de 6h já não serve para nada.
  const options = { urgency: "high" as const, TTL: 6 * 60 * 60 };

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          options,
        );
      } catch (err: unknown) {
        const { statusCode, body: errorBody } = (err ?? {}) as {
          statusCode?: number;
          body?: string;
        };
        // 404/410: inscrição expirou; o painel reinscreve o aparelho sozinho
        // na próxima vez que for aberto (components/admin/push-notifications).
        // 403 costuma ser VAPID (chave trocada ou VAPID_SUBJECT inválido): fica
        // só no log, com o corpo da resposta, para não mascarar o problema.
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
        console.error(
          "[push] Erro ao enviar push",
          statusCode ?? err,
          errorBody ?? "",
          new URL(sub.endpoint).host,
        );
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
  }
}
