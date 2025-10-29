/* service-worker.js */
const SW_VERSION = 'v7'; // <-- ¡subí este número cuando hagas cambios!
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Workbox
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (self.workbox) {
  const { registerRoute, setDefaultHandler } = workbox.routing;
  const { CacheFirst, StaleWhileRevalidate, NetworkFirst, NetworkOnly } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  const { setCacheNameDetails } = workbox.core;

  setCacheNameDetails({ prefix: 'rosario-companero', suffix: SW_VERSION });

  // Por defecto, no toques requests desconocidos
  setDefaultHandler(new StaleWhileRevalidate());

  // Imágenes: SWR
  registerRoute(
    ({ request }) => request.destination === 'image',
    new StaleWhileRevalidate({
      cacheName: 'images',
      plugins: [
        new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  // Audios: Cache-First
  registerRoute(
    ({ request }) => request.destination === 'audio',
    new CacheFirst({
      cacheName: 'audio',
      plugins: [
        new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  // APIs: siempre ir a red primero (y caer a caché si estás offline)
  registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({
      cacheName: 'api-latest',
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 }) // 1 minuto
      ]
    }),
    'GET'
  );

  // Evitar cachear POST/DELETE de APIs
  registerRoute(
    ({ url, request }) => url.pathname.startsWith('/api/') && request.method !== 'GET',
    new NetworkOnly()
  );
}

// Mensajes para forzar update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
