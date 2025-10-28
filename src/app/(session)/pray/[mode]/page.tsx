'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { audio } from '@/lib/audio'
import prayers from '@/data/prayers.es.json'
import { createRecognizer, classifyPrayer } from '@/lib/recognition'

type Mode = 'rosario' | 'decena'

export default function PrayPage() {
  const { mode } = useParams<{ mode: Mode }>()
  const router = useRouter()

  // 1..5 (si viene /pray/decena, solo 1 decena)
  const [decade, setDecade] = useState<number>(1)
  // 0..10 Ave Marías dentro de la decena actual
  const [amCount, setAmCount] = useState<number>(0)
  // ¿ya respondimos PN (parte2) en esta decena?
  const [pnDone, setPnDone] = useState<boolean>(false)
  // Intro (3 Ave Marías iniciales) control
  const [introDone, setIntroDone] = useState<boolean>(false)
  // Auto respuesta por voz
  const [autoResponder, setAutoResponder] = useState<boolean>(true)
  // Fin del Rosario
  const [finished, setFinished] = useState<boolean>(false)

  const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null)

  // Alternancia visual “Tú / Rosario Compañero”: arranca el usuario en decenas impares
  const leaderIsUser = useMemo(() => decade % 2 === 1, [decade])
  // Indicador en UI de quién “habla ahora”: si falta PN o AM (parte1), le toca al usuario
  const speakerLabel = useMemo(() => {
    if (!introDone) return 'Tú'
    if (!pnDone) return leaderIsUser ? 'Tú' : 'Rosario Compañero'
    if (amCount < 10) return leaderIsUser ? 'Tú' : 'Rosario Compañero'
    // Tras AM completas, tocan Gloria y Oh Jesús (la app responde parte2 de Gloria)
    return 'Rosario Compañero'
  }, [introDone, pnDone, amCount, leaderIsUser])

  // -------------------- INIT (Intro + desbloqueo audio) --------------------
  useEffect(() => {
    audio.init()
    // Intro: tres Ave Marías (si tu JSON tiene clave con tilde, usa bracket access)
    ;(async () => {
      try {
        const introList: string[] =
          (prayers as any)['intro_tres_avemarías'] ||
          (prayers as any)['intro_tres_avemarias'] ||
          [] // por si tu JSON usa otra clave; ajusta si fuera necesario

        if (introList.length) {
          for (const t of introList) {
            await audio.sayOrPlay(t, '/audio/extras/intro.mp3')
          }
        }
        // (Opcional) Señal de la cruz o Credo podrían ir aquí si los agregas al JSON

        // Comienzo de la primera decena: el PN lo lidera el usuario y la app responde parte2 cuando corresponda
        setIntroDone(true)
        setPnDone(false)
        setAmCount(0)
      } catch {
        setIntroDone(true)
      }
    })()
  }, [])

  // -------------------- AUTO VOICE RECOGNITION --------------------
  useEffect(() => {
    if (!autoResponder) {
      recRef.current?.stop()
      return
    }
    const rec = createRecognizer((text: string) => {
      const which = classifyPrayer(text)
      if (which === 'AM') audio.sayOrPlay((prayers as any).ave_maria.parte2, '/audio/ave-maria/parte2.mp3')
      if (which === 'PN') {
        // solo responde PN parte2 si aún no fue respondido manualmente
        if (!pnDone) {
          audio.sayOrPlay((prayers as any).padre_nuestro.parte2, '/audio/padre-nuestro/parte2.mp3')
          setPnDone(true)
        }
      }
      if (which === 'GLORIA') audio.sayOrPlay((prayers as any).gloria.parte2, '/audio/gloria/parte2.mp3')
    })
    recRef.current = rec
    if (rec.isSupported) rec.start()
    return () => rec.stop()
  }, [autoResponder, pnDone])

  // -------------------- helpers de secuencia --------------------
  const doGloriaYOhJesus = async () => {
    await audio.sayOrPlay((prayers as any).gloria.parte2, '/audio/gloria/parte2.mp3')
    // “Oh Jesús mío”
    const ohJesus = (prayers as any).oh_jesus_mio || (prayers as any).post_gloria?.oh_jesus_mio
    if (ohJesus) await audio.sayOrPlay(ohJesus, '/audio/extras/oh-jesus-mio.mp3')
  }

  const finishRosary = async () => {
    const bendita = (prayers as any).bendita_pureza || (prayers as any).finales?.bendita_pureza
    const salve   = (prayers as any).salve || (prayers as any).finales?.salve
    if (bendita) await audio.sayOrPlay(bendita, '/audio/extras/bendita-pureza.mp3')
    if (salve)   await audio.sayOrPlay(salve,   '/audio/extras/salve.mp3')
    setFinished(true)
  }

  const nextDecade = async () => {
    // Si el modo es “decena”, termina aquí con oraciones finales
    if (mode === 'decena' || decade >= 5) {
      await finishRosary()
      return
    }
    setDecade(d => d + 1)
    setPnDone(false)
    setAmCount(0)
    // Indicador auditivo opcional
    await audio.sayOrPlay(`Misterio número ${decade + 1}`, '/audio/extras/next.mp3')
  }

  // -------------------- Fallback manual (botón) --------------------
  const onTap = async () => {
    if (!introDone) return
    // 1) PN parte2 si todavía no fue respondido por la app (auto o manual)
    if (!pnDone) {
      await audio.sayOrPlay((prayers as any).padre_nuestro.parte2, '/audio/padre-nuestro/parte2.mp3')
      setPnDone(true)
      return
    }
    // 2) Ave Marías (la app responde parte2; el usuario dice parte1)
    if (amCount < 10) {
      await audio.sayOrPlay((prayers as any).ave_maria.parte2, '/audio/ave-maria/parte2.mp3')
      setAmCount(c => c + 1)
      return
    }
    // 3) Fin de la decena → Gloria + Oh Jesús mío, y pasar a la próxima
    await doGloriaYOhJesus()
    await nextDecade()
  }

  // -------------------- UI --------------------
  if (finished) {
    return (
      <div className="p-6 text-center space-y-6">
        <h1 className="text-2xl font-bold text-green-600">🙏 Rosario Completado 🙏</h1>
        <p>Que la Virgen María te acompañe siempre.</p>
        <button onClick={() => router.push('/')} className="btn btn-primary">Volver al inicio</button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Barra superior */}
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="btn btn-secondary">← Volver</button>
        <div className="flex items-center gap-2">
          <label className="text-sm">Auto-respuesta</label>
          <input
            type="checkbox"
            checked={autoResponder}
            onChange={e => setAutoResponder(e.target.checked)}
          />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-blue-800">Rosario Compañero</h1>
        <p className="text-gray-600">
          {mode === 'decena' ? 'Decena única' : `Misterio ${decade} de 5`} • Ave María {amCount}/10
        </p>
        <p className="text-sm text-gray-500">
          Habla ahora: <b>{speakerLabel}</b>
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onTap}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-semibold"
        >
          Rezar / Responder
        </button>
      </div>

      <p className="text-center text-sm text-gray-500">
        Decí tu parte en voz alta o pulsá el botón para continuar. Si el micrófono reconoce tu voz, la app responde sola.
      </p>
    </div>
  )
}
