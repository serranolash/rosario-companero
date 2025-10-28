'use client'
import { useEffect, useState } from 'react'

type UData = { G?: { text?: string }, R1?: { text?: string }, R2?: { text?: string }, H?: { text?: string }, copyright?: string }

export default function ReadingsWidget(){
  const [data, setData] = useState<UData | null>(null)
  useEffect(() => {
    // JSONP callback global
    // @ts-ignore
    window.universalisCallback = (payload: UData) => setData(payload)

    const s = document.createElement('script')
    // Nota: Universalis JSONP devuelve "universalisCallback(...)"
    // y permite obtener las lecturas de hoy (y la próxima dominical).
    s.src = 'https://universalis.com/jsonpmass.js?callback=universalisCallback'
    document.body.appendChild(s)
    return () => { document.body.removeChild(s); /* @ts-ignore */ delete window.universalisCallback }
  }, [])

  if (!data) return <div className="card">Cargando lecturas…</div>

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold mb-2">Evangelio</h3>
        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: data.G?.text || '—'}} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h4 className="font-semibold mb-2">Primera lectura</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: data.R1?.text || '—'}} />
        </div>
        <div className="card">
          <h4 className="font-semibold mb-2">Segunda lectura</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: data.R2?.text || '—'}} />
        </div>
      </div>
      {data.H?.text && (
        <div className="card">
          <h4 className="font-semibold mb-2">Homilía</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: data.H?.text || ''}} />
        </div>
      )}
      <p className="text-xs opacity-70">
        Fuente: <a className="underline" href="https://universalis.com/" target="_blank" rel="noreferrer">Universalis</a>. El contenido y copyright corresponden a sus propietarios.
      </p>
    </div>
  )
}
