self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');
if (self.workbox) {
  const { registerRoute, setCatchHandler } = workbox.routing;
  const { CacheFirst, StaleWhileRevalidate } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  const { setCacheNameDetails } = workbox.core;

  setCacheNameDetails({ prefix: 'rosario-companero-v7' });

  registerRoute(({ request }) => request.destination === 'image',
    new StaleWhileRevalidate({ cacheName:'images',
      plugins:[ new ExpirationPlugin({ maxEntries:60, maxAgeSeconds:30*24*60*60 }), new CacheableResponsePlugin({ statuses:[0,200] }) ] })
  );
  registerRoute(({ request }) => request.destination === 'audio',
    new CacheFirst({ cacheName:'audio',
      plugins:[ new ExpirationPlugin({ maxEntries:40, maxAgeSeconds:365*24*60*60 }), new CacheableResponsePlugin({ statuses:[0,200] }) ] })
  );
  setCatchHandler(async ({ event }) => {
    if (event.request.destination === 'document') return Response.redirect('/');
    return Response.error();
  });
}