'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { audio } from '@/lib/audio'
import { recognition } from '@/lib/recognition'
import prayers from '@/data/prayers.es.json'
import mysteriesData from '@/data/mysteries.es.json'

type Phase = 'IDLE' | 'INTRO' | 'ANNOUNCE' | 'RUNNING' | 'DONE'
type UICue = { title?: string; subtitle?: string } | null

type Decade = { title: string; desc?: string; img?: string }
type MysteryGroup = { id: string; title: string; days: string[]; decades?: Decade[] }

const MAX_DECADES = 5
const autoHandsFree = true

/* ---------- Normalizadores y helpers ---------- */
const FALLBACK_DECADES: Record<string, string[]> = {
  gozosos: [
    'La Encarnación del Hijo de Dios',
    'La Visitación de Nuestra Señora a Santa Isabel',
    'El Nacimiento del Hijo de Dios',
    'La Presentación de Jesús en el Templo',
    'El Niño Jesús perdido y hallado',
  ],
  dolorosos: [
    'La Oración de Jesús en el Huerto',
    'La Flagelación del Señor',
    'La Coronación de espinas',
    'Jesús con la Cruz a cuestas',
    'La Crucifixión y Muerte de Jesús',
  ],
  gloriosos: [
    'La Resurrección del Señor',
    'La Ascensión del Señor',
    'La Venida del Espíritu Santo',
    'La Asunción de la Virgen',
    'La Coronación de María Santísima',
  ],
  luminosos: [
    'El Bautismo en el Jordán',
    'Las Bodas de Caná',
    'El Anuncio del Reino',
    'La Transfiguración',
    'La Institución de la Eucaristía',
  ],
}

function normKey(t: string) {
  return (t || '')
    .toLowerCase()
    .replace(/^misterios?\s+/, '') // quita "Misterios "
    .trim()
}

function groupKeyForToday(d = new Date()) {
  // 0=domingo, 1=lunes,... local time
  const day = d.getDay()
  if (day === 1 || day === 6) return 'gozosos'
  if (day === 2 || day === 5) return 'dolorosos'
  if (day === 3 || day === 0) return 'gloriosos'
  return 'luminosos'
}

function normalizeMysteries(raw: MysteryGroup[]) {
  return raw.map((m) => {
    const k = normKey(m.title)
    const decs =
      (m.decades && m.decades.length
        ? m.decades
        : (FALLBACK_DECADES[k] || []).map((t) => ({ title: t }))) as Decade[]
    return { ...m, decades: decs }
  })
}

function ordinal(n: number) {
  return ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'][n - 1] || `${n}º`
}

/* ---------- Espera manos libres ---------- */
async function waitUser(kind: 'pn' | 'ave' | 'gloria') {
  if (!autoHandsFree) return
  await new Promise((r) => setTimeout(r, 250))
  await recognition.listen({
    lang: 'es-AR',
    minDurationMs: kind === 'ave' ? 2600 : 3000,
    endSilenceMs: 1700,
    minChars: kind === 'ave' ? 22 : 26,
    maxTotalMs: 28000,
    silenceChecks: 2,
  })
}

/* =========================================================
   Componente
   ========================================================= */
