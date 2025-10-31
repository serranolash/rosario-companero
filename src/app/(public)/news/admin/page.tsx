'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type NewsItem = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  author?: string;
};

const TOKEN_KEY = 'news_admin_token';

export default function NewsAdminPage() {
  const [token, setToken] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('Admin');
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/news', { cache: 'no-store' });
      const json = await res.json();
      setItems(Array.isArray(json) ? json : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function persistToken(t: string) {
    setToken(t);
    localStorage.setItem(TOKEN_KEY, t);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      alert('Falta token de admin.');
      return;
    }
    if (!title.trim() || !body.trim()) {
      alert('Título y contenido son requeridos.');
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('body', body);
      fd.append('author', author || 'Admin');
      if (image) fd.append('image', image, image.name);
      if (video) fd.append('video', video, video.name);

      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Error publicando');
      }

      setTitle('');
      setBody('');
      setAuthor('Admin');
      setImage(null);
      setVideo(null);
      await load();
      alert('Noticia publicada.');
    } catch (err: any) {
      alert(err.message || 'Error publicando');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!token) { alert('Falta token.'); return; }
    if (!confirm('¿Eliminar esta noticia?')) return;

    try {
      const res = await fetch(`/api/news?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Error eliminando');
      }
      await load();
    } catch (err: any) {
      alert(err.message || 'Error eliminando');
    }
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/news" className="underline text-sm">← Volver a Noticias</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Panel de Noticias (Admin)</h1>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <label className="text-sm">Token admin</label>
          <input
            type="password"
            value={token}
            onChange={(e) => persistToken(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-80"
            placeholder="Ingresa el token"
          />
          <p className="muted text-xs">Configura NEWS_ADMIN_TOKEN en Vercel.</p>
        </div>
      </div>

      <form onSubmit={submit} className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">Nueva noticia</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded w-full px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Autor (opcional)</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="border rounded w-full px-3 py-2"
              placeholder="Admin"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Contenido</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="border rounded w-full px-3 py-2 min-h-[120px]"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Imagen (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Video (opcional)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="mt-4">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {loading && <div className="card">Cargando…</div>}
        {!loading && items.length === 0 && <div className="card">Sin noticias publicadas.</div>}
        {items.map((n) => (
          <div key={n.id} className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{n.title}</h3>
              <button className="btn" onClick={() => remove(n.id)}>Eliminar</button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {new Date(n.createdAt).toLocaleString()} {n.author ? `· ${n.author}` : ''}
            </p>

            {n.imageUrl && (
              <div className="rounded overflow-hidden border mb-2">
                <img src={n.imageUrl} alt={n.title} className="w-full h-auto" />
              </div>
            )}

            {n.videoUrl && (
              <div className="rounded overflow-hidden border mb-2">
                <video src={n.videoUrl} controls className="w-full h-auto" />
              </div>
            )}

            <p className="whitespace-pre-wrap">{n.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
