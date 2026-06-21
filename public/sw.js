// Service worker do Secret Boutique — foca em Web Push para o painel admin.
// Não faz cache offline; serve apenas para receber e exibir notificações.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Novo pedido", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Novo pedido";
  const options = {
    body: data.body || "Você recebeu um novo pedido.",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: data.tag || "new-order",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/admin/orders" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin/orders";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/admin") && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
