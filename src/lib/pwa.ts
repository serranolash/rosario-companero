// src/lib/pwa.ts
// Registrador de Service Worker con limpieza segura de versiones antiguas

const SW_VERSION = 'v14';                       // <- sube aquí cuando cambies el SW
const SW_URL = `/service-worker.js?v=${SW_VERSION}`;

let _registered = false;

export function registerSW() {
  if (_registered) return;
  _registered = true;

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      // 1) Limpieza de SW viejos (v12, v13, etc.)
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (r) => {
          try {
            const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
            // Si el SW activo NO es la versión actual, lo desregistramos
            if (url && !url.includes(`?v=${SW_VERSION}`)) {
              await r.unregister();
            }
          } catch {}
        })
      );

      // 2) Registrar el SW actual (v14)
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });

      // 3) Si hay uno nuevo esperando, forzamos la activación cuando volvés al foco
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 4) Cuando llegue un updatefound, al activarse, recargamos suavemente
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // Ya hay uno nuevo listo -> pedir que tome control
            sw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // 5) Cuando cambie el controlador, refrescamos una vez (sin loop)
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshed) return;
        refreshed = true;
        location.reload();
      });
    } catch (err) {
      console.warn('[PWA] SW register error', err);
    }
  });
}

// Úsalo en páginas públicas (home/layout) para registrar el SW
export function initPWA() {
  registerSW();
}
