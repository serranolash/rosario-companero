// src/lib/audio.ts
export type VoiceOption = 1 | 2 | 3 | 4 | 5;

export interface AudioPrefs {
  voice: VoiceOption;
  delayMs: number;
  gregorian: boolean;
}

type Maybe<T> = T | null | undefined;

export class AudioEngine {
  private ctx?: AudioContext;
  private usingWebAudio = false;
  private buffers: Record<string, AudioBuffer | null> = {};
  private html: Record<string, HTMLAudioElement | null> = {};
  private bg?: HTMLAudioElement;
  private synth = (typeof window !== 'undefined' ? window.speechSynthesis : undefined);
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor(private base: string = '/audio') {}

  async init() {
    if (typeof window === 'undefined') return;

    // 🔓 Desbloquear AudioContext para móviles (Android/iOS)
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.usingWebAudio = true;

        const unlock = () => {
          try {
            if (this.ctx && this.ctx.state === 'suspended') {
              this.ctx.resume();
            }
          } catch {}
          document.removeEventListener('touchstart', unlock);
          document.removeEventListener('click', unlock);
        };

        document.addEventListener('touchstart', unlock, false);
        document.addEventListener('click', unlock, false);
      } else {
        this.usingWebAudio = false;
      }
    } catch {
      this.usingWebAudio = false;
    }

    this.pickVoice();
  }

  private pickVoice() {
    if (!this.synth) return;

    const pick = () => {
      const voices: Maybe<SpeechSynthesisVoice[]> = this.synth!.getVoices?.();
      if (!voices || voices.length === 0) return;

      // Preferí cualquier voz "es-*" si existe; si no, la primera disponible.
      const esVoices = voices.filter(v => (v.lang || '').toLowerCase().startsWith('es'));
      this.selectedVoice = (esVoices[0] ?? voices[0]) || null;
    };

    pick();
    // No chequeamos contra null; simplemente registramos el callback.
    // Algunos navegadores solo pueblan las voces luego de este evento.
    this.synth.onvoiceschanged = pick;
  }

  private async fetchArrayBuffer(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    return await res.arrayBuffer();
  }

  async preload(keys: string[]) {
    if (this.usingWebAudio && this.ctx) {
      for (const k of keys) {
        const url = this.resolve(k);
        try {
          const ab = await this.fetchArrayBuffer(url);
          const buf = await this.ctx.decodeAudioData(ab.slice(0));
          this.buffers[k] = buf;
        } catch {
          this.buffers[k] = null;
        }
      }
    } else {
      for (const k of keys) {
        const url = this.resolve(k);
        const el = new Audio(url);
        el.preload = 'auto';
        el.addEventListener('error', () => { this.html[k] = null; });
        this.html[k] = el;
      }
    }
  }

  async play(key: string, delayMs = 0): Promise<boolean> {
    // Aseguramos reanudar el contexto si quedó suspendido (típico en móviles)
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }

    if (this.usingWebAudio && this.ctx) {
      const buf = this.buffers[key];
      if (!buf) return false;
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.ctx.destination);
        src.start(this.ctx.currentTime + (delayMs / 1000));
        return true;
      } catch {
        return false;
      }
    }

    const el = this.html[key];
    if (!el) return false;
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    try {
      el.currentTime = 0;
      await el.play();
      return true;
    } catch {
      return false;
    }
  }

  speak(text: string, delayMs = 0) {
    if (!this.synth) return;

    const doSpeak = () => {
      const ut = new SpeechSynthesisUtterance(text);

      // 🗣️ Forzamos voz/lenguaje en español si es posible
      // Si aún no hay voces cargadas, intentamos elegir de nuevo.
      if (!this.selectedVoice || this.synth!.getVoices().length === 0) {
        this.pickVoice();
      }

      ut.voice = this.selectedVoice || null;
      ut.lang  = (this.selectedVoice?.lang ?? 'es-ES');
      ut.rate  = 1.0;
      ut.pitch = 1.0;

      this.synth!.speak(ut);
    };

    if (delayMs > 0) setTimeout(doSpeak, delayMs);
    else doSpeak();
  }

  async setGregorian(enabled: boolean) {
    if (!enabled) {
      if (this.bg) { this.bg.pause(); this.bg = undefined; }
      return;
    }

    const url = this.resolve('gregoriano/loop.mp3');
    if (!this.bg) {
      this.bg = new Audio(url);
      this.bg.loop = true;
      this.bg.volume = 0.25;
      this.bg.preload = 'auto';
    }
    this.bg.currentTime = 0;
    this.bg.play().catch(() => { /* ignoramos bloqueo si no hubo gesto */ });
  }

  private resolve(file: string) {
    return `${this.base}/${file}`;
  }
}
