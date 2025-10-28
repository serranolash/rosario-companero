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
  | 'INTRO'
  | 'ANNOUNCE_1'
  | 'PN_USER'
  | 'AVE_USER'
  | 'GLORIA_BLOCK'
  | 'NEXT_DECADE'
  | 'DONE'

const MAX_DECADES = 5

/* =======================
   A) Normalización por title (con fallback)
   ======================= */
type Decade = { title: string; desc?: string; img?: string }
type MysteryGroup = { id: string; title: string; days: string[]; decades?: Decade[] }

// Títulos de respaldo si el JSON no trae "decades"
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

/* ===== Helper para determinar el grupo de hoy por título ===== */
function todayMysteryGroup() {
  const d = new Date().getDay() // 0=domingo
  // lun/sab Gozosos, mar/vie Dolorosos, mie/dom Gloriosos, jue Luminosos
  if (d === 1 || d === 6) return 'Gozosos'
  if (d === 2 || d === 5) return 'Dolorosos'
  if (d === 3 || d === 0) return 'Gloriosos'
  return 'Luminosos'
}

/* ======= Utilidades varias ======= */
function ordinal(n: number) {
  return ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'][n - 1] || `${n}º`
}

/* =======================
   Espera “humana” del turno del feligrés (usa tu RecognitionSvc.listen)
   ======================= */
async function waitUserPrayerTurn(
  kind: 'padre_nuestro' | 'ave_maria' | 'gloria',
) {
  // Pequeña gracia antes de activar micro
  await new Promise((r) => setTimeout(r, 300))

  try {
    const heard = await recognition.listen({
      lang: 'es-AR', // o 'es-ES'
      minDurationMs: 2500,
      endSilenceMs: 1200,
      minChars: 15,
      maxTotalMs: 20000,
    })
    // console.log(`[Reconocimiento ${kind}]:`, heard)
    return heard?.trim() ?? ''
  } catch {
    return ''
  }
}

/* =======================
   Componente principal
   ======================= */
