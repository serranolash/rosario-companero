// src/lib/pwa.ts
'use client';

// Registra el SW solo en PRODUCCIÓN y con flujo de update seguro
export function registerSW() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;

  // Añade query de versión para bust
  const swUrl = '/service-worker.js?v=v11';

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        let refreshing = false;

        // Si el controlador cambia, recarga UNA sola vez
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        // Si ya hay uno "waiting", pídeles que active (una vez)
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Cuando haya update, espera hasta que instale y entonces salta
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {
        // silencioso
      });
  });
}
