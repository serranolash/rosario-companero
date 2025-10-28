// src/lib/audio.ts
class AudioSvc {
  private ctx: AudioContext | null = null;
  private bg: HTMLAudioElement | null = null;

  private pauseRec?: () => Promise<void> | void;
  private resumeRec?: () => Promise<void> | void;
  private onLine?: (line: string | null) => void;

  initOnce = false;

  async init() {
    if (this.initOnce) return;
    this.initOnce = true;
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

  setRecognitionHooks(hooks: { pause?: () => Promise<void> | void; resume?: () => Promise<void> | void }) {
    this.pauseRec = hooks.pause;
    this.resumeRec = hooks.resume;
  }
  setOnLine(fn: (line: string | null) => void) {
    this.onLine = fn;
  }

  private async speak(text: string): Promise<void> {
    // TTS robusto con timeout + voiceschanged
    if (!('speechSynthesis' in window)) throw new Error('no-tts');

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';

    const pick = () => {
      const vs = speechSynthesis.getVoices();
      const v = vs.find(v => (v.lang || '').toLowerCase().startsWith('es')) || vs[0];
      if (v) u.voice = v;
    };
    pick();
    if (!u.voice) {
      await new Promise<void>((res) => {
        const once = () => { pick(); speechSynthesis.removeEventListener('voiceschanged', once); res(); };
        speechSynthesis.addEventListener('voiceschanged', once, { once: true });
        // fallback por si nunca llega
        setTimeout(() => { try { speechSynthesis.removeEventListener('voiceschanged', once); } catch{}; res(); }, 1200);
      });
      pick();
    }

    try { speechSynthesis.cancel(); } catch {}
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      u.onend = finish;
      u.onerror = finish;
      speechSynthesis.speak(u);
      // salvavidas
      setTimeout(finish, Math.max(2000, Math.min(20000, 250 * (text?.length || 0))));
    });
  }

  private async playMp3(url: string): Promise<void> {
    if (!url) throw new Error('empty-mp3');
    return new Promise<void>((resolve) => {
      const a = new Audio(url);
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      a.addEventListener('ended', finish, { once: true });
      a.addEventListener('error', finish, { once: true });
      setTimeout(finish, 15000);
      a.play().catch(finish);
    });
  }

  /** Muestra línea en UI + pausa STT + TTS o MP3 + reanuda STT. SIEMPRE RESUELVE. */
  async sayOrPlay(text: string, mp3Url?: string): Promise<void> {
    try { await this.pauseRec?.(); } catch {}
    if (this.onLine && text) this.onLine(text);

    try {
      try {
        await this.speak(text || '');
      } catch {
        if (mp3Url) await this.playMp3(mp3Url);
      }
    } catch {
      // ignorar
    } finally {
      if (this.onLine) this.onLine(null);
      try { await this.resumeRec?.(); } catch {}
    }
  }

  async play(url: string): Promise<void> {
    try { await this.pauseRec?.(); } catch {}
    try { await this.playMp3(url); } catch {} 
    finally { try { await this.resumeRec?.(); } catch {} }
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
    } else if (this.bg) {
      try { this.bg.pause(); this.bg.currentTime = 0; } catch {}
    }
  }
}

export const audio = new AudioSvc();
