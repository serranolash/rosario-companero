'use client';
import React, { useEffect, useState } from 'react';

type Notice = {
  id: string;
  title: string;
  date: string;
  body: string;
  image?: string; // Nueva propiedad
};

export default function ParroquiaPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/noticias.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <a href="/" className="text-sm underline">&larr; Volver</a>
      <h1 className="text-3xl font-bold text-center mb-4">Parroquia Soledad de María</h1>

      {/* Canal de YouTube */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Misas en Vivo</h2>
        <div className="aspect-video w-full rounded-xl overflow-hidden border mb-4">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed?listType=user_uploads&list=ParroquiaSoledaddeMar%C3%ADa"
            title="Parroquia Soledad de María"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <a
          className="btn btn-primary"
          href="https://youtube.com/channel/UCCB6TeHkWMk9pNTvAvMGZpw/ParroquiaSoledaddeMar%C3%ADa?si=rAw89SSOUN-FtAWD"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ir al Canal
        </a>
      </div>

      {/* Noticias */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Noticias de la Parroquia</h2>
        {loading && <div className="muted">Cargando…</div>}
        {!loading && !items.length && <div className="muted">No hay noticias por el momento.</div>}

        <div className="space-y-5">
          {items.map(n => (
            <article
              key={n.id}
              className="border border-slate-200 rounded-lg bg-white/90 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {n.image && (
                <div className="h-52 sm:h-64 overflow-hidden">
                  <img
                    src={n.image}
                    alt={n.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-1">{n.title}</h3>
                <div className="text-xs text-slate-600 mb-2">{n.date}</div>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{n.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
