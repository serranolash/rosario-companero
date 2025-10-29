// src/lib/pwa.ts
export function initPWAUpdatePrompt() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      if (reg.waiting) {
        // hay SW nuevo esperando -> recargar
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        });
      });
    });
  });
}
