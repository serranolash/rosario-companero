// src/lib/pwa.ts
export function initPWA() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // fuerza pedir el SW nuevo
  const swUrl = '/service-worker.js?v=17';

  navigator.serviceWorker
    .register(swUrl, { scope: '/' })
    .then(async reg => {
      // fuerza un update check
      try { await reg.update(); } catch {}

      // si hay un SW nuevo esperando, pedirle que tome control
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      // recargar una sola vez cuando cambie el controlador
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    })
    .catch(() => {});
}
