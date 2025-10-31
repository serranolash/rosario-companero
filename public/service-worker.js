// public/service-worker.js
// Incrementa esta versión cuando quieras forzar actualización
const SW_VERSION = 'v14';

// Solo haz skipWaiting cuando el cliente lo solicite
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Reclama control al activar (sin recarga en bucle)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Workbox para assets, sin cachear HTML de navegación ---
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

  // Audios → Cache First
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

  // JS/CSS/_next → SWR
  registerRoute(
    ({ request, url }) =>
      request.destination === 'script' ||
      request.destination === 'style' ||
      url.pathname.startsWith('/_next/'),
    new StaleWhileRevalidate({
      cacheName: `next-assets-${SW_VERSION}`,
      plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
    })
  );

  // IMPORTANTE: NO cacheamos documentos HTML (navegaciones)
}
