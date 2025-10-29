// src/lib/audio.ts
export type OnLineFn = (line: string | null) => void;

class AudioSvc {
  private ctx: AudioContext | null = null;
  private bg: HTMLAudioElement | null = null;

  private onLineCb: OnLineFn | null = null;
  private speaking = false;

  async init() {
    try {
      // @ts-ignore
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !this.ctx) this.ctx = new Ctx();

      const unlock = () => {
        try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch {}
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('click', unlock);
      };
      document.addEventListener('touchstart', unlock, { once: true });
      document.addEventListener('click', unlock, { once: true });
    } catch {}
  }

  /** Permite que la UI muestre/limpie la línea que se esté “diciendo”. */
  setOnLine(cb: OnLineFn | null) {
    this.onLineCb = cb;
  }

  /** Cancela cualquier TTS en curso. */
  stop() {
    try { window.speechSynthesis?.cancel(); } catch {}
    this.speaking = false;
    this.onLineCb?.(null);
  }

  /** Habla con TTS y, si no está disponible, reproduce MP3. */
  sayOrPlay(text: string, mp3Url: string): Promise<void> {
    return new Promise<void>((resolve) => {
      // Preferir TTS
      try {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'es-ES';

          // Voz en español si existe
          const pickVoice = () => {
            const voices = speechSynthesis.getVoices();
            const v = voices.find(v => (v.lang || '').toLowerCase().startsWith('es'));
            if (v) u.voice = v;
          };
          // En algunos navegadores las voces se cargan asincrónicas
          pickVoice();
          window.speechSynthesis.onvoiceschanged = pickVoice;

          try { speechSynthesis.cancel(); } catch {}
          this.speaking = true;
          this.onLineCb?.(text);

          u.onend = () => { this.speaking = false; this.onLineCb?.(null); resolve(); };
          u.onerror = () => { this.speaking = false; this.onLineCb?.(null); resolve(); };
          speechSynthesis.speak(u);
          return;
        }
      } catch {
        /* caer a MP3 */
      }

      // Fallback MP3
      const a = new Audio(mp3Url);
      const done = () => { this.onLineCb?.(null); resolve(); };
      this.onLineCb?.(text);
      a.addEventListener('ended', done, { once: true });
      a.addEventListener('error', done, { once: true });
      // Timeout de seguridad (si el audio falla)
      setTimeout(done, 15000);
      a.play().catch(done);
    });
  }

  play(mp3Url: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const a = new Audio(mp3Url);
      const done = () => resolve();
      a.addEventListener('ended', done, { once: true });
      a.addEventListener('error', done, { once: true });
      setTimeout(done, 15000);
      a.play().catch(done);
    });
  }

  setGregorian(on: boolean) {
    const url = '/audio/gregoriano/loop.mp3';
    if (on) {
      if (!this.bg) {
        this.bg = new Audio(url);
        this.bg.loop = true;
        this.bg.volume = 0.25;
      }
      this.bg.play().catch(() => {});
    } else {
      if (this.bg) { try { this.bg.pause(); this.bg.currentTime = 0; } catch {} }
    }
  }
}

export const audio = new AudioSvc();
export type AudioSvcT = AudioSvc;
