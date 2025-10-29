// src/lib/recognition.ts
// Reconocimiento de voz compatible con Next/TS sin tipos DOM, con:
// prepare(), listen(opts), stop(), isListening(), supported().

type PartialCb = (text: string) => void;
type FinalCb = (text: string) => void;

export type ListenOptions = {
  lang?: string;        // ej. 'es-AR' o 'es-ES'
  minDurationMs?: number;  // tiempo mínimo escuchando antes de aceptar final
  endSilenceMs?: number;   // silencio requerido para dar por finalizada la frase
  minChars?: number;       // largo mínimo de texto para considerarlo válido
  maxTotalMs?: number;     // máximo absoluto de escucha
  silenceChecks?: number;  // cantidad de chequeos de silencio consecutivos
  onPartial?: PartialCb;   // (opcional) callback de parciales
  onFinal?: FinalCb;       // (opcional) callback al finalizar
};

function getSR(): any | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

class RecognitionSvc {
  private SR: any | null = null;
  private rec: any | null = null;
  private listening = false;

  constructor() {
    this.SR = getSR();
  }

  supported(): boolean { return !!this.SR; }
  isListening(): boolean { return this.listening; }

  /** Warm-up: carga voces/permiso y deja todo listo. */
  async prepare(): Promise<void> {
    if (!this.SR) return;
    try {
      const tmp = new this.SR();
      tmp.lang = 'es-ES';
      tmp.interimResults = true;
      tmp.continuous = false;
      // Iniciar y abortar enseguida para “despertar” permisos en algunos navegadores
      try { tmp.start(); } catch {}
      setTimeout(() => { try { tmp.abort?.(); } catch {} }, 50);
    } catch {}
  }

  /** Escucha una “mitad” del rezo y resuelve con el texto final. */
  listen(opts: ListenOptions = {}): Promise<string> {
    return new Promise<string>((resolve) => {
      if (!this.SR) return resolve('');

      // Asegurar un único reconocimiento activo
      this.stop();

      const {
        lang = 'es-ES',
        minDurationMs = 1500,
        endSilenceMs = 1200,
        minChars = 12,
        maxTotalMs = 20000,
        silenceChecks = 1,
        onPartial,
        onFinal,
      } = opts;

      const rec = new this.SR();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;

      let startedAt = Date.now();
      let lastSoundAt = startedAt;
      let lastPartial = '';
      let finalText = '';
      let silentHits = 0;
      let killed = false;

      const finish = (text: string) => {
        if (killed) return;
        killed = true;
        this.listening = false;
        try { rec.onresult = null; rec.onend = null; rec.onerror = null; } catch {}
        try { rec.stop(); } catch {}
        try { rec.abort?.(); } catch {}
        resolve(text.trim());
      };

      rec.onresult = (ev: any) => {
        const now = Date.now();
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const txt: string = (res[0]?.transcript || '').trim();
          if (!txt) continue;

          lastSoundAt = now;

          if (res.isFinal) {
            finalText = txt;
            onFinal?.(finalText);
          } else {
            lastPartial = txt;
            onPartial?.(lastPartial);
          }
        }

        // Si ya tenemos final y cumplimos requisitos mínimos, cerrar
        const enoughTime = now - startedAt >= minDurationMs;
        const enoughLen = (finalText || lastPartial).length >= minChars;

        // Silencio detectado desde la última actividad
        const silentFor = now - lastSoundAt;
        if (silentFor >= endSilenceMs) {
          silentHits++;
        } else {
          silentHits = 0;
        }

        if ((finalText && enoughTime && enoughLen) ||
            (silentHits >= silenceChecks && enoughTime && enoughLen)) {
          finish(finalText || lastPartial);
        }
      };

      rec.onerror = () => {
        finish(finalText || lastPartial);
      };
      rec.onend = () => {
        // Safari a veces dispara onend sin resultado: devolver lo que haya
        finish(finalText || lastPartial);
      };

      this.rec = rec;
      try { rec.start(); this.listening = true; } catch { finish(''); }

      // Corte duro por timeout
      setTimeout(() => finish(finalText || lastPartial), maxTotalMs);
    });
  }

  stop() {
    this.listening = false;
    if (this.rec) {
      try { this.rec.stop(); } catch {}
      try { this.rec.abort?.(); } catch {}
      this.rec = null;
    }
  }
}

export const recognition = new RecognitionSvc();
