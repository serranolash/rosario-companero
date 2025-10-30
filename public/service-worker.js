// public/service-worker.js
// Versión: cambia este valor cuando quieras forzar actualización
const SW_VERSION = 'v11';

// Solo haz skipWaiting si el cliente lo pide explícitamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Toma control de inmediato al activar (sin recargar en loop)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ---- Opcional: Workbox sólo para estáticos (NO cachear navegaciones HTML) ----
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (self.workbox) {
  const { registerRoute } = workbox.routing;
  const { StaleWhileRevalidate, CacheFirst } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  const { setCacheNameDetails } = workbox.core;

  setCacheNameDetails({ prefix: 'rosario-companero', suffix: SW_VERSION });

  // Imágenes → SWR
  registerRoute(
    ({ request }) => request.destination === 'image',
    new StaleWhileRevalidate({
      cacheName: `images-${SW_VERSION}`,
      plugins: [
        new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  // Audio → Cache First
  registerRoute(
    ({ request }) => request.destination === 'audio',
    new CacheFirst({
      cacheName: `audio-${SW_VERSION}`,
      plugins: [
        new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  // JS/CSS de Next → SWR (no navegs)
  registerRoute(
    ({ request, url }) =>
      (request.destination === 'script' || request.destination === 'style') ||
      url.pathname.startsWith('/_next/'),
    new StaleWhileRevalidate({
      cacheName: `next-assets-${SW_VERSION}`,
      plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
    })
  );

  // MUY IMPORTANTE: NO cachear documentos HTML (navegaciones)
}
