'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { audio } from '@/lib/audio'
import { recognition } from '@/lib/recognition'
import prayers from '@/data/prayers.es.json'
import mysteriesData from '@/data/mysteries.es.json' // { id, title, days, decades?: [{title,desc,img}] }

/* =======================
   Tipos y fases del flujo
   ======================= */
type Phase =
  | 'IDLE'           // antes de iniciar sesión
  | 'INTRO'
  | 'ANNOUNCE'
  | 'RUNNING'
  | 'DONE'

const MAX_DECADES = 5
const autoHandsFree = true // ← activar modo manos libres

/* =======================
   A) Normalización por title (con fallback)
   ======================= */
type Decade = { title: string; desc?: string; img?: string }
type MysteryGroup = { id: string; title: string; days: string[]; decades?: Decade[] }

const FALLBACK_DECADES: Record<string, string[]> = {
  Gozosos: [
    'La Encarnación del Hijo de Dios',
    'La Visitación de Nuestra Señora a Santa Isabel',
    'El Nacimiento del Hijo de Dios',
    'La Presentación de Jesús en el Templo',
    'El Niño Jesús perdido y hallado',
  ],
  Dolorosos: [
    'La Oración de Jesús en el Huerto',
    'La Flagelación del Señor',
    'La Coronación de espinas',
    'Jesús con la Cruz a cuestas',
    'La Crucifixión y Muerte de Jesús',
  ],
  Gloriosos: [
    'La Resurrección del Señor',
    'La Ascensión del Señor',
    'La Venida del Espíritu Santo',
    'La Asunción de la Virgen',
    'La Coronación de María Santísima',
  ],
  Luminosos: [
    'El Bautismo en el Jordán',
    'Las Bodas de Caná',
    'El Anuncio del Reino',
    'La Transfiguración',
    'La Institución de la Eucaristía',
  ],
}

function normalizeMysteries(
  raw: MysteryGroup[],
): (MysteryGroup & { decades: Decade[] })[] {
  return raw.map((m) => ({
    ...m,
    decades:
      m.decades && m.decades.length
        ? m.decades
        : (FALLBACK_DECADES[m.title] || []).map((t) => ({ title: t })),
  })) as any
}

/* ===== Helper: grupo del día por título ===== */
function todayMysteryGroup() {
  const d = new Date().getDay() // 0=domingo
  // lun/sab Gozosos, mar/vie Dolorosos, mie/dom Gloriosos, jue Luminosos
  if (d === 1 || d === 6) return 'Gozosos'
  if (d === 2 || d === 5) return 'Dolorosos'
  if (d === 3 || d === 0) return 'Gloriosos'
  return 'Luminosos'
}
function ordinal(n: number) {
  return ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'][n - 1] || `${n}º`
}

/* =======================
   Espera del turno del feligrés (hands-free)
   ======================= */
async function waitUser(kind: 'pn' | 'ave' | 'gloria') {
  if (!autoHandsFree) return
  // pequeña pausa natural antes de activar mic
  await new Promise((r) => setTimeout(r, 300))
  await recognition.listen({
    lang: 'es-AR',       // o 'es-ES'
    minDurationMs: 2800, // un poco más pausado
    endSilenceMs: 1400,
    minChars: 20,
    maxTotalMs: 22000,
  })
}

/* =======================
   Componente principal
   ======================= */
