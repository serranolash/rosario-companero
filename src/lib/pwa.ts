export async function registerSW() {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') {
    console.info('[PWA] SW desactivado en desarrollo');
    return;
  }
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (e) {
      console.warn('SW register failed', e);
    }
  }
}