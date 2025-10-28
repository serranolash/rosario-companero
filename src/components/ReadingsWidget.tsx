'use client'
import { useEffect, useState } from 'react'

type Reading = { key: 'FR'|'PS'|'SR'|'GSP', title: string, text: string }
type Data =
  | { ok: true, source: 'Evangelizo', date: string, titleLiturgic?: string, readings: Reading[], comment?: { title: string, text: string } }
  | { ok: true, fallback: { source: 'USCCB', note: string, url: string } }

export default function ReadingsWidget() {
  const [data, setData] = useState<Data|null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/lecturas', { cache: 'no-store' })
        const j = await r.json()
        if (!alive) return
        setData(j)
      } catch (e:any) {
        if (!alive) return
        setError(e.message || 'Error de red')
      }
    })()
    return () => { alive = false }
  }, [])

  if (error) return <div className="card">No se pudieron cargar las lecturas: {error}</div>
  if (!data) return <div className="card">Cargando lecturas…</div>

  // Fallback USCCB
  if ('fallback' in data) {
    return (
      <div className="card space-y-3">
        <h3 className="text-xl font-semibold">Lecturas del día (USCCB)</h3>
        <p className="opacity-80 text-sm">{data.fallback.note}</p>
        <a href={data.fallback.url} target="_blank" rel="noopener noreferrer" className="btn">
          Abrir lecturas en español (USCCB)
        </a>
      </div>
    )
  }

  // Evangelizo
  const R = data.readings
  const badge = data.titleLiturgic ? (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-700/30">
      {data.titleLiturgic}
    </div>
  ) : null

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Lecturas del día</h3>
          {badge}
        </div>
        <p className="text-xs opacity-70">Fuente: Evangelizo</p>
      </div>

      {R.map((r) => (
        <div key={r.key} className="card">
          <h4 className="text-lg font-semibold mb-2">{r.title}</h4>
          <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap leading-relaxed">
            {r.text}
          </div>
        </div>
      ))}

      {data.comment && (
        <div className="card">
          <h4 className="text-lg font-semibold mb-2">{data.comment.title}</h4>
          <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap leading-relaxed">
            {data.comment.text}
          </div>
        </div>
      )}
    </div>
  )
}
