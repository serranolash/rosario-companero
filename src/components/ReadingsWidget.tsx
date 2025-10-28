'use client'
import { useEffect, useState } from 'react'

export default function ReadingsWidget() {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/lecturas', { cache: 'no-store' })
        const j = await r.json()
        if (!alive) return
        if (j.ok && j.html) setHtml(j.html)
        else setError('No se pudieron cargar las lecturas.')
      } catch (e: any) {
        if (!alive) return
        setError(e.message || 'Error de red.')
      }
    })()
    return () => { alive = false }
  }, [])

  if (error) {
    return (
      <div className="card">
        <p className="mb-2">No se pudieron cargar las lecturas automáticamente.</p>
        <iframe
          title="Lecturas del día"
          src="https://universalis.com/es/mass.htm"
          className="w-full h-[70vh] rounded-lg border"
        />
      </div>
    )
  }

  if (!html) return <div className="card">Cargando lecturas…</div>

  return (
    <div className="card prose prose-invert max-w-none">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
