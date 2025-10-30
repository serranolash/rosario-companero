// src/lib/pwa.ts
'use client';

// Evita múltiples registros
let _swRegistered = false;

// Registro seguro del Service Worker SOLO en producción
export function registerSW(versionTag: string = 'v12') {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;
  if (_swRegistered) return; // ya está

  const swUrl = `/service-worker.js?v=${encodeURIComponent(versionTag)}`;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        let refreshing = false;

        // Recarga UNA sola vez cuando el nuevo SW toma control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          // Pequeño delay para evitar parpadeos
          setTimeout(() => window.location.reload(), 150);
        });

        // Si ya hay uno esperando, pídele activarse (solo una vez)
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Si aparece update, cuando instale pedimos el swap
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

    _swRegistered = true;
  });
}

/**
 * initPWAUpdatePrompt
 * Wrapper compatible con tu import previo.
 * Si más adelante quieres mostrar un toast/botón “Actualizar”, aquí es el lugar.
 */
export function initPWAUpdatePrompt(versionTag: string = 'v12') {
  // Por ahora, solo registramos el SW con el tag de versión
  registerSW(versionTag);
}
