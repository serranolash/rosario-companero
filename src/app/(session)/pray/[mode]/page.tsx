'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { audio } from '@/lib/audio'
import { recognition } from '@/lib/recognition'
import prayers from '@/data/prayers.es.json'
import mysteriesData from '@/data/mysteries.es.json'

type Phase = 'IDLE' | 'INTRO' | 'ANNOUNCE' | 'RUNNING' | 'DONE'
type UICue = { title?: string; subtitle?: string } | null

const MAX_DECADES = 5
const autoHandsFree = true

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

function normalizeMysteries(raw: MysteryGroup[]): (MysteryGroup & { decades: Decade[] })[] {
  return raw.map((m) => ({
    ...m,
    decades: m.decades?.length ? m.decades : (FALLBACK_DECADES[m.title] || []).map(t => ({ title: t })),
  })) as any
}
function todayMysteryGroup() {
  const d = new Date().getDay() // 0 dom
  if (d === 1 || d === 6) return 'Gozosos'
  if (d === 2 || d === 5) return 'Dolorosos'
  if (d === 3 || d === 0) return 'Gloriosos'
  return 'Luminosos'
}
function ordinal(n: number) {
  return ['Primer','Segundo','Tercer','Cuarto','Quinto'][n-1] || `${n}º`
}

// Espera la parte del feligrés, con fallback para que NUNCA se trabe
async function waitUserOrTimeout(kind: 'pn'|'ave'|'gloria', timeoutMs = 17000) {
  if (!autoHandsFree) return
  try { recognition.stop() } catch {}
  await new Promise(r => setTimeout(r, 250)) // pequeña pausa natural

  await Promise.race([
    recognition.listen({
      lang: 'es-AR',
      minDurationMs: 2800,
      endSilenceMs: 1500,
      minChars: kind === 'ave' ? 18 : 22,
      maxTotalMs: timeoutMs,
      silenceChecks: 2,
    }),
    new Promise<void>(res => setTimeout(res, timeoutMs + 500)), // fallback duro
  ])
}

export default function PrayPage() {
  const [phase, setPhase] = useState<Phase>('IDLE')
  const [decadeIdx, setDecadeIdx] = useState(0)
  const [aveCount, setAveCount] = useState(0)
  const [showLine, setShowLine] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [uiCue, setUiCue] = useState<UICue>(null)

  const groupTitle = useMemo(() => todayMysteryGroup(), [])
  const mysteries = useMemo(() => normalizeMysteries(mysteriesData as any), [])
  const mystery = useMemo(
    () => (mysteries as any).find((m: any) => m.title === groupTitle) || (mysteries as any)[0],
    [mysteries, groupTitle],
  )
  const decade = useMemo(() => mystery?.decades?.[decadeIdx], [mystery, decadeIdx])

  useEffect(() => {
    audio.init?.()
    audio.setOnLine((l) => setShowLine(l))
    return () => { try { recognition.stop() } catch {} }
  }, [])

  async function runIntroBlock() {
    setUiCue({ title: 'Inicio', subtitle: 'Recemos juntos' })
    try {
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
    } catch {}
    setUiCue(null)
  }

  async function runOneDecade() {
    const title = mystery?.title || ''
    const dTitle = decade?.title || ''
    setPhase('ANNOUNCE')
    try { await audio.sayChunks(`${ordinal(decadeIdx + 1)} misterio ${title}: ${dTitle}.`) } catch {}

    // A partir de acá, ya ejecutando pasos del misterio
    setPhase('RUNNING')

    // Padre Nuestro
    setUiCue({ title: 'Padre Nuestro', subtitle: 'Tu parte primero…' })
    await waitUserOrTimeout('pn')
    await audio.sayChunks((prayers as any).padre_nuestro?.parte2 ?? 'Amén.')

    // 10 Ave Marías
    for (let i = 0; i < 10; i++) {
      setAveCount(i)
      setUiCue({ title: `Ave María (${i+1}/10)`, subtitle: 'Tu parte primero…' })
      await waitUserOrTimeout('ave')
      await audio.sayChunks((prayers as any).ave_maria?.parte2 ?? 'Santa María, Madre de Dios…')
      setAveCount(i + 1)
    }

    // Gloria
    setUiCue({ title: 'Gloria', subtitle: 'Tu parte…' })
    await waitUserOrTimeout('gloria')
    await audio.sayChunks((prayers as any).gloria?.parte2 ?? 'Como era en el principio…')

    // Opcionales
    const madre = (prayers as any)['maria_madre_de_gracia']
    const oh = (prayers as any)['oh_jesus_mio']
    if (madre) await audio.sayChunks(madre)
    if (oh) await audio.sayChunks(oh)

    setUiCue(null)

    const next = decadeIdx + 1
    if (next < MAX_DECADES) {
      setDecadeIdx(next)
      setAveCount(0)
    }
  }

  async function runAllDecades() {
    // Por claridad, aseguramos fase:
    setPhase('RUNNING')
    for (let d = decadeIdx; d < MAX_DECADES; d++) {
      await runOneDecade()
    }
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
    } catch { setPhase('DONE') }
  }

  async function startSessionSingle() {
    if (started) return
    setStarted(true)
    setPhase('INTRO')
    try {
      await audio.init()
      await recognition.prepare()
      await runIntroBlock()
      await runOneDecade()
      setPhase('DONE')
    } catch { setPhase('DONE') }
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm underline">← Volver</Link>
          <h1 className="text-2xl md:text-3xl font-extrabold">Rezo del Rosario</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/lecturas" className="btn btn-secondary">Lecturas del día</Link>
          <Link href="/noticias" className="btn btn-secondary">Noticias</Link>
          <a className="btn btn-primary" href="https://youtube.com/channel/UCCB6TeHkWMk9pNTvAvMGZpw" target="_blank" rel="noreferrer">
            Canal de YouTube
          </a>
        </div>
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
        <p className="mb-2"><b>Misterio del día:</b> {mystery?.title}</p>
        <p className="mb-2"><b>Decena:</b> {Math.min(decadeIdx + 1, MAX_DECADES)} / {MAX_DECADES}</p>
        {decade && (
          <>
            <p><b>Título:</b> {decade.title}</p>
            {decade.desc && <p className="muted mt-1">{decade.desc}</p>}
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
          <button className="btn btn-secondary" onClick={() => { try { recognition.stop() } catch {} }}>
            Detener escucha
          </button>
        </div>
      )}
    </main>
  )
}
