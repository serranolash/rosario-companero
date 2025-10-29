// src/lib/audio.ts
class AudioSvc {
  private ctx: AudioContext | null = null;
  private bg: HTMLAudioElement | null = null;
  private onLineCb: ((line: string | null) => void) | null = null;

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

  /** Permite a la UI mostrar la línea que se está recitando. */
  setOnLine(cb: (line: string | null) => void) {
    this.onLineCb = cb;
  }

  /** Habla un texto con TTS (si hay) o MP3 de respaldo.  */
  sayOrPlay(text: string, mp3Url?: string): Promise<void> {
    return new Promise<void>((resolve) => {
      // Preferir TTS
      try {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'es-ES';
          const voices = speechSynthesis.getVoices();
          const v = voices.find(v => (v.lang || '').toLowerCase().startsWith('es'));
          if (v) u.voice = v;

          // avisar a la UI qué línea se está diciendo
          this.onLineCb?.(text);
          u.onend = () => { this.onLineCb?.(null); resolve(); };
          u.onerror = () => { this.onLineCb?.(null); resolve(); };

          // cancelar cualquier TTS anterior (evita solapado)
          try { speechSynthesis.cancel(); } catch {}
          speechSynthesis.speak(u);
          return;
        }
      } catch {
        /* caer al MP3 */
      }

      // Fallback MP3
      if (!mp3Url) { resolve(); return; }
      const a = new Audio(mp3Url);
      const done = () => { this.onLineCb?.(null); resolve(); };
      a.addEventListener('ended', done, { once: true });
      a.addEventListener('error', done, { once: true });
      this.onLineCb?.(text);
      // timeout de seguridad
      setTimeout(done, Math.max(8000, Math.min(20000, text.length * 120)));
      a.play().catch(done);
    });
  }

  /** Divide un texto largo en trozos y los dice en secuencia (evita cortes). */
  async sayChunks(text: string) {
    const chunks = this.chunkText(text);
    for (const c of chunks) {
      await this.sayOrPlay(c);
    }
  }

  private chunkText(text: string): string[] {
    const clean = (text || '')
      .replace(/\s+/g, ' ')
      .replace(/ ?<br\s*\/?> ?/gi, ' ')
      .trim();

    // dividir por frases / puntos y comas
    const raw = clean.split(/([\.!?;:])\s+/).reduce<string[]>((acc, cur, i, arr) => {
      if (i % 2 === 0) {
        const punct = arr[i + 1] || '';
        acc.push((cur + (punct || '')).trim());
      }
      return acc;
    }, []).filter(Boolean);

    // agrupar para no pasar ~140-160 chars
    const out: string[] = [];
    let buf = '';
    for (const seg of (raw.length ? raw : [clean])) {
      if ((buf + ' ' + seg).trim().length > 160) {
        if (buf) out.push(buf.trim());
        buf = seg;
      } else {
        buf = (buf ? buf + ' ' : '') + seg;
      }
    }
    if (buf) out.push(buf.trim());
    return out;
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
        this.bg.volume = 0.2;
      }
      this.bg.play().catch(() => {});
    } else {
      if (this.bg) { try { this.bg.pause(); this.bg.currentTime = 0; } catch {} }
    }
  }
}

export const audio = new AudioSvc();
export type AudioSvcType = AudioSvc;
