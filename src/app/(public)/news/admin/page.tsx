// src/app/(public)/news/admin/page.tsx
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

export default function NewsAdminPage() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [ok, setOk] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState('')
  const [author, setAuthor] = useState('')
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  const U = process.env.NEXT_PUBLIC_NEWS_ADMIN_USER || ''
  const P = process.env.NEXT_PUBLIC_NEWS_ADMIN_PASS || ''

  useEffect(() => {
    // intentar autocompletar si el build “inyecta” valores (sólo a modo display; seguridad real está en el POST del API)
    // no pongas los valores reales por defecto — se ingresan a mano
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/news', {
      cache: 'no-store',
      headers: { 'x-no-cache': Date.now().toString() },
    })
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setOk(user === U && pass === P)
    if (user === U && pass === P) await load()
  }

  async function addNews(e: React.FormEvent) {
    e.preventDefault()
    if (!ok) return alert('No autenticado')

    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-user': user, 'x-admin-pass': pass },
      body: JSON.stringify({ title, body, image: image || undefined, author: author || undefined }),
    })
    if (!res.ok) {
      alert('Error al publicar')
      return
    }
    setTitle(''); setBody(''); setImage(''); setAuthor('')
    await load()
  }

  async function del(id: string) {
    if (!ok) return alert('No autenticado')
    if (!confirm('¿Eliminar esta noticia?')) return
    const res = await fetch('/api/news?id=' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'x-admin-user': user, 'x-admin-pass': pass },
    })
    if (!res.ok) return alert('Error al eliminar')
    await load()
  }

  if (!ok) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/news" className="underline text-sm">← Volver a Noticias</Link>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-4">Admin de Noticias</h1>
        <form onSubmit={onLogin} className="card max-w-md mx-auto">
          <label className="block mb-2 text-sm">Usuario</label>
          <input className="w-full border rounded-lg p-2 mb-3" value={user} onChange={e=>setUser(e.target.value)} required />
          <label className="block mb-2 text-sm">Clave</label>
          <input type="password" className="w-full border rounded-lg p-2 mb-4" value={pass} onChange={e=>setPass(e.target.value)} required />
          <button className="btn btn-primary w-full" type="submit">Entrar</button>
          <p className="muted text-xs mt-3">Usa las variables <b>NEXT_PUBLIC_NEWS_ADMIN_USER</b> y <b>NEXT_PUBLIC_NEWS_ADMIN_PASS</b> configuradas en Vercel.</p>
        </form>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/news" className="underline text-sm">← Volver a Noticias</Link>
        <button className="btn btn-secondary text-sm" onClick={()=>setOk(false)}>Salir</button>
      </div>

      <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-4">Publicar noticia</h1>

      <form onSubmit={addNews} className="card max-w-2xl mx-auto mb-6">
        <label className="block mb-1 text-sm">Título</label>
        <input className="w-full border rounded-lg p-2 mb-3" value={title} onChange={e=>setTitle(e.target.value)} required />

        <label className="block mb-1 text-sm">Cuerpo (se muestra tal cual, admite saltos de línea)</label>
        <textarea className="w-full border rounded-lg p-2 mb-3" rows={5} value={body} onChange={e=>setBody(e.target.value)} required />

        <label className="block mb-1 text-sm">Imagen (URL opcional: Drive público, Imgur, CDN, etc.)</label>
        <input className="w-full border rounded-lg p-2 mb-3" placeholder="https://..." value={image} onChange={e=>setImage(e.target.value)} />

        <label className="block mb-1 text-sm">Autor (opcional)</label>
        <input className="w-full border rounded-lg p-2 mb-4" value={author} onChange={e=>setAuthor(e.target.value)} />

        <button className="btn btn-primary">Publicar</button>
      </form>

      <h2 className="text-xl font-semibold mb-3">Publicadas</h2>
      {loading && <div className="card">Cargando…</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((n) => (
          <article key={n.id} className="card">
            {n.image && (
              <img src={n.image} alt={n.title} className="w-full h-40 object-cover rounded-lg border mb-2" />
            )}
            <h3 className="text-lg font-semibold">{n.title}</h3>
            <p className="muted text-sm mb-2">
              {new Date(n.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
              {n.author ? ` · ${n.author}` : ''}
            </p>
            <p className="leading-relaxed whitespace-pre-wrap mb-3">{n.body}</p>
            <button className="btn" onClick={() => del(n.id)}>Eliminar</button>
          </article>
        ))}
      </div>
    </main>
  )
}
