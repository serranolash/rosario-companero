// src/lib/recognition.ts

export type PartialCb = (text: string) => void;
export type FinalCb = (text: string) => void;

/** Palabras/fragmentos que, al oírlos, marcan “usuario terminó” */
const DEFAULT_ENDERS = [
  /am[eé]n\b/i,
  /gloria al padre/i,
  /jes[uú]s/i,
  /santa mar[ií]a/i,
  /como era en el principio/i
];

class RecognitionSvc {
  private rec: SpeechRecognition | null = null;
  private listening = false;

  private partialCb: PartialCb | null = null;
  private finalCb: FinalCb | null = null;

  private enders: RegExp[] = DEFAULT_ENDERS;

  constructor() {
    // @ts-ignore
    const SR: typeof SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      this.rec = new SR();
      this.rec.lang = 'es-ES';
      this.rec.continuous = true;
      this.rec.interimResults = true;

      this.rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';

        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const txt = res[0]?.transcript || '';
          if (res.isFinal) final += txt;
          else interim += txt;
        }

        if (interim && this.partialCb) this.partialCb(interim.trim());
        if (final) {
          const clean = final.trim();
          this.finalCb?.(clean);

          // ¿terminó la mitad del fiel?
          if (this.enders.some(rx => rx.test(clean))) {
            // paramos para dar paso a la respuesta de la app
            this.stop();
          }
        }
      };

      // reintento simple ante fin/errores si seguimos “escuchando”
      const tryRestart = () => { if (this.listening) this.safeStart(); };
      this.rec.onend = tryRestart;
      this.rec.onerror = tryRestart;
    }
  }

  /** Define palabras/regex que disparan “fin del usuario” */
  setEnders(patterns: (RegExp | string)[]) {
    this.enders = patterns.map(p => (p instanceof RegExp ? p : new RegExp(p, 'i')));
  }

  onPartial(cb: PartialCb | null) { this.partialCb = cb; }
  onFinal(cb: FinalCb | null) { this.finalCb = cb; }

  private safeStart() {
    try { this.rec?.start(); } catch {}
  }

  start() {
    if (!this.rec) return;
    if (this.listening) return;
    this.listening = true;
    this.safeStart();
  }

  stop() {
    if (!this.rec) return;
    this.listening = false;
    try { this.rec.stop(); } catch {}
  }

  /** ¿Está activo? */
  isListening() { return this.listening; }
}

export const recognition = new RecognitionSvc();
export type RecognitionSvcT = RecognitionSvc;
