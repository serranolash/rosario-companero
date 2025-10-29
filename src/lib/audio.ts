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
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx && !this.ctx) this.ctx = new Ctx();

      // Desbloqueo en móviles
      const unlock = () => {
        try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch {}
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('click', unlock);
      };
      document.addEventListener('touchstart', unlock, { once: true });
      document.addEventListener('click', unlock, { once: true });
    } catch {}
  }

  setOnLine(cb: OnLineFn | null) {
    this.onLineCb = cb;
  }

  stop() {
    try { window.speechSynthesis?.cancel(); } catch {}
    this.speaking = false;
    this.onLineCb?.(null);
  }

  /** TTS preferente con fallback a audio MP3 (si se provee) */
  sayOrPlay(text: string, mp3Url?: string): Promise<void> {
    return new Promise<void>((resolve) => {
      // Preferir TTS
      try {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'es-ES';

          const pickVoice = () => {
            const voices = speechSynthesis.getVoices();
            const v = voices.find(v => (v.lang || '').toLowerCase().startsWith('es'));
            if (v) u.voice = v;
          };
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

      // Fallback MP3 si se pasó URL
      if (mp3Url) {
        const a = new Audio(mp3Url);
        const done = () => { this.onLineCb?.(null); resolve(); };
        this.onLineCb?.(text);
        a.addEventListener('ended', done, { once: true });
        a.addEventListener('error', done, { once: true });
        setTimeout(done, 15000);
        a.play().catch(done);
      } else {
        // Si no hay TTS ni MP3, resolvemos igual para no colgar flujo
        resolve();
      }
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

  /** Nuevo: habla en "chunks" para textos largos y evitar cortes */
  async sayChunks(textOrLines: string | string[]): Promise<void> {
    const lines: string[] = Array.isArray(textOrLines)
      ? textOrLines
      : splitInChunks(textOrLines, 160);

    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;
      await this.sayOrPlay(clean);
      // pequeña pausa natural entre frases
      await pause(250);
    }
  }
}

function pause(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

/** Divide por puntuación y asegura longitud máxima aproximada */
function splitInChunks(text: string, maxLen = 160): string[] {
  const raw = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[\.\!\?\:;])\s+/g);

  const chunks: string[] = [];
  for (const seg of raw) {
    if (seg.length <= maxLen) { chunks.push(seg); continue; }
    // Si una frase supera el máximo, la troceamos duramente por palabras
    let cur = '';
    for (const w of seg.split(' ')) {
      if ((cur + ' ' + w).trim().length > maxLen) {
        if (cur.trim()) chunks.push(cur.trim());
        cur = w;
      } else {
        cur = (cur ? cur + ' ' : '') + w;
      }
    }
    if (cur.trim()) chunks.push(cur.trim());
  }
  return chunks;
}

export const audio = new AudioSvc();
export type AudioSvcT = AudioSvc;
