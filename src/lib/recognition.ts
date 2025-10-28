// src/lib/recognition.ts
// Reconocimiento con "espera humana" + preparación de micrófono una sola vez.

export type ListenConfig = {
  lang?: string;
  minDurationMs?: number;
  endSilenceMs?: number;
  minChars?: number;
  interimAllowed?: boolean;
  maxTotalMs?: number;
};

type SR = any;

class RecognitionSvc {
  private SRClass: SR | null = null;
  private sr: any | null = null;

  private prepared = false;        // ← ya pedimos permiso de mic?
  private resolveFn: ((t: string) => void) | null = null;

  private endSilenceTimer: number | null = null;
  private hardStopTimer: number | null = null;

  constructor() {
    // @ts-ignore
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.SRClass = SR || null;
  }

  supported() { return !!this.SRClass; }
  isPrepared() { return this.prepared; }

  /** Llamar una sola vez al comenzar (tras un gesto del usuario). */
  async prepare(): Promise<boolean> {
    if (this.prepared) return true;
    try {
      // iOS/Android/Chrome piden gesto; hacelo al pulsar "Rezar…"
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      this.prepared = true;
      return true;
    } catch {
      this.prepared = false;
      return false;
    }
  }

  private clearTimers() {
    if (this.endSilenceTimer) { clearTimeout(this.endSilenceTimer); this.endSilenceTimer = null; }
    if (this.hardStopTimer) { clearTimeout(this.hardStopTimer); this.hardStopTimer = null; }
  }

  stopInternal() {
    this.clearTimers();
    try { if (this.sr) this.sr.stop(); } catch {}
    this.sr = null;
  }

  stop() {
    this.stopInternal();
    if (this.resolveFn) { const r = this.resolveFn; this.resolveFn = null; r(''); }
  }

  async listen(cfg: ListenConfig = {}): Promise<string> {
    if (!this.SRClass) return '';

    const {
      lang = 'es-AR',
      minDurationMs = 2600,
      endSilenceMs = 1300,
      minChars = 18,
      interimAllowed = true,
      maxTotalMs = 20000,
    } = cfg;

    // Garantizar permiso previo
    if (!this.prepared) {
      const ok = await this.prepare();
      if (!ok) return '';
    }

    this.stopInternal();
    this.sr = new this.SRClass();
    this.sr.lang = lang;
    this.sr.continuous = true;
    this.sr.interimResults = interimAllowed;

    let firstResultAt = 0;
    let transcript = '';

    return new Promise<string>((resolve) => {
      const finalize = () => {
        this.stopInternal();
        resolve(transcript.trim());
      };

      this.resolveFn = resolve;

      this.sr.onresult = (ev: any) => {
        if (!firstResultAt) firstResultAt = Date.now();

        let chunk = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const part = res[0]?.transcript ?? '';
          chunk += (res.isFinal || interimAllowed) ? part + ' ' : '';
        }
        if (chunk) transcript = (transcript + ' ' + chunk).replace(/\s+/g, ' ');

        // silencio final
        this.clearTimers();
        this.endSilenceTimer = window.setTimeout(() => {
          const durOk = firstResultAt && (Date.now() - firstResultAt) >= minDurationMs;
          const txtOk = transcript.trim().length >= minChars;
          if (durOk && txtOk) finalize();
        }, endSilenceMs);
      };

      this.sr.onerror = () => finalize();
      this.sr.onend   = () => finalize();

      this.hardStopTimer = window.setTimeout(() => finalize(), maxTotalMs);

      try { this.sr.start(); } catch { finalize(); }
    });
  }
}

export const recognition = new RecognitionSvc();
