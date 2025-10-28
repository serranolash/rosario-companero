// src/lib/recognition.ts
export type Recognizer = {
  start: () => void
  stop: () => void
  isSupported: boolean
}

type OnHeard = (text: string) => void

const KEYWORDS = {
  // detecta que el usuario dijo su mitad (gatilla respuesta de la app)
  aveMaria: [/dios te salve/i, /llena eres de gracia/i, /bendita tú eres/i],
  padreNuestro: [/padre nuestro/i, /santificado sea tu nombre/i, /danos hoy/i],
  gloria: [/gloria al padre/i, /como era en el principio/i],
}

export function createRecognizer(onHeard: OnHeard): Recognizer {
  const SR: any = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition
  if (!SR) return { start(){}, stop(){}, isSupported: false }

  const r = new SR()
  r.lang = 'es-ES'
  r.continuous = true
  r.interimResults = false

  r.onresult = (e: any) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript?.trim() || ''
      if (!t) continue
      onHeard(t)
    }
  }

  r.onerror = () => {/* silencio: seguimos con fallback botón */}
  r.onend = () => { try { r.start() } catch {} } // auto-restart suave

  return {
    start: () => { try { r.start() } catch {} },
    stop: () => { try { r.stop() } catch {} },
    isSupported: true
  }
}

export function classifyPrayer(text: string): 'AM'|'PN'|'GLORIA'|null {
  const t = text.toLowerCase()
  if (KEYWORDS.aveMaria.some(rx => rx.test(t))) return 'AM'
  if (KEYWORDS.padreNuestro.some(rx => rx.test(t))) return 'PN'
  if (KEYWORDS.gloria.some(rx => rx.test(t))) return 'GLORIA'
  return null
}
