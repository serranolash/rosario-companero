// src/lib/recognition.ts

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type PartialCb = (text: string) => void;
type FinalCb = (text: string) => void;

export type ListenOptions = {
  lang?: string;
  minDurationMs?: number;
  endSilenceMs?: number;
  minChars?: number;
  maxTotalMs?: number;
  silenceChecks?: number;
};

class RecognitionSvc {
  private rec: any | null = null;
  private listening = false;
  private finished = false;

  private partialCb: PartialCb | null = null;
  private finalCb: FinalCb | null = null;

  onPartial(cb: PartialCb | null) { this.partialCb = cb; }
  onFinal(cb: FinalCb | null) { this.finalCb = cb; }

  async prepare() { /* no-op */ }

  stop() {
    try { this.rec && this.rec.stop && this.rec.stop(); } catch {}
    this.listening = false;
    this.finished = true;
  }

  listen(opts: ListenOptions = {}): Promise<void> {
    const {
      lang = 'es-AR',
      minDurationMs = 3600,
      endSilenceMs = 1800,
      minChars = 18,
      maxTotalMs = 20000,
      silenceChecks = 2,
    } = opts;

    return new Promise<void>((resolve) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        setTimeout(() => resolve(), Math.max(minDurationMs, 1000));
        return;
      }

      // si había uno previo, detenerlo
      try { this.rec && this.rec.stop && this.rec.stop(); } catch {}

      const rec = new SR();
      this.rec = rec;
      this.listening = true;
      this.finished = false;

      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;

      const startedAt = Date.now();
      let lastVoiceAt = Date.now();
      let finals = '';
      let interim = '';
      let okSilenceCount = 0;
      let resolved = false;

      const finishOnce = () => {
        if (resolved) return;
        resolved = true;
        this.listening = false;
        this.finished = true;
        try { rec.stop(); } catch {}
        this.partialCb?.('');
        this.finalCb?.(finals.trim());
        resolve();
      };

      const tooShort = () => (Date.now() - startedAt < minDurationMs);
      const enoughChars = () => (finals + ' ' + interim).trim().length >= minChars;
      const longSilence = () => (Date.now() - lastVoiceAt >= endSilenceMs);

      rec.onresult = (ev: any) => {
        interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const txt = res[0]?.transcript || '';
          if (res.isFinal) {
            finals += (finals ? ' ' : '') + txt;
            lastVoiceAt = Date.now();
            okSilenceCount = 0;
            this.finalCb?.(finals.trim());
          } else {
            interim += (interim ? ' ' : '') + txt;
            this.partialCb?.((finals + ' ' + interim).trim());
          }
        }

        if (!tooShort() && enoughChars() && longSilence()) {
          okSilenceCount++;
          if (okSilenceCount >= silenceChecks) finishOnce();
        } else if (!longSilence()) {
          okSilenceCount = 0;
        }
      };

      rec.onerror = () => finishOnce();
      rec.onend = () => finishOnce();

      // corte duro por seguridad
      setTimeout(() => finishOnce(), maxTotalMs);

      try { rec.start(); } catch { finishOnce(); }
    });
  }
}

export const recognition = new RecognitionSvc();
export type RecognitionSvcType = RecognitionSvc;
