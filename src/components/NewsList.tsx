'use client';

import { useEffect, useState } from 'react';

type NewsItem = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: number;
};

export default function NewsList() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [busy, setBusy] = useState(false);
  const isAdmin = !!(typeof window !== 'undefined' && localStorage.getItem('newsAdminToken'));

  async function load() {
    const res = await fetch('/api/news', { cache: 'no-store' });
    const j = await res.json();
    if (j.ok) setItems(j.data || []);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta noticia?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/news?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('newsAdminToken') || ''}` },
      });
      const j = await res.json();
      if (j.ok) await load();
      else alert(j.error || 'No se pudo eliminar');
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) return <div className="card">No hay noticias publicadas aún.</div>;

  return (
    <div className="grid gap-4">
      {items.map(n => (
        <div key={n.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{n.title}</h3>
              <p className="muted text-sm">
                {new Date(n.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            {isAdmin && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => remove(n.id)}>
                Eliminar
              </button>
            )}
          </div>

          {n.imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={n.imageUrl} alt="Imagen de la noticia" className="w-full h-auto object-cover" />
            </div>
          )}

          <p className="mt-3 leading-relaxed whitespace-pre-wrap">{n.body}</p>
        </div>
      ))}
    </div>
  );
}