export default function PrayPage() {
  const [phase, setPhase] = useState<Phase>('IDLE')
  const [decadeIdx, setDecadeIdx] = useState(0)
  const [aveCount, setAveCount] = useState(0)
  const [showLine, setShowLine] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [uiCue, setUiCue] = useState<UICue>(null)

  // Normalizamos datos una sola vez
  const allGroups = useMemo(
    () => normalizeMysteries(mysteriesData as any),
    [],
  )

  // Grupo activo del día (fijado en cliente)
  const [activeGroup, setActiveGroup] = useState<MysteryGroup & { decades: Decade[] } | null>(null)

  useEffect(() => {
    // cliente: evita SSR/UTC
    const wanted = groupKeyForToday()
    // buscar por clave normalizada; si no, por inclusión
    const found =
      (allGroups as any).find((g: MysteryGroup) => normKey(g.title) === wanted) ||
      (allGroups as any).find((g: MysteryGroup) => normKey(g.title).includes(wanted)) ||
      (allGroups as any)[0]
    setActiveGroup(found as any)
  }, [allGroups])

  // preparar audio / línea de TTS
  useEffect(() => {
    audio.init?.()
    audio.setOnLine?.((l) => setShowLine(l))
    return () => {
      try { recognition.stop() } catch {}
    }
  }, [])

  /* ---------- Bloques de rezo ---------- */

  async function runIntroBlock() {
    try {
      setUiCue({ title: 'Inicio', subtitle: 'Recemos juntos' })
      if ((prayers as any).por_la_senal) await audio.sayChunks((prayers as any).por_la_senal)
      if ((prayers as any).acto_contricion) await audio.sayChunks((prayers as any).acto_contricion)
      if ((prayers as any).abre_labios?.peticion) {
        await audio.sayChunks((prayers as any).abre_labios.peticion)
        await audio.sayChunks((prayers as any).abre_labios.respuesta)
      }
      if ((prayers as any).ven_auxilio?.peticion) {
        await audio.sayChunks((prayers as any).ven_auxilio.peticion)
        await audio.sayChunks((prayers as any).ven_auxilio.respuesta)
      }
      if ((prayers as any).gloria?.parte1) await audio.sayChunks((prayers as any).gloria.parte1)
      if ((prayers as any).gloria?.parte2) await audio.sayChunks((prayers as any).gloria.parte2)
    } finally {
      setUiCue(null)
    }
  }

  // Decena pura por parámetros (NO toma estado → no se desfasa)
  async function runOneDecadeByIndex(groupTitle: string, decs: Decade[], idx: number) {
    const thisDecade = decs[idx]
    setPhase('ANNOUNCE')
    await audio.sayChunks(`${ordinal(idx + 1)} misterio ${groupTitle}: ${thisDecade.title}.`)

    // Padre Nuestro
    setUiCue({ title: 'Padre Nuestro', subtitle: 'Tu parte primero…' })
    await waitUser('pn')
    await audio.sayChunks((prayers as any).padre_nuestro?.parte2 ?? 'Amén.')

    // 10 Avemarías
    for (let i = 0; i < 10; i++) {
      setAveCount(i)
      setUiCue({ title: `Ave María (${i + 1}/10)`, subtitle: 'Tu parte primero…' })
      await waitUser('ave')
      await audio.sayChunks((prayers as any).ave_maria?.parte2 ?? 'Santa María, Madre de Dios…')
      setAveCount(i + 1)
    }

    // Gloria + opcionales
    setUiCue({ title: 'Gloria', subtitle: 'Tu parte…' })
    await waitUser('gloria')
    await audio.sayChunks((prayers as any).gloria?.parte2 ?? 'Como era en el principio…')

    const madre = (prayers as any)['maria_madre_de_gracia']
    const oh = (prayers as any)['oh_jesus_mio']
    if (madre) await audio.sayChunks(madre)
    if (oh) await audio.sayChunks(oh)

    setUiCue(null)
  }

  async function runAllDecades() {
    if (!activeGroup) return
    setPhase('RUNNING')
    const groupTitle = normKey(activeGroup.title) // ej. "gloriosos"
    const prettyGroupTitle =
      { gozosos: 'Gozosos', dolorosos: 'Dolorosos', gloriosos: 'Gloriosos', luminosos: 'Luminosos' }[groupTitle] ||
      activeGroup.title.replace(/^Misterios?\s+/, '')

    const decs = activeGroup.decades.slice(0, MAX_DECADES)

    for (let i = 0; i < decs.length; i++) {
      // actualizar UI para esta decena
      setDecadeIdx(i)
      setAveCount(0)
      await runOneDecadeByIndex(prettyGroupTitle, decs, i)
    }
  }

  async function runSingleDecade() {
    if (!activeGroup) return
    const groupTitle = activeGroup.title.replace(/^Misterios?\s+/, '')
    const decs = activeGroup.decades.slice(0, MAX_DECADES)
    const i = decadeIdx // la que esté seleccionada en UI
    await runOneDecadeByIndex(groupTitle, decs, i)
  }

  async function startSessionFull() {
    if (started) return
    setStarted(true)
    setPhase('INTRO')
    try {
      await audio.init()
      await recognition.prepare()
      await runIntroBlock()
      await runAllDecades()
      setPhase('DONE')
    } catch {
      setPhase('DONE')
    }
  }

  async function startSessionSingle() {
    if (started) return
    setStarted(true)
    setPhase('INTRO')
    try {
      await audio.init()
      await recognition.prepare()
      await runIntroBlock()
      await runSingleDecade()
      setPhase('DONE')
    } catch {
      setPhase('DONE')
    }
  }

  /* ---------- UI ---------- */
  const currentDecade = activeGroup?.decades?.[decadeIdx]
  const headerGroupName = activeGroup
    ? activeGroup.title.replace(/^Misterios?\s+/, '')
    : '—'

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-sm underline">← Volver</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Rezo del Rosario</h1>
      </div>

      {showLine && (
        <div className="card mb-4">
          <p className="text-lg leading-relaxed">{showLine}</p>
          <p className="text-sm muted">Recitemos juntos esta parte.</p>
        </div>
      )}

      {uiCue && (
        <div className="card mb-4">
          {uiCue.title && <p className="text-lg font-semibold">{uiCue.title}</p>}
          {uiCue.subtitle && <p className="muted">{uiCue.subtitle}</p>}
        </div>
      )}

      <div className="card mb-4">
        <p className="mb-2"><b>Misterio del día:</b> {headerGroupName}</p>
        <p className="mb-2"><b>Decena:</b> {Math.min(decadeIdx + 1, MAX_DECADES)} / {MAX_DECADES}</p>
        {currentDecade && (
          <>
            <p><b>Título:</b> {currentDecade.title}</p>
            {currentDecade.desc && <p className="muted mt-1">{currentDecade.desc}</p>}
          </>
        )}
        <p className="mt-2 text-sm text-gray-600">Ave Marías de esta decena: {aveCount}/10</p>
      </div>

      {!started && (
        <div className="card mb-4">
          <p className="mb-3">Toca una opción para preparar audio y micrófono, y comenzar en modo manos libres:</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={startSessionFull}>
              Rezar el rosario completo
            </button>
            <button className="btn" onClick={startSessionSingle}>
              Rezar una decena
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">* En móviles, el audio sólo se habilita tras un toque del usuario.</p>
        </div>
      )}

      {started && (
        <div className="card mb-4">
          {phase === 'INTRO' && <p>Preparando audio y micrófono…</p>}
          {phase === 'ANNOUNCE' && <p>Anunciando el misterio…</p>}
          {phase === 'RUNNING' && <p><b>Modo manos libres activo:</b> la app escucha tu mitad y responde automáticamente.</p>}
          {phase === 'DONE' && <p><b>¡Sesión finalizada!</b> Gracias por rezar.</p>}
        </div>
      )}

      {started && (
        <div className="flex gap-3">
          <button
            className="btn btn-secondary"
            onClick={() => { try { recognition.stop() } catch {} }}
          >
            Detener escucha
          </button>
        </div>
      )}
    </main>
  )
}
