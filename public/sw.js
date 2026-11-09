// NORTE — service worker simples: app shell offline.
// Funciona na raiz (Vercel) ou numa subpasta (GitHub Pages /Norte/).
const CACHE = "norte-v5";
const BASE = new URL("./", self.location).pathname; // ex.: "/" ou "/Norte/"
const SHELL = ["", "hoje/", "rotina/", "financas/", "casa/", "mais/", "assistente/", "onboarding/", "icon.svg"].map((p) => BASE + p);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith(BASE + "api/")) return;

  // Arquivos estáticos versionados: cache primeiro.
  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Páginas e demais: rede primeiro, cache como reserva.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(BASE + "hoje/") || caches.match(BASE))),
  );
});

// Avisos (Web Push): contas a vencer, leitura e resumo do dia.
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "NORTE", {
      body: d.body || "",
      tag: d.tag || undefined,
      icon: BASE + "icon-192.png",
      badge: BASE + "icon-192.png",
      data: { url: d.url || BASE + "hoje/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || BASE + "hoje/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin + BASE) && "navigate" in c) return c.focus().then(() => c.navigate(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
