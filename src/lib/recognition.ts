// src/lib/recognition.ts

// Declaraciones mínimas para TS (SpeechRecognition / webkitSpeechRecognition)
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

/** Callbacks para UI */
type PartialCb = (text: string) => void;
type FinalCb = (text: string) => void;

export type ListenOptions = {
  lang?: string;            // ej: 'es-AR' | 'es-ES'
  minDurationMs?: number;   // mínimo tiempo escuchando antes de aceptar final
  endSilenceMs?: number;    // silencio requerido para dar por finalizado
  minChars?: number;        // evita disparos con frases muy cortas
  maxTotalMs?: number;      // tope de sesión por seguridad
  silenceChecks?: number;   // cantidad de chequeos de silencio consecutivos
};

class RecognitionSvc {
  private rec: any | null = null;
  private listening = false;

  private partialCb: PartialCb | null = null;
  private finalCb: FinalCb | null = null;

  onPartial(cb: PartialCb | null) { this.partialCb = cb; }
  onFinal(cb: FinalCb | null) { this.finalCb = cb; }

  /** Prepara y testea soporte. No lanza si no hay SR: simplemente no-op. */
  async prepare() {
    // nada que hacer aquí; se crea para cada listen()
    return;
  }

  /** Corta escucha sin romper la app. */
  stop() {
    try { this.rec && this.rec.stop && this.rec.stop(); } catch {}
    this.listening = false;
  }

  /** Escucha hasta que detecta final por silencio + duración + minChars. */
  listen(opts: ListenOptions = {}): Promise<void> {
    const {
      lang = 'es-AR',
      minDurationMs = 2500,
      endSilenceMs = 1500,
      minChars = 18,
      maxTotalMs = 25000,
      silenceChecks = 2,
    } = opts;

    return new Promise<void>((resolve) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        // Sin soporte: esperamos un tiempo y resolvemos
        setTimeout(() => resolve(), Math.max(minDurationMs, 1200));
        return;
      }

      const rec = new SR();
      this.rec = rec;
      this.listening = true;

      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;

      let startedAt = Date.now();
      let lastVoiceAt = Date.now();
      let finals = '';
      let interim = '';
      let okSilenceCount = 0;

      const finish = () => {
        if (!this.listening) return;
        this.listening = false;
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

        // si hay silencio y ya cumplimos mínimos, cerramos
        if (!tooShort() && enoughChars() && longSilence()) {
          okSilenceCount++;
          if (okSilenceCount >= silenceChecks) {
            finish();
          }
        } else if (!longSilence()) {
          okSilenceCount = 0;
        }
      };

      rec.onerror = () => finish();
      rec.onend = () => finish();

      // Cortes de seguridad
      setTimeout(() => finish(), maxTotalMs);

      try { rec.start(); } catch { finish(); }
    });
  }
}

export const recognition = new RecognitionSvc();
export type RecognitionSvcType = RecognitionSvc;
