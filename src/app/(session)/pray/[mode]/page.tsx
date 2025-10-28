'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { audio } from '@/lib/audio'
import { recognition } from '@/lib/recognition'
import prayers from '@/data/prayers.es.json'
import mysteriesData from '@/data/mysteries.es.json' // { id, title, days, decades?: [{title,desc,img}] }

type Phase =
  | 'INTRO'
  | 'ANNOUNCE_1' | 'PN_USER' | 'PN_APP'
  | 'AVE_USER' | 'AVE_APP'
  | 'GLORIA_BLOCK'
  | 'NEXT_DECADE'
  | 'DONE'

const MAX_DECADES = 5;

/* =======================
   A) Normalización por title (con fallback)
   ======================= */
type Decade = { title: string; desc?: string; img?: string };
type MysteryGroup = { id: string; title: string; days: string[]; decades?: Decade[] };

// Títulos de respaldo si el JSON no trae "decades"
const FALLBACK_DECADES: Record<string, string[]> = {
  Gozosos: [
    'La Encarnación del Hijo de Dios',
    'La Visitación de Nuestra Señora a Santa Isabel',
    'El Nacimiento del Hijo de Dios',
    'La Presentación de Jesús en el Templo',
    'El Niño Jesús perdido y hallado'
  ],
  Dolorosos: [
    'La Oración de Jesús en el Huerto',
    'La Flagelación del Señor',
    'La Coronación de espinas',
    'Jesús con la Cruz a cuestas',
    'La Crucifixión y Muerte de Jesús'
  ],
  Gloriosos: [
    'La Resurrección del Señor',
    'La Ascensión del Señor',
    'La Venida del Espíritu Santo',
    'La Asunción de la Virgen',
    'La Coronación de María Santísima'
  ],
  Luminosos: [
    'El Bautismo en el Jordán',
    'Las Bodas de Caná',
    'El Anuncio del Reino',
    'La Transfiguración',
    'La Institución de la Eucaristía'
  ],
};

function normalizeMysteries(raw: MysteryGroup[]): (MysteryGroup & { decades: Decade[] })[] {
  return raw.map(m => ({
    ...m,
    decades: (m.decades && m.decades.length)
      ? m.decades
      : (FALLBACK_DECADES[m.title] || []).map(t => ({ title: t })),
  })) as any;
}

/* ===== Helper para determinar el grupo de hoy por título ===== */
function todayMysteryGroup() {
  const d = new Date().getDay(); // 0=domingo
  // lun/sab Gozosos, mar/vie Dolorosos, mie/dom Gloriosos, jue Luminosos
  if (d === 1 || d === 6) return 'Gozosos';
  if (d === 2 || d === 5) return 'Dolorosos';
  if (d === 3 || d === 0) return 'Gloriosos';
  return 'Luminosos';
}

/* ======= Utilidades varias ======= */
function includesSome(text: string, keys: string[]) {
  const t = (text || '').toLowerCase();
  return keys.some(k => t.includes(k.toLowerCase()));
}
function ordinal(n: number) {
  return ['Primer','Segundo','Tercer','Cuarto','Quinto'][n-1] || `${n}º`;
}

