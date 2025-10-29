'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type NewsItem = {
  id: string
  title: string
  body: string
  image?: string // base64
  createdAt: number
}

const KEY = 'rc_news_items_v1'

export default function NoticiasPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<string | undefined>(undefined)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])

  function persist(next: NewsItem[]) {
    setItems(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }

  function resetForm() {
    setTitle(''); setBody(''); setImage(undefined); setEditingId(null)
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    const base64 = `data:${file.type};base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`
    setImage(base64)
  }

  function onSave() {
    if (!title.trim() || !body.trim()) return
    if (editingId) {
      const next = items.map(it => it.id === editingId ? { ...it, title, body, image } : it)
      persist(next); resetForm()
    } else {
      const it: NewsItem = {
        id: crypto.randomUUID(),
        title: title.trim(),
        body: body.trim(),
        image,
        createdAt: Date.now(),
      }
      persist([it, ...items]); resetForm()
    }
  }

  function onEdit(id: string) {
    const it = items.find(i => i.id === id)
    if (!it) return
    setEditingId(id)
    setTitle(it.title)
    setBody(it.body)
    setImage(it.image)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onDelete(id: string) {
    if (!confirm('¿Eliminar esta noticia?')) return
    persist(items.filter(i => i.id !== id))
    if (editingId === id) resetForm()
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-sm underline">← Volver</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Noticias parroquiales</h1>
      </div>

      {/* Formulario */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">{editingId ? 'Editar noticia' : 'Agregar noticia'}</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Título</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej.: Horarios de misa"
            />

            <label className="block text-sm mt-4 mb-1">Contenido</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Texto de la noticia…"
            />

            <div className="mt-4 flex items-center gap-3">
              <label className="btn btn-secondary cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onPickImage}/>
                Subir imagen
              </label>
              <button className="btn" onClick={() => setImage(undefined)}>Quitar imagen</button>
            </div>
          </div>

          <div>
            <p className="text-sm muted mb-2">Vista previa</p>
            <div className="border rounded-xl p-3">
              {image ? (
                <img src={image} alt="preview" className="w-full h-48 object-cover rounded-lg mb-3"/>
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-sm text-gray-400">
                  Sin imagen
                </div>
              )}
              <h3 className="font-semibold">{title || 'Título de la noticia'}</h3>
              <p className="text-sm mt-1 whitespace-pre-line">{body || 'Contenido…'}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button className="btn btn-primary" onClick={onSave}>
            {editingId ? 'Guardar cambios' : 'Publicar noticia'}
          </button>
          {editingId && (
            <button className="btn btn-secondary" onClick={resetForm}>Cancelar edición</button>
          )}
        </div>
      </div>

      {/* Listado */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="card">No hay noticias aún. Agregá la primera ✨</div>
        )}
        {items.map(it => (
          <article key={it.id} className="card">
            {it.image && (
              <img src={it.image} alt={it.title} className="w-full h-40 object-cover rounded-lg mb-3"/>
            )}
            <h3 className="text-lg font-semibold">{it.title}</h3>
            <p className="mt-1 whitespace-pre-line">{it.body}</p>
            <div className="mt-3 flex gap-2">
              <button className="btn btn-secondary" onClick={() => onEdit(it.id)}>Editar</button>
              <button className="btn" onClick={() => onDelete(it.id)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
