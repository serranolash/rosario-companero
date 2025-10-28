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
    <div className="card">
      {/* Contenedor con reglas que doman tamaños y ocultan ruido */}
      <div className="lecturas-container prose max-w-none prose-invert">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {/* Estilos acotados al contenedor */}
      <style jsx global>{`
        .lecturas-container img,
        .lecturas-container svg,
        .lecturas-container iframe {
          max-width: 100% !important;
          height: auto !important;
        }
        .lecturas-container .icon,
        .lecturas-container .icons,
        .lecturas-container .social,
        .lecturas-container .share,
        .lecturas-container .banner,
        .lecturas-container .menu,
        .lecturas-container .navbar {
          display: none !important;
          visibility: hidden !important;
        }
        .lecturas-container a {
          text-decoration: underline;
        }
        /* Asegura tipografía legible si vienen estilos propios */
        .lecturas-container h1, .lecturas-container h2, .lecturas-container h3 {
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        .lecturas-container p { margin: 0.5rem 0; }
      `}</style>
    </div>
  )
}
