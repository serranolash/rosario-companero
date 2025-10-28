// src/lib/recognition.ts
type Listener = (text: string) => void;

class RecognitionSvc {
  private rec: any = null;
  private active = false;
  private subs: Listener[] = [];

  async init() {
    if (this.rec) return;
    const w: any = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'es-ES';
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      const txt = (last[0]?.transcript || '').toLowerCase();
      this.subs.forEach(fn => fn(txt));
    };
    r.onend = () => { if (this.active) try { r.start(); } catch {} };

    this.rec = r;
  }

  async start() {
    await this.init();
    if (!this.rec) return;
    this.active = true;
    try { this.rec.start(); } catch {}
  }

  async stop() {
    if (!this.rec) return;
    this.active = false;
    try { this.rec.stop(); } catch {}
  }

  async pause() { await this.stop(); }
  async resume() { await this.start(); }

  on(fn: Listener) { this.subs.push(fn); return () => { this.subs = this.subs.filter(s => s !== fn); }; }

  /** Espera hasta que se detecte alguna de las palabras clave (o timeout). */
  async waitFor(keys: string[], ms = 15000): Promise<string | null> {
    let off = () => {};
    try {
      const hit = await new Promise<string | null>((resolve) => {
        const t = setTimeout(() => { off(); resolve(null); }, ms);
        off = this.on((txt) => {
          for (const k of keys) {
            if (txt.includes(k.toLowerCase())) {
              clearTimeout(t); off(); resolve(k); return;
            }
          }
        });
      });
      return hit;
    } catch { off(); return null; }
  }
}

export const recognition = new RecognitionSvc();
