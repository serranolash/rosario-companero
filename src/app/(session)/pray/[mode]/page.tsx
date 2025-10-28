'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import prayers from '@/data/prayers.es.json'
import mysteriesSets from '@/data/mysteries.es.json'
import { audio } from '@/lib/audio'
import { createRecognizer, classifyPrayer } from '@/lib/recognition'

type StepKind =
  | 'PROLOGO' | 'ANUNCIO' | 'PN' | 'AVE' | 'GLORIA_BLOQUE'
  | 'SIGUIENTE_MISTERIO' | 'LETANIAS' | 'ORACION_FINAL' | 'INTENCIONES' | 'SALVE' | 'FIN'

type Step = { kind: StepKind; label: string; meta?: any }

function getToday(): string {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const d = new Date()
  return dias[d.getDay()]
}
function getTodaySet() {
  const today = getToday()
  return (mysteriesSets as any[]).find(s => s.days.includes(today)) || mysteriesSets[0]
}

export default function PrayPage() {
  const router = useRouter()
  const { mode } = useParams<{mode: string}>() // 'rosario' | 'decena'
  const [autoResponder, setAutoResponder] = useState(true)

  // --- VOZ: escucha al feligrés y responde sólo la "segunda mitad"
  const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null)
  useEffect(() => {
    audio.init()
    if (!autoResponder) { recRef.current?.stop(); return }
    const rec = createRecognizer((text) => {
      const which = classifyPrayer(text)
      if (which === 'AM') audio.sayOrPlay(prayers.ave_maria.parte2, '/audio/ave-maria/parte2.mp3')
      if (which === 'PN') audio.sayOrPlay(prayers.padre_nuestro.parte2, '/audio/padre-nuestro/parte2.mp3')
      if (which === 'GLORIA') audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3')
    })
    recRef.current = rec
    if (rec.isSupported) rec.start()
    return () => rec.stop()
  }, [autoResponder])

  // --- FLUJO CORRECTO DEL ROSARIO ---
  const flow = useMemo<Step[]>(() => {
    const set = getTodaySet()
    const totalDecades = mode === 'decena' ? 1 : 5
    const steps: Step[] = []

    // PROEMIO (sin 3 Ave iniciales)
    steps.push({ kind:'PROLOGO', label:'Inicio del Rosario' })

    for (let i=0; i<totalDecades; i++) {
      const decTitle = set.decades[i]?.title || `Misterio ${i+1}`
      steps.push({ kind:'ANUNCIO', label:`${i+1}º Misterio • ${set.title}`, meta:{decTitle} })
      steps.push({ kind:'PN', label:'Padre Nuestro' })
      // 10 Ave Marías (usuario dice parte1; app responde parte2)
      steps.push({ kind:'AVE', label:'Ave María (1-10)' })
      // Gloria + María Madre de gracia + Oh Jesús mío
      steps.push({ kind:'GLORIA_BLOQUE', label:'Gloria y oraciones' })
      if (i < totalDecades-1) steps.push({ kind:'SIGUIENTE_MISTERIO', label:'Siguiente misterio' })
    }

    if (mode !== 'decena') {
      steps.push({ kind:'LETANIAS', label:'Letanías de la Santísima Virgen' })
      steps.push({ kind:'ORACION_FINAL', label:'Oración final' })
      steps.push({ kind:'INTENCIONES', label:'Por las intenciones del Santo Padre' })
      steps.push({ kind:'SALVE', label:'Salve' })
    }

    steps.push({ kind:'FIN', label:'Rosario completado' })
    return steps
  }, [mode])

  const [idx, setIdx] = useState(0)
  const step = flow[idx]
  const [aveCount, setAveCount] = useState(0)

  // Helpers de avance
  const next = () => setIdx(i => Math.min(i+1, flow.length-1))
  const back = () => setIdx(i => Math.max(i-1, 0))

  // Acciones por paso
  async function handleAction() {
    switch (step.kind) {
      case 'PROLOGO':
        await audio.sayOrPlay(prayers.por_la_senal, '/audio/extras/por-la-senal.mp3')
        await audio.sayOrPlay(prayers.acto_contricion, '/audio/extras/acto-contricion.mp3')
        await audio.sayOrPlay(prayers.abre_labios.peticion, '/audio/extras/abre-labios-p.mp3')
        await audio.sayOrPlay(prayers.abre_labios.respuesta, '/audio/extras/abre-labios-r.mp3')
        await audio.sayOrPlay(prayers.ven_auxilio.peticion, '/audio/extras/ven-auxilio-p.mp3')
        await audio.sayOrPlay(prayers.ven_auxilio.respuesta, '/audio/extras/ven-auxilio-r.mp3')
        await audio.sayOrPlay(prayers.gloria_breve, '/audio/extras/gloria-breve.mp3')
        next()
        break

      case 'ANUNCIO':
        await audio.sayOrPlay(`Anunciamos el ${step.meta.decTitle}`, '/audio/extras/anuncio.mp3')
        next()
        break

      case 'PN':
        // El feligrés reza su parte (o pulsa botón). La app responde la segunda mitad:
        await audio.sayOrPlay(prayers.padre_nuestro.parte2, '/audio/padre-nuestro/parte2.mp3')
        setAveCount(0)
        next()
        break

      case 'AVE':
        // Cada pulsación responde la mitad de la AVE y avanza el contador.
        if (aveCount < 10) {
          await audio.sayOrPlay(prayers.ave_maria.parte2, '/audio/ave-maria/parte2.mp3')
          const n = aveCount + 1
          setAveCount(n)
          if (n === 10) next()
        }
        break

      case 'GLORIA_BLOQUE':
        await audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3')
        await audio.sayOrPlay(prayers.maria_madre_gracia, '/audio/extras/maria-madre-gracia.mp3')
        await audio.sayOrPlay(prayers.oh_jesus_mio, '/audio/extras/oh-jesus-mio.mp3')
        next()
        break

      case 'SIGUIENTE_MISTERIO':
        setAveCount(0)
        next()
        break

      case 'LETANIAS':
        // Mostramos el texto en pantalla (scroll) y damos un TTS de inicio
        await audio.sayOrPlay('Letanías de la Santísima Virgen', '/audio/extras/letanias.mp3')
        next()
        break

      case 'ORACION_FINAL':
        await audio.sayOrPlay(prayers.oracion_final, '/audio/extras/oracion-final.mp3')
        next()
        break

      case 'INTENCIONES':
        // PN, AVE y Gloria por las intenciones del Santo Padre (responde las segundas partes)
        await audio.sayOrPlay(prayers.padre_nuestro.parte2, '/audio/padre-nuestro/parte2.mp3')
        await audio.sayOrPlay(prayers.ave_maria.parte2, '/audio/ave-maria/parte2.mp3')
        await audio.sayOrPlay(prayers.gloria.parte2, '/audio/gloria/parte2.mp3')
        next()
        break

      case 'SALVE':
        await audio.sayOrPlay(prayers.salve, '/audio/extras/salve.mp3')
        next()
        break

      case 'FIN':
        break
    }
  }

  // UI
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="btn btn-secondary">← Volver</button>
        <div className="flex items-center gap-2">
          <label className="text-sm">Auto-respuesta</label>
          <input type="checkbox" checked={autoResponder} onChange={e=>setAutoResponder(e.target.checked)} />
        </div>
      </div>

      <h1 className="text-2xl font-bold">Rosario Compañero</h1>

      <div className="card space-y-2">
        <div className="text-sm opacity-80">Paso {idx+1} / {flow.length}</div>
        <h2 className="text-lg font-semibold">{step.label}</h2>

        {step.kind === 'ANUNCIO' && (
          <p className="opacity-80">{step.meta?.decTitle}</p>
        )}

        {step.kind === 'AVE' && (
          <div className="opacity-80">Ave María {aveCount} / 10 (di tu mitad y la app responde; o pulsa el botón)</div>
        )}

        {step.kind === 'LETANIAS' && (
          <details className="mt-2">
            <summary className="cursor-pointer">Ver texto de las Letanías</summary>
            <div className="prose prose-invert max-w-none text-sm mt-2">
              <p><strong>Señor, ten piedad…</strong> (estructura como en tu texto; puedes pegar aquí el listado completo).</p>
            </div>
          </details>
        )}

        {step.kind === 'FIN' ? (
          <div className="pt-2">
            <p className="mb-3">🙏 Rosario completado. Que la Virgen María te acompañe siempre.</p>
            <button className="btn btn-primary" onClick={()=>router.push('/')}>Volver al inicio</button>
          </div>
        ) : (
          <div className="pt-2 flex gap-2">
            <button className="btn btn-primary" onClick={handleAction}>
              {step.kind === 'AVE' ? 'Responder AVE' : 'Continuar'}
            </button>
            <button className="btn" onClick={next}>Saltar</button>
            <button className="btn" onClick={back}>Atrás</button>
          </div>
        )}
      </div>
    </div>
  )
}
