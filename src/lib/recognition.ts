// src/lib/recognition.ts
// Reconocedor con espera "humana": duración mínima + silencio final.
// Funciona con Web Speech API (Chrome/Android). En iOS Safari requiere gesto previo.

export type ListenConfig = {
  lang?: string;            // 'es-AR', 'es-ES', etc.
  minDurationMs?: number;   // duración mínima total desde que empezó a hablar (default 2500ms)
  endSilenceMs?: number;    // silencio final requerido para "cierre" (default 1200ms)
  minChars?: number;        // longitud mínima de texto para validar (default 15)
  interimAllowed?: boolean; // si queremos acumular interinos (default true)
  maxTotalMs?: number;      // corte duro por si se queda colgado (default 20000ms)
};

type SR = typeof window extends any
  ? (any & { new(): any })
  : never;

class RecognitionSvc {
  private SRClass: SR | null = null;
  private sr: any | null = null;
  private resolveFn: ((t: string) => void) | null = null;
  private rejectFn: ((e?: any) => void) | null = null;

  private speakingStartedAt = 0;
  private lastSpeechAt = 0;
  private transcript = '';
  private endSilenceTimer: number | null = null;
  private hardStopTimer: number | null = null;

  constructor() {
    // @ts-ignore
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.SRClass = SR || null;
  }

  supported() {
    return !!this.SRClass;
  }

  private clearTimers() {
    if (this.endSilenceTimer) {
      window.clearTimeout(this.endSilenceTimer);
      this.endSilenceTimer = null;
    }
    if (this.hardStopTimer) {
      window.clearTimeout(this.hardStopTimer);
      this.hardStopTimer = null;
    }
  }

  async listen(cfg: ListenConfig = {}): Promise<string> {
    if (!this.SRClass) {
      // Sin SR, resolvemos vacío: forzará al usuario a tocar "Responder"
      return '';
    }

    const {
      lang = 'es-AR',
      minDurationMs = 2500,
      endSilenceMs = 1200,
      minChars = 15,
      interimAllowed = true,
      maxTotalMs = 20000,
    } = cfg;

    // Limpieza previa
    this.stopInternal();

    this.sr = new this.SRClass();
    this.sr.continuous = true;
    this.sr.interimResults = interimAllowed;
    this.sr.lang = lang;

    this.transcript = '';
    this.speakingStartedAt = 0;
    this.lastSpeechAt = 0;

    return new Promise<string>((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;

      const finalizeIfReady = () => {
        const dur = Date.now() - (this.speakingStartedAt || Date.now());
        const enoughDuration = dur >= minDurationMs;
        const enoughChars = this.transcript.trim().length >= minChars;
        if (enoughDuration && enoughChars) {
          this.stopInternal();
          resolve(this.transcript.trim());
        }
      };

      this.sr.onstart = () => {
        // armado OK
      };

      this.sr.onresult = (ev: any) => {
        // Consideramos "inicio de habla" al primer resultado interino/final
        if (!this.speakingStartedAt) this.speakingStartedAt = Date.now();
        this.lastSpeechAt = Date.now();

        let chunk = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) {
            chunk += res[0].transcript + ' ';
          } else if (interimAllowed) {
            chunk += res[0].transcript + ' ';
          }
        }
        if (chunk) {
          this.transcript = (this.transcript + ' ' + chunk).replace(/\s+/g, ' ');
        }

        // Reiniciamos temporizador de "silencio final"
        this.clearEndSilenceOnly();
        this.endSilenceTimer = window.setTimeout(() => {
          // Sólo cerramos si se cumplió duración mínima + longitud mínima
          finalizeIfReady();
        }, endSilenceMs);
      };

      this.sr.onerror = (_e: any) => {
        // En móviles a veces cae por "no-speech". No fallamos: devolvemos lo que haya.
        this.stopInternal();
        resolve(this.transcript.trim());
      };

      this.sr.onend = () => {
        // Si se cerró sin disparar finalize, resolvemos lo que tengamos.
        this.stopInternal();
        resolve(this.transcript.trim());
      };

      // Corte duro por seguridad
      this.hardStopTimer = window.setTimeout(() => {
        this.stopInternal();
        resolve(this.transcript.trim());
      }, maxTotalMs);

      try {
        this.sr.start();
      } catch (e) {
        // start() puede tirar si el motor está ocupado
        resolve('');
      }
    });
  }

  private clearEndSilenceOnly() {
    if (this.endSilenceTimer) {
      window.clearTimeout(this.endSilenceTimer);
      this.endSilenceTimer = null;
    }
  }

  stopInternal() {
    this.clearTimers();
    try { if (this.sr) this.sr.stop(); } catch {}
    this.sr = null;
  }

  stop() {
    this.stopInternal();
    if (this.resolveFn) {
      const r = this.resolveFn;
      this.resolveFn = null;
      r(this.transcript.trim());
    }
  }
}

export const recognition = new RecognitionSvc();
