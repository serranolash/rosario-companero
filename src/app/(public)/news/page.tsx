// src/app/(public)/news/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic' as const

type NewsItem = {
  id: string
  title: string
  body: string
  image?: string
  createdAt: string
  author?: string
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/news', {
      cache: 'no-store',
      headers: { 'x-no-cache': Date.now().toString() }, // rompe caches
    })
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="underline text-sm">← Volver</Link>
        <Link href="/news/admin" className="btn btn-secondary text-sm">Panel Admin</Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-2">Noticias</h1>
      <p className="muted text-center mb-6">Comunicados y novedades de la parroquia.</p>

      {loading && <div className="card">Cargando…</div>}

      {!loading && items.length === 0 && (
        <div className="card">Aún no hay noticias.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((n) => (
          <article key={n.id} className="card">
            {n.image && (
              <div className="mb-3">
                {/* no Next/Image para evitar dominios externos; simple img */}
                <img
                  src={n.image}
                  alt={n.title}
                  className="w-full h-48 object-cover rounded-lg border"
                />
              </div>
            )}
            <h2 className="text-xl font-semibold">{n.title}</h2>
            <p className="muted text-sm mb-2">
              {new Date(n.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
              {n.author ? ` · ${n.author}` : ''}
            </p>
            <p className="leading-relaxed whitespace-pre-wrap">{n.body}</p>
          </article>
        ))}
      </div>
    </main>
  )
}
