// src/lib/audio.ts
// TTS/Audio robusto con init(), setOnLine(), sayOrPlay(), sayChunks(), stop().

type OnLine = ((line: string | null) => void) | null;

function splitIntoChunks(text: string, max = 180): string[] {
  // Divide por puntuación; si un bloque supera max, lo trocea por espacios.
  const parts = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/([.!?;:])\s+/)
    .reduce<string[]>((acc, cur, i, arr) => {
      if (i % 2 === 0) {
        const end = arr[i + 1] || '';
        acc.push((cur + (end ? end + ' ' : '')).trim());
      }
      return acc;
    }, [])
    .filter(Boolean);

  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= max) { out.push(p); continue; }
    let tmp = p;
    while (tmp.length > max) {
      const cut = tmp.lastIndexOf(' ', max);
      if (cut <= 0) break;
      out.push(tmp.slice(0, cut));
      tmp = tmp.slice(cut + 1);
    }
    if (tmp) out.push(tmp);
  }
  return out;
}

class AudioSvc {
  private ctx: AudioContext | null = null;
  private bg: HTMLAudioElement | null = null;
  private onLine: OnLine = null;

  setOnLine(cb: OnLine) { this.onLine = cb; }

  async init() {
    try {
      // @ts-ignore
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx && !this.ctx) this.ctx = new Ctx();

      // Desbloqueo móvil
      const unlock = () => {
        try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch {}
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('click', unlock);
      };
      document.addEventListener('touchstart', unlock, { once: true });
      document.addEventListener('click', unlock, { once: true });

      // Warm-up TTS (cargar voces)
      try { window.speechSynthesis?.getVoices?.(); } catch {}
    } catch {}
  }

  sayOrPlay(text: string, mp3Url?: string): Promise<void> {
    // Notifica a la UI lo que “dice” la app
    try { this.onLine?.(text); } catch {}

    return new Promise<void>((resolve) => {
      // 1) TTS preferente
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'es-ES';
          const voices = (window.speechSynthesis.getVoices?.() || []) as SpeechSynthesisVoice[];
          const v = voices.find(v => (v.lang || '').toLowerCase().startsWith('es'));
          if (v) u.voice = v;
          try { window.speechSynthesis.cancel(); } catch {}
          u.onend = () => { try { this.onLine?.(null); } catch {} ; resolve(); };
          u.onerror = () => { try { this.onLine?.(null); } catch {} ; resolve(); };
          window.speechSynthesis.speak(u);
          return;
        }
      } catch { /* fall through */ }

      // 2) Fallback MP3 (si se pasó URL)
      if (mp3Url) {
        const a = new Audio(mp3Url);
        const done = () => { try { this.onLine?.(null); } catch {} ; resolve(); };
        a.addEventListener('ended', done, { once: true });
        a.addEventListener('error', done, { once: true });
        setTimeout(done, 12000);
        a.play().catch(done);
        return;
      }

      // 3) Sin TTS ni MP3 → resolver igual
      try { this.onLine?.(null); } catch {}
      resolve();
    });
  }

  /** Dice un texto largo en trozos, evitando cortes del TTS. */
  async sayChunks(text: string, mp3Base?: string) {
    const chunks = splitIntoChunks(text);
    for (let i = 0; i < chunks.length; i++) {
      const mp3 = mp3Base ? `${mp3Base}.${i + 1}.mp3` : undefined;
      await this.sayOrPlay(chunks[i], mp3);
      // micro pausa natural
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  stop() {
    try { window.speechSynthesis?.cancel?.(); } catch {}
    try { this.onLine?.(null); } catch {}
    if (this.bg) {
      try { this.bg.pause(); this.bg.currentTime = 0; } catch {}
    }
  }
}

export const audio = new AudioSvc();
