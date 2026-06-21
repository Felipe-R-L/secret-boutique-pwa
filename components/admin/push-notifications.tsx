"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  savePushSubscription,
  deletePushSubscription,
} from "@/lib/actions/push";
import { primeAudio } from "@/lib/sound";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

type PushState = "unsupported" | "loading" | "denied" | "off" | "on";

export function PushNotifications() {
  const [state, setState] = useState<PushState>("loading");

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    } catch {
      setState("off");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = async () => {
    // Libera o áudio aproveitando o gesto do clique.
    primeAudio();

    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push não configurado", {
        description: "Falta a chave NEXT_PUBLIC_VAPID_PUBLIC_KEY no servidor.",
      });
      return;
    }

    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const result = await savePushSubscription({
        endpoint: sub.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
        userAgent: navigator.userAgent,
      });

      if (!result.ok) {
        toast.error("Não foi possível ativar", { description: result.error });
        setState("off");
        return;
      }

      setState("on");
      toast.success("Notificações ativadas neste dispositivo");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao ativar notificações");
      setState("off");
    }
  };

  const disable = async () => {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Notificações desativadas neste dispositivo");
    } catch {
      toast.error("Falha ao desativar");
      refresh();
    }
  };

  if (state === "unsupported") {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="size-3.5" />
        Push não suportado neste navegador. No iPhone, instale o app na tela
        inicial primeiro.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="flex items-center gap-2 text-xs text-destructive">
        <BellOff className="size-3.5" />
        Notificações bloqueadas. Libere nas configurações do navegador.
      </p>
    );
  }

  if (state === "on") {
    return (
      <Button variant="outline" size="sm" onClick={disable} className="gap-2">
        <BellRing className="size-4 text-green-600" />
        Notificações ativas
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={enable}
      disabled={state === "loading"}
      className="gap-2"
    >
      <Bell className="size-4" />
      {state === "loading" ? "..." : "Ativar notificações"}
    </Button>
  );
}