export default function PrayPage() {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [decadeIdx, setDecadeIdx] = useState(0);
  const [aveCount, setAveCount] = useState(0);
  const [showLine, setShowLine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A) Computar por title (no por group)
  const groupTitle = useMemo(() => todayMysteryGroup(), []);
  const mysteries = useMemo(() => normalizeMysteries(mysteriesData as any), []);
  const mystery = useMemo(
    () => mysteries.find((m: any) => m.title === groupTitle) || mysteries[0],
    [mysteries, groupTitle]
  );
  const decade = useMemo(() => mystery?.decades?.[decadeIdx], [mystery, decadeIdx]);

  // Conecta audio con STT + línea UI
  useEffect(() => {
    audio.init();
    audio.setRecognitionHooks({ pause: () => recognition.pause(), resume: () => recognition.resume() });
    audio.setOnLine((l) => setShowLine(l));
    recognition.start();
    runIntro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runIntro() {
    setBusy(true);
    setPhase('INTRO');
    try {
      await audio.sayOrPlay(prayers.por_la_senal, '/audio/intro/por-la-senal.mp3');
      await audio.sayOrPlay(prayers.acto_contricion, '/audio/intro/acto-contricion.mp3');
      await audio.sayOrPlay(prayers.abre_labios.peticion, '/audio/intro/abre-labios-p.mp3');
      await audio.sayOrPlay(prayers.abre_labios.respuesta, '/audio/intro/abre-labios-r.mp3');
      await audio.sayOrPlay(prayers.ven_auxilio.peticion, '/audio/intro/ven-auxilio-p.mp3');
      await audio.sayOrPlay(prayers.ven_auxilio.respuesta, '/audio/intro/ven-auxilio-r.mp3');
      await audio.sayOrPlay(prayers.gloria.parte1, '/audio/gloria/parte1.mp3');
      await audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3');
    } catch { /* ignorar */ }
    finally {
      setBusy(false);
      // Anunciar misterio 1
      setPhase('ANNOUNCE_1');
      setTimeout(announceFirst, 100);
    }
  }

  async function announceFirst() {
    if (!mystery || !decade) { setPhase('PN_USER'); return; }
    setBusy(true);
    try {
      // A) usar mystery.title (no mystery.group)
      await audio.sayOrPlay(
        `Primer misterio ${mystery.title}: ${decade.title}.`,
        '/audio/misterios/announce-1.mp3'
      );
    } catch {}
    finally {
      setBusy(false);
      setPhase('PN_USER');
      recognition.waitFor(['padre nuestro', 'padrenuestro'], 12000).then(() => {
        // Alternancia controlada por botón/reconocimiento; no forzamos nada aquí
      });
    }
  }

  // Handlers de flujo manual (por si el STT no detecta)
  const nextStep = async () => {
    if (busy) return;

    if (phase === 'PN_USER') {
      setBusy(true);
      await audio.sayOrPlay(prayers.padre_nuestro.parte2, '/audio/pn/parte2.mp3');
      setBusy(false);
      setPhase('AVE_USER');
      setAveCount(0);
      return;
    }

    if (phase === 'AVE_USER') {
      // El feligrés dice su mitad del Ave; la app responde la segunda mitad
      setBusy(true);
      await audio.sayOrPlay(prayers.ave_maria.parte2, '/audio/ave/parte2.mp3'); // "Santa María..."
      setBusy(false);
      const n = aveCount + 1;
      setAveCount(n);
      if (n >= 10) {
        setPhase('GLORIA_BLOCK');
        runGloriaBlock();
      } else {
        setPhase('AVE_USER'); // siguiente AVE
      }
      return;
    }

    if (phase === 'GLORIA_BLOCK') {
      // Se maneja dentro de runGloriaBlock()
      return;
    }

    if (phase === 'NEXT_DECADE') {
      // Avanzar decena
      const idx = decadeIdx + 1;
      if (idx >= MAX_DECADES) { setPhase('DONE'); return; }
      setDecadeIdx(idx);
      setAveCount(0);
      setPhase('ANNOUNCE_1');

      // A) usar mystery.title + decade por índice normalizado
      await audio.sayOrPlay(
        `${ordinal(idx + 1)} misterio ${mystery.title}: ${mystery.decades[idx].title}.`,
        '/audio/misterios/announce-next.mp3'
      );

      setPhase('PN_USER');
      return;
    }
  };

  /* =======================
     B) Bloque Gloria con claves seguras + fallback
     ======================= */
  async function runGloriaBlock() {
    setBusy(true);
    try {
      await audio.sayOrPlay(prayers.gloria.parte1, '/audio/gloria/parte1.mp3');
      await audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3');

      const madre = (prayers as any)['maria_madre_de_gracia']
        || 'María, Madre de gracia, Madre de misericordia. Defiéndenos de nuestros enemigos y ampáranos ahora y en la hora de nuestra muerte. Amén.';

      const oh = (prayers as any)['oh_jesus_mio']
        || 'Oh Jesús mío, perdónanos, líbranos del fuego del infierno y lleva a todas las almas al cielo, especialmente a las más necesitadas.';

      await audio.sayOrPlay(madre, '/audio/extras/maria-madre.mp3');
      await audio.sayOrPlay(oh, '/audio/extras/oh-jesus-mio.mp3');
    } catch { /* ignore */ }
    finally {
      setBusy(false);
      setPhase('NEXT_DECADE');
    }
  }

  // Reconocimiento “blando” para alternar (no rompe si falla)
  useEffect(() => {
    const off = recognition.on(async (txt) => {
      if (busy) return;

      if (phase === 'PN_USER') {
        if (includesSome(txt, ['padre nuestro', 'padrenuestro', 'santificado'])) {
          await nextStep();
        }
      } else if (phase === 'AVE_USER') {
        if (includesSome(txt, ['dios te salve', 'bendita tú eres', 'bendito es el fruto'])) {
          await nextStep();
        }
      }
    });
    return () => { try { off(); } catch {} };
  }, [phase, busy, aveCount]);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-sm underline">← Volver</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Rezo del Rosario</h1>
      </div>

      {/* Línea visible cuando la app reza (intro o anuncios) */}
      {showLine && (
        <div className="card mb-4">
          <p className="text-lg leading-relaxed">{showLine}</p>
          <p className="text-sm muted">Recitemos juntos esta parte.</p>
        </div>
      )}

      {/* Estado actual */}
      <div className="card mb-4">
        <p className="mb-2"><b>Misterio del día:</b> {mystery?.title}</p>
        <p className="mb-2"><b>Decena:</b> {decadeIdx + 1} / 5</p>
        {decade && (
          <>
            <p><b>Título:</b> {decade.title}</p>
            {decade.desc && <p className="muted mt-1">{decade.desc}</p>}
          </>
        )}
      </div>

      {/* Instrucciones por fase */}
      <div className="card mb-4">
        {phase === 'INTRO' && <p>Oraciones iniciales…</p>}
        {phase === 'ANNOUNCE_1' && <p>Anunciando primer misterio…</p>}
        {phase === 'PN_USER' && <p><b>Tu parte:</b> Padre Nuestro (tu mitad). Luego la app responde.</p>}
        {phase === 'AVE_USER' && <p><b>Tu parte:</b> Ave María (tu mitad). La app responde “Santa María…” (Conteo: {aveCount}/10)</p>}
        {phase === 'GLORIA_BLOCK' && <p>Gloria… María Madre de gracia… Oh Jesús mío…</p>}
        {phase === 'NEXT_DECADE' && <p>Podés avanzar al siguiente misterio.</p>}
        {phase === 'DONE' && <p><b>¡Rosario completo!</b></p>}
      </div>

      {/* Controles mínimos para no quedar bloqueado si el STT falla */}
      <div className="flex gap-3">
        <button className="btn btn-secondary" onClick={() => recognition.start()}>Reactivar escucha</button>
        <button className="btn btn-primary" onClick={nextStep} disabled={busy}>
          {busy ? 'Reproduciendo…' : 'Continuar'}
        </button>
      </div>
    </main>
  );
}
