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

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="underline text-sm">← Volver</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Noticias de la Parroquia</h1>
        <div className="ml-auto">
          <Link href="/news/admin" className="btn btn-secondary text-sm">Panel Admin</Link>
        </div>
      </div>

      {loading && <div className="card">Cargando…</div>}
      {!loading && items.length === 0 && (
        <div className="card">Aún no hay noticias.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((n) => (
          <article key={n.id} className="card">
            <h2 className="text-xl font-semibold mb-1">{n.title}</h2>
            <p className="text-xs text-gray-500 mb-2">
              {new Date(n.createdAt).toLocaleString()} {n.author ? `· ${n.author}` : ''}
            </p>

            {n.imageUrl && (
              <div className="rounded-lg overflow-hidden border mb-3">
                <img src={n.imageUrl} alt={n.title} className="w-full h-auto" />
              </div>
            )}

            {n.videoUrl && (
              <div className="rounded-lg overflow-hidden border mb-3">
                <video src={n.videoUrl} controls className="w-full h-auto" />
              </div>
            )}

            <p className="whitespace-pre-wrap">{n.body}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
