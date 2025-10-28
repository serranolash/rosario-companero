// src/lib/audio.ts
class AudioSvc {
  private unlocked = false;
  private ctx: AudioContext | null = null;
  private bg: HTMLAudioElement | null = null;

  async init() {
    // Desbloquear AudioContext en móviles con primer gesto del usuario
    try {
      // @ts-ignore
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !this.ctx) {
        this.ctx = new Ctx();
      }
      const unlock = () => {
        try {
          if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        } catch {}
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('click', unlock);
        this.unlocked = true;
      };
      document.addEventListener('touchstart', unlock, { once: true });
      document.addEventListener('click', unlock, { once: true });
    } catch (e) {
      console.warn('No se pudo inicializar/resumir AudioContext:', e);
    }
  }

  /** TTS si está disponible; si no, reproduce el MP3 dado. */
  sayOrPlay(text: string, mp3Url: string) {
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'es-ES';
        const voices = speechSynthesis.getVoices();
        const v = voices.find(v => (v.lang || '').toLowerCase().startsWith('es'));
        if (v) u.voice = v;
        // Evita superposición
        try { speechSynthesis.cancel(); } catch {}
        speechSynthesis.speak(u);
        return;
      }
    } catch {
      /* caer a MP3 */
    }
    // Fallback MP3
    const a = new Audio(mp3Url);
    a.play().catch(() => {/* ignorar */});
  }

  /** Reproduce un MP3 directamente (por si querés llamar sin TTS) */
  play(mp3Url: string) {
    const a = new Audio(mp3Url);
    a.play().catch(() => {/* ignorar */});
  }

  /** Música gregoriana opcional en loop (ON/OFF) */
  setGregorian(on: boolean) {
    const url = '/audio/gregoriano/loop.mp3';
    if (on) {
      if (!this.bg) {
        this.bg = new Audio(url);
        this.bg.loop = true;
        this.bg.volume = 0.25;
      }
      this.bg.play().catch(() => {/* ignorar */});
    } else {
      if (this.bg) {
        try { this.bg.pause(); this.bg.currentTime = 0; } catch {}
      }
    }
  }
}

export const audio = new AudioSvc();
