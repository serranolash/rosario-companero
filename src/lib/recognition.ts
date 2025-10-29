// src/lib/recognition.ts
export type ListenConfig = {
  lang?: string;
  minDurationMs?: number;   // mínimo hablando (default 2800)
  endSilenceMs?: number;    // silencio final requerido (default 1500)
  minChars?: number;        // texto mínimo (default 22)
  interimAllowed?: boolean; // acumular interinos (default true)
  maxTotalMs?: number;      // corte duro (default 25000)
  silenceChecks?: number;   // cuántos chequeos de silencio seguidos (default 2)
};

type SR = any;

class RecognitionSvc {
  private SRClass: SR | null = null;
  private sr: any | null = null;
  private prepared = false;

  constructor() {
    // @ts-ignore
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.SRClass = SR || null;
  }

  supported() { return !!this.SRClass; }
  isPrepared() { return this.prepared; }

  async prepare(): Promise<boolean> {
    if (this.prepared) return true;
    try {
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

  /** Stop público para usar desde la UI */
  stop() {
    try { this.sr?.stop?.(); } catch {}
    this.sr = null;
  }

  private safeStop() {
    try { this.sr?.stop?.(); } catch {}
    this.sr = null;
  }

  async listen(cfg: ListenConfig = {}): Promise<string> {
    if (!this.SRClass) return '';

    const {
      lang = 'es-AR',
      minDurationMs = 2800,
      endSilenceMs = 1500,
      minChars = 22,
      interimAllowed = true,
      maxTotalMs = 25000,
      silenceChecks = 2,
    } = cfg;

    if (!this.prepared) {
      const ok = await this.prepare();
      if (!ok) return '';
    }

    this.safeStop();
    this.sr = new (this.SRClass as any)();
    this.sr.lang = lang;
    this.sr.continuous = true;
    this.sr.interimResults = interimAllowed;

    let transcript = '';
    let firstResultAt = 0;
    let lastSpeechAt = 0;
    let hardTimer: number | null = null;
    let checkTimer: number | null = null;
    let consecutiveSilenceOK = 0;

    const cleanup = () => {
      if (hardTimer) { clearTimeout(hardTimer); hardTimer = null; }
      if (checkTimer) { clearInterval(checkTimer); checkTimer = null; }
      this.safeStop();
    };

    return new Promise<string>((resolve) => {
      const finalize = () => { cleanup(); resolve(transcript.trim()); };

      this.sr.onresult = (ev: any) => {
        if (!firstResultAt) firstResultAt = Date.now();

        let chunk = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const part = res[0]?.transcript ?? '';
          if (res.isFinal || interimAllowed) chunk += part + ' ';
        }
        if (chunk) {
          transcript = (transcript + ' ' + chunk).replace(/\s+/g, ' ');
          lastSpeechAt = Date.now();
        }
      };

      this.sr.onerror = () => finalize();
      this.sr.onend   = () => finalize();

      // Chequeo periódico de silencio + duración + longitud
      const tick = () => {
        const now = Date.now();
        const durOk = firstResultAt && (now - firstResultAt) >= minDurationMs;
        const txtOk = transcript.trim().length >= minChars;
        const silenceOk = lastSpeechAt && (now - lastSpeechAt) >= endSilenceMs;

        if (durOk && txtOk && silenceOk) {
          consecutiveSilenceOK += 1;
          if (consecutiveSilenceOK >= silenceChecks) finalize();
        } else {
          consecutiveSilenceOK = 0;
        }
      };

      checkTimer = window.setInterval(tick, 200);
      hardTimer  = window.setTimeout(() => finalize(), maxTotalMs);

      try { this.sr.start(); } catch { finalize(); }
    });
  }
}

export const recognition = new RecognitionSvc();
export type RecognitionSvcT = RecognitionSvc;
