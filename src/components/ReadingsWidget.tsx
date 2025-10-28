'use client'
import { useEffect, useState } from 'react'

type UData = { G?: { text?: string }, R1?: { text?: string }, R2?: { text?: string }, H?: { text?: string } }
declare global { interface Window { universalisCallback?: (p: UData)=>void } }

export default function ReadingsWidget(){
  const [data, setData] = useState<UData | null>(null)
  const [timeout, setTimeoutHit] = useState(false)

  useEffect(() => {
    window.universalisCallback = (p: UData) => setData(p)
    const s = document.createElement('script')
    // 👇 idioma español; JSONP oficial
    s.src = 'https://universalis.com/jsonpmass.js?lang=es&callback=universalisCallback'
    document.body.appendChild(s)
    const t = setTimeout(()=>setTimeoutHit(true), 6000)

    return () => { clearTimeout(t); try { document.body.removeChild(s) } catch{}; delete window.universalisCallback }
  }, [])

  if (!data && !timeout) return <div className="card">Cargando lecturas…</div>

  if (!data && timeout) {
    // Fallback visible (iframe) si JSONP no devuelve
    return (
      <div className="card">
        <p className="mb-2">No se pudieron cargar las lecturas automáticamente.</p>
        <iframe
          title="Lecturas del día"
          src="https://universalis.com/mass.htm?lang=es"
          className="w-full h-[70vh] rounded-lg border"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold mb-2">Evangelio</h3>
        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: data?.G?.text || '—'}} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h4 className="font-semibold mb-2">Primera lectura</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: data?.R1?.text || '—'}} />
        </div>
        <div className="card">
          <h4 className="font-semibold mb-2">Segunda lectura</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: data?.R2?.text || '—'}} />
        </div>
      </div>
      {data?.H?.text && (
        <div className="card">
          <h4 className="font-semibold mb-2">Homilía</h4>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: data?.H?.text || ''}} />
        </div>
      )}
      <p className="text-xs opacity-70">
        Fuente: <a className="underline" href="https://universalis.com/" target="_blank" rel="noreferrer">Universalis</a>.
      </p>
    </div>
  )
}
