export type VoiceOption = 1 | 2 | 3 | 4 | 5;

export interface AudioPrefs {
  voice: VoiceOption;
  delayMs: number;
  gregorian: boolean;
}

export class AudioEngine {
  private ctx?: AudioContext;
  private usingWebAudio = false;
  private buffers: Record<string, AudioBuffer | null> = {};
  private html: Record<string, HTMLAudioElement> = {};
  private bg?: HTMLAudioElement;
  private synth = (typeof window !== 'undefined' ? window.speechSynthesis : undefined);
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor(private base: string = '/audio') {}

  async init() {
    if (typeof window === 'undefined') return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.usingWebAudio = true;
    } catch { this.usingWebAudio = false; }
    this.pickVoice();
  }

  private pickVoice() {
    if (!this.synth) return;
    const pick = () => {
      const voices = this.synth!.getVoices();
      const es = voices.filter(v => /es-|Spanish/i.test(v.lang));
      this.selectedVoice = (es[0] ?? voices[0]) || null;
    };
    pick();
    if (this.synth.onvoiceschanged === null) this.synth.onvoiceschanged = pick;
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
        } catch { this.buffers[k] = null; }
      }
    } else {
      for (const k of keys) {
        const url = this.resolve(k);
        const el = new Audio(url);
        el.addEventListener('error', () => { this.html[k] = undefined as any; });
        this.html[k] = el;
      }
    }
  }

  async play(key: string, delayMs = 0): Promise<boolean> {
    if (this.usingWebAudio && this.ctx) {
      const buf = this.buffers[key];
      if (!buf) return false;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(this.ctx.currentTime + delayMs / 1000);
      return true;
    }
    const el = this.html[key];
    if (!el) return false;
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    try { el.currentTime = 0; await el.play(); return true }
    catch { return false }
  }

  speak(text: string, delayMs = 0) {
    if (!this.synth) return;
    const ut = new SpeechSynthesisUtterance(text);
    ut.voice = this.selectedVoice || null;
    ut.lang = (this.selectedVoice?.lang ?? 'es-ES');
    ut.rate = 1.0; ut.pitch = 1.0;
    if (delayMs > 0) setTimeout(() => this.synth!.speak(ut), delayMs);
    else this.synth.speak(ut);
  }

  async setGregorian(enabled: boolean) {
    if (!enabled) { if (this.bg) { this.bg.pause(); this.bg = undefined; } return; }
    const url = this.resolve('gregoriano/loop.mp3');
    if (!this.bg) {
      this.bg = new Audio(url); this.bg.loop = true; this.bg.volume = 0.25; this.bg.preload = 'auto';
    }
    this.bg.currentTime = 0;
    this.bg.play().catch(() => {});
  }

  private resolve(file: string) { return `${this.base}/${file}`; }
}