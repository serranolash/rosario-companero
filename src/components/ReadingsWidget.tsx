'use client'
import { useEffect, useState } from 'react'

type UData = {
  G?: { text?: string }   // Evangelio
  R1?: { text?: string }  // Primera lectura
  R2?: { text?: string }  // Segunda lectura
  H?: { text?: string }   // Homilía (a veces)
  copyright?: string
}

// 👉 Declaración global para evitar el error TS2339
declare global {
  interface Window {
    universalisCallback?: (payload: UData) => void
  }
}

export default function ReadingsWidget() {
  const [data, setData] = useState<UData | null>(null)

  useEffect(() => {
    // La función JSONP que llamará el script remoto
    window.universalisCallback = (payload: UData) => setData(payload)

    const s = document.createElement('script')
    s.src = 'https://universalis.com/jsonpmass.js?callback=universalisCallback'
    document.body.appendChild(s)

    return () => {
      try { document.body.removeChild(s) } catch {}
      delete window.universalisCallback
    }
  }, [])

  if (!data) {
    return <div className="card">Cargando lecturas…</div>
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold mb-2">Evangelio</h3>
        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: data.G?.text || '—' }} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h4 className="font-semibold mb-2">Primera lectura</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: data.R1?.text || '—' }} />
        </div>
        <div className="card">
          <h4 className="font-semibold mb-2">Segunda lectura</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: data.R2?.text || '—' }} />
        </div>
      </div>

      {data.H?.text && (
        <div className="card">
          <h4 className="font-semibold mb-2">Homilía</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: data.H?.text || '' }} />
        </div>
      )}

      <p className="text-xs opacity-70">
        Fuente: <a className="underline" href="https://universalis.com/" target="_blank" rel="noreferrer">Universalis</a>.
      </p>
    </div>
  )
}