export default function PrayPage() {
  const [phase, setPhase] = useState<Phase>('INTRO')
  const [decadeIdx, setDecadeIdx] = useState(0)
  const [aveCount, setAveCount] = useState(0)
  const [showLine, setShowLine] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // A) Computar por title (no por group)
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

  // Conecta audio con “línea” visible; NO usamos pause/resume del recognizer (no existen)
  useEffect(() => {
    audio.init()
    // hacemos que el audio pueda “limpiar/ocultar” la línea cuando termina
    audio.setOnLine((l) => setShowLine(l))
    runIntro()
    return () => {
      // por si queda algo escuchando, lo detenemos
      try {
        recognition.stop()
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* =======================
     Intro completa y pase a PN_USER
     ======================= */
  async function runIntro() {
    setBusy(true)
    setPhase('INTRO')
    try {
      await audio.sayOrPlay(
        prayers.por_la_senal,
        '/audio/intro/por-la-senal.mp3',
      )
      await audio.sayOrPlay(
        prayers.acto_contricion,
        '/audio/intro/acto-contricion.mp3',
      )
      await audio.sayOrPlay(
        prayers.abre_labios.peticion,
        '/audio/intro/abre-labios-p.mp3',
      )
      await audio.sayOrPlay(
        prayers.abre_labios.respuesta,
        '/audio/intro/abre-labios-r.mp3',
      )
      await audio.sayOrPlay(
        prayers.ven_auxilio.peticion,
        '/audio/intro/ven-auxilio-p.mp3',
      )
      await audio.sayOrPlay(
        prayers.ven_auxilio.respuesta,
        '/audio/intro/ven-auxilio-r.mp3',
      )
      await audio.sayOrPlay(prayers.gloria.parte1, '/audio/gloria/parte1.mp3')
      await audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3')
    } catch {
      /* ignorar */
    } finally {
      setBusy(false)
      // Anunciar misterio 1
      setPhase('ANNOUNCE_1')
      setTimeout(announceFirst, 100)
    }
  }

  async function announceFirst() {
    if (!mystery || !decade) {
      setPhase('PN_USER')
      return
    }
    setBusy(true)
    try {
      await audio.sayOrPlay(
        `Primer misterio ${mystery.title}: ${decade.title}.`,
        '/audio/misterios/announce-1.mp3',
      )
    } catch {}
    finally {
      setBusy(false)
      setPhase('PN_USER')
    }
  }

  /* =======================
     Turnos del feligrés → respuesta de la app
     ======================= */
  async function runPadreNuestroUserThenApp() {
    // Espera del usuario (no bloquea si no dice nada)
    await waitUserPrayerTurn('padre_nuestro')
    // Respuesta de la app
    await audio.sayOrPlay(
      prayers.padre_nuestro.parte2,
      '/audio/padre-nuestro/parte2.mp3',
    )
    setPhase('AVE_USER')
    setAveCount(0)
  }

  async function runAveMariaUserThenApp() {
    await waitUserPrayerTurn('ave_maria')
    await audio.sayOrPlay(
      prayers.ave_maria.parte2,
      '/audio/ave-maria/parte2.mp3',
    )
    const n = aveCount + 1
    setAveCount(n)
    if (n >= 10) {
      setPhase('GLORIA_BLOCK')
      runGloriaBlock()
    } else {
      setPhase('AVE_USER') // siguiente AVE
    }
  }

  /* =======================
     B) Bloque Gloria con claves seguras + fallback
     ======================= */
  async function runGloriaBlock() {
    setBusy(true)
    try {
      // (Si quisieras “esperar” el turno del usuario para el Gloria, descomenta)
      // await waitUserPrayerTurn('gloria')
      await audio.sayOrPlay(prayers.gloria.parte1, '/audio/gloria/parte1.mp3')
      await audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3')

      const madre =
        (prayers as any)['maria_madre_de_gracia'] ||
        'María, Madre de gracia, Madre de misericordia. Defiéndenos de nuestros enemigos y ampáranos ahora y en la hora de nuestra muerte. Amén.'

      const oh =
        (prayers as any)['oh_jesus_mio'] ||
        'Oh Jesús mío, perdónanos, líbranos del fuego del infierno y lleva a todas las almas al cielo, especialmente a las más necesitadas.'

      await audio.sayOrPlay(madre, '/audio/extras/maria-madre.mp3')
      await audio.sayOrPlay(oh, '/audio/extras/oh-jesus-mio.mp3')
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
      setPhase('NEXT_DECADE')
    }
  }

  /* =======================
     Control manual (botón “Continuar”)
     ======================= */
  const nextStep = async () => {
    if (busy) return

    if (phase === 'PN_USER') {
      await runPadreNuestroUserThenApp()
      return
    }

    if (phase === 'AVE_USER') {
      await runAveMariaUserThenApp()
      return
    }

    if (phase === 'GLORIA_BLOCK') {
      // Se maneja dentro de runGloriaBlock()
      return
    }

    if (phase === 'NEXT_DECADE') {
      // Avanzar decena
      const idx = decadeIdx + 1
      if (idx >= MAX_DECADES) {
        setPhase('DONE')
        return
      }
      setDecadeIdx(idx)
      setAveCount(0)
      setPhase('ANNOUNCE_1')

      // Anuncio del siguiente misterio
      try {
        await audio.sayOrPlay(
          `${ordinal(idx + 1)} misterio ${mystery.title}: ${mystery.decades[idx].title}.`,
          '/audio/misterios/announce-next.mp3',
        )
      } catch {}
      setPhase('PN_USER')
      return
    }
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

      {/* Línea visible cuando la app reza (intro o anuncios) */}
      {showLine && (
        <div className="card mb-4">
          <p className="text-lg leading-relaxed">{showLine}</p>
          <p className="text-sm muted">Recitemos juntos esta parte.</p>
        </div>
      )}

      {/* Estado actual */}
      <div className="card mb-4">
        <p className="mb-2">
          <b>Misterio del día:</b> {mystery?.title}
        </p>
        <p className="mb-2">
          <b>Decena:</b> {decadeIdx + 1} / 5
        </p>
        {decade && (
          <>
            <p>
              <b>Título:</b> {decade.title}
            </p>
            {decade.desc && <p className="muted mt-1">{decade.desc}</p>}
          </>
        )}
      </div>

      {/* Instrucciones por fase */}
      <div className="card mb-4">
        {phase === 'INTRO' && <p>Oraciones iniciales…</p>}
        {phase === 'ANNOUNCE_1' && <p>Anunciando primer misterio…</p>}
        {phase === 'PN_USER' && (
          <p>
            <b>Tu parte:</b> Padre Nuestro (tu mitad). Luego la app responde.
          </p>
        )}
        {phase === 'AVE_USER' && (
          <p>
            <b>Tu parte:</b> Ave María (tu mitad). La app responde “Santa
            María…” (Conteo: {aveCount}/10)
          </p>
        )}
        {phase === 'GLORIA_BLOCK' && (
          <p>Gloria… María Madre de gracia… Oh Jesús mío…</p>
        )}
        {phase === 'NEXT_DECADE' && <p>Podés avanzar al siguiente misterio.</p>}
        {phase === 'DONE' && <p><b>¡Rosario completo!</b></p>}
      </div>

      {/* Controles mínimos para no quedar bloqueado si el STT falla */}
      <div className="flex gap-3">
        <button
          className="btn btn-secondary"
          onClick={() => {
            try {
              recognition.stop()
            } catch {}
          }}
        >
          Detener escucha
        </button>
        <button className="btn btn-primary" onClick={nextStep} disabled={busy}>
          {busy ? 'Reproduciendo…' : 'Continuar'}
        </button>
      </div>
    </main>
  )
}
