// src/lib/audio.ts
class AudioSvc {
  private ctx: AudioContext | null = null;
  private bg: HTMLAudioElement | null = null;
  private unlocked = false;

  async init() {
    try {
      // @ts-ignore
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !this.ctx) this.ctx = new Ctx();
      const unlock = () => {
        try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch {}
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('click', unlock);
        this.unlocked = true;
      };
      document.addEventListener('touchstart', unlock, { once: true });
      document.addEventListener('click', unlock, { once: true });
    } catch {}
  }

  /** TTS si hay; si no, MP3. Devuelve PROMESA que se resuelve cuando termina. */
  sayOrPlay(text: string, mp3Url: string): Promise<void> {
    return new Promise<void>((resolve) => {
      // Preferir TTS
      try {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'es-ES';
          const voices = speechSynthesis.getVoices();
          const v = voices.find(v => (v.lang || '').toLowerCase().startsWith('es'));
          if (v) u.voice = v;
          try { speechSynthesis.cancel(); } catch {}
          u.onend = () => resolve();
          u.onerror = () => resolve();
          speechSynthesis.speak(u);
          return;
        }
      } catch {
        /* caer a MP3 */
      }
      // Fallback MP3
      const a = new Audio(mp3Url);
      const done = () => resolve();
      a.addEventListener('ended', done, { once: true });
      a.addEventListener('error', done, { once: true });
      // Timeout de seguridad por si el archivo no se puede reproducir
      setTimeout(done, 12000);
      a.play().catch(done);
    });
  }

  play(mp3Url: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const a = new Audio(mp3Url);
      const done = () => resolve();
      a.addEventListener('ended', done, { once: true });
      a.addEventListener('error', done, { once: true });
      setTimeout(done, 12000);
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
