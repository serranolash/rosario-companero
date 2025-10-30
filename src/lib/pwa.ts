// src/lib/pwa.ts
let _swRegistered = false;

export async function registerSW() {
  if (_swRegistered) return;               // guardia en memoria del módulo
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    _swRegistered = true;
    // opcional: console.log('[PWA] SW registrado');
  } catch (err) {
    console.error('[PWA] Error registrando SW:', err);
  }
}

// Este helper NO vuelve a registrar, sólo puede escuchar/avisar de updates.
export function initPWAUpdatePrompt(onUpdate?: () => void) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;

    // When a new SW is waiting to activate, podés disparar un toast/modal:
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          onUpdate?.();
        }
      });
    });
  });
}