export default function PrayPage() {
  const [phase, setPhase] = useState<Phase>('IDLE')
  const [decadeIdx, setDecadeIdx] = useState(0)
  const [aveCount, setAveCount] = useState(0)
  const [showLine, setShowLine] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [started, setStarted] = useState(false)

  // Grupo y misterios del día
  const groupTitle = useMemo(() => todayMysteryGroup(), [])
  const mysteries = useMemo(() => normalizeMysteries(mysteriesData as any), [])
  const mystery = useMemo(
    () => mysteries.find((m: any) => m.title === groupTitle) || mysteries[0],
    [mysteries, groupTitle],
  )
  const decade = useMemo(
    () => mystery?.decades?.[decadeIdx],
    [mystery, decadeIdx],
  )

  // Preparar audio: mostrar línea del texto hablado
  useEffect(() => {
    audio.init?.()
    audio.setOnLine?.((l) => setShowLine(l))
    return () => {
      try { recognition.stop() } catch {}
    }
  }, [])

  /* =======================
     Orquestadores de sesión
     ======================= */

  // Arranca 5 decenas (rosario completo)
  async function startSessionFull() {
    if (started) return
    setStarted(true)
    setPhase('INTRO')

    try {
      // 1) Desbloquear audio + pedir mic 1 sola vez
      await audio.init?.()
      await recognition.prepare()

      // 2) (Opcional) Intro abreviada
      try {
        await audio.sayOrPlay(prayers.por_la_senal, '/audio/intro/por-la-senal.mp3')
        await audio.sayOrPlay(prayers.acto_contricion, '/audio/intro/acto-contricion.mp3')
        await audio.sayOrPlay(prayers.gloria.parte1, '/audio/gloria/parte1.mp3')
        await audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3')
      } catch {}

      // 3) 5 decenas
      setPhase('RUNNING')
      for (let d = 0; d < MAX_DECADES; d++) {
        await runDecade(d)
      }

      // 4) Final (opcional)
      // await audio.sayOrPlay('Salve...', '/audio/final/salve.mp3')

      setPhase('DONE')
    } catch (e) {
      console.error('Error en la sesión completa:', e)
      setPhase('DONE')
    }
  }

  // Arranca 1 sola decena (la actual)
  async function startSessionSingle() {
    if (started) return
    setStarted(true)
    setPhase('INTRO')

    try {
      await audio.init?.()
      await recognition.prepare()

      setPhase('RUNNING')
      await runDecade(0)

      setPhase('DONE')
    } catch (e) {
      console.error('Error en la sesión de una decena:', e)
      setPhase('DONE')
    }
  }

  // Ejecuta una decena completa, con anuncio + PN + 10 AVE + Gloria
  async function runDecade(idx: number) {
    setDecadeIdx(idx)
    setAveCount(0)

    // Anuncio del misterio
    const title = mystery?.title || ''
    const dTitle = mystery?.decades?.[idx]?.title || ''
    setPhase('ANNOUNCE')
    try {
      await audio.sayOrPlay(
        `${ordinal(idx + 1)} misterio ${title}: ${dTitle}.`,
        '/audio/misterios/announce.mp3',
      )
    } catch {}

    // Padre Nuestro: usuario → app
    await waitUser('pn')
    await audio.sayOrPlay(
      prayers.padre_nuestro.parte2,
      '/audio/padre-nuestro/parte2.mp3',
    )

    // 10 Ave Marías: usuario → app
    for (let i = 0; i < 10; i++) {
      setAveCount(i)
      await waitUser('ave')
      await audio.sayOrPlay(
        prayers.ave_maria.parte2,
        '/audio/ave-maria/parte2.mp3',
      )
      setAveCount(i + 1)
    }

    // Gloria: usuario → app
    await waitUser('gloria')
    await audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3')

    // Opcionales (comentados si no tenés los audios)
    // await audio.sayOrPlay(prayers.maria_madre_de_gracia, '/audio/extras/maria-madre.mp3')
    // await audio.sayOrPlay(prayers.oh_jesus_mio, '/audio/extras/oh-jesus-mio.mp3')
  }

  /* =======================
     UI
     ======================= */
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-sm underline">
          ← Volver
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Rezo del Rosario</h1>
      </div>

      {/* Línea visible cuando la app reza (TTS / audio pregrabado) */}
      {showLine && (
        <div className="card mb-4">
          <p className="text-lg leading-relaxed">{showLine}</p>
          <p className="text-sm muted">Recitemos juntos esta parte.</p>
        </div>
      )}

      {/* Estado del día / progreso */}
      <div className="card mb-4">
        <p className="mb-2">
          <b>Misterio del día:</b> {mystery?.title}
        </p>
        <p className="mb-2">
          <b>Decena:</b> {Math.min(decadeIdx + 1, MAX_DECADES)} / {MAX_DECADES}
        </p>
        {decade && (
          <>
            <p>
              <b>Título:</b> {decade.title}
            </p>
            {decade.desc && <p className="muted mt-1">{decade.desc}</p>}
          </>
        )}
        <p className="mt-2 text-sm text-gray-600">
          Ave Marías de esta decena: {aveCount}/10
        </p>
      </div>

      {/* Pantalla de inicio (gesto único) */}
      {!started && (
        <div className="card mb-4">
          <p className="mb-3">
            Toca una opción para preparar audio y micrófono, y comenzar en modo manos libres:
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={startSessionFull} disabled={busy}>
              Rezar el rosario completo
            </button>
            <button className="btn" onClick={startSessionSingle} disabled={busy}>
              Rezar una decena
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            * En móviles, el audio sólo se habilita tras un toque del usuario.
          </p>
        </div>
      )}

      {/* Indicaciones según fase */}
      {started && (
        <div className="card mb-4">
          {phase === 'INTRO' && <p>Preparando audio y micrófono…</p>}
          {phase === 'ANNOUNCE' && <p>Anunciando el misterio…</p>}
          {phase === 'RUNNING' && (
            <p>
              <b>Modo manos libres activo:</b> la app escucha tu mitad y responde automáticamente.
            </p>
          )}
          {phase === 'DONE' && <p><b>¡Sesión finalizada!</b> Gracias por rezar.</p>}
        </div>
      )}

      {/* Controles de seguridad / debug (sin “Responder”) */}
      {started && (
        <div className="flex gap-3">
          <button
            className="btn btn-secondary"
            onClick={() => {
              try { recognition.stop() } catch {}
            }}
          >
            Detener escucha
          </button>
        </div>
      )}
    </main>
  )
}
