function requireEnv(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

export function getVapidPublicKey(): string {
  return requireEnv(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    "Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  );
}

export function getVapidPrivateKey(): string {
  return requireEnv(
    process.env.VAPID_PRIVATE_KEY,
    "Missing VAPID_PRIVATE_KEY",
  );
}

export function getVapidSubject(): string {
  // mailto: ou URL do site. Usado pelo protocolo VAPID como contato.
  return process.env.VAPID_SUBJECT ?? "mailto:adm.apollo.log@protonmail.com";
}

/** Web Push só está configurado se as duas chaves existirem. */
export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}
