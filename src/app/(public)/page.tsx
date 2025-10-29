'use client';

import Link from 'next/link';
import mysteriesJson from '@/data/mysteries.es.json';
// p.ej. en src/app/(public)/page.tsx o en layout client
import { useEffect } from 'react'
import { initPWAUpdatePrompt } from '@/lib/pwa'


  




type Group = {
  id: 'gozosos' | 'dolorosos' | 'gloriosos' | 'luminosos' | string;
  title: string;
  days: string[];
  image?: string;
  description?: string;
};

const normKey = (s = '') => s.toLowerCase().replace(/^misterios?\s+/, '').trim();
const groupKeyForToday = () => {
  const d = new Date().getDay(); // 0=dom,1=lun,...,6=sáb
  if (d === 1 || d === 6) return 'gozosos';
  if (d === 2 || d === 5) return 'dolorosos';
  if (d === 3 || d === 0) return 'gloriosos';
  return 'luminosos';
};

function buildImageCandidates(g: Group) {
  const id = (g.id || '').toLowerCase().trim();

  // lo que venga del JSON (normalizado)
  const fromJson = g.image
    ? (g.image.startsWith('/') ? g.image : `/${g.image}`)
    : null;

  // variantes por carpeta y posible typo “goriosos”
  const baseNames = id === 'gloriosos' ? ['gloriosos', 'goriosos'] : [id];
  const folders = ['images', 'imagen']; // plural y singular

  const byId = folders.flatMap((folder) =>
    baseNames.map((name) => `/${folder}/misterios/${name}.jpg`)
  );

  // orden de prueba: JSON -> por id (images) -> por id (imagen) -> typo
  const candidates = [
    ...(fromJson ? [fromJson] : []),
    ...byId,
  ];

  // elimina duplicados
  return Array.from(new Set(candidates));
}

export default function HomePage() {
  const all = mysteriesJson as Group[];
  const wanted = groupKeyForToday();  
  useEffect(() => { initPWAUpdatePrompt() }, [])

  const group =
    all.find(g => (g.id || '').toLowerCase() === wanted) ||
    all.find(g => normKey(g.title) === wanted) ||
    all[0];

  const daysLabel = group?.days?.join(' / ') ?? '';

  const candidates = group ? buildImageCandidates(group) : [];
  // primer candidato
  let imgSrc = candidates[0];

  const shareWhatsapp = () => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://';
    const txt = `Te invito a rezar con “Rosario Compañero”: ${origin}`;
    const url = `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="container mx-auto px-4 pb-12">
      {/* Misterio del día */}
      <section className="card mb-6">
        <span className="badge mb-3">Misterio del día</span>
        <div className="flex items-center gap-4">
          {imgSrc ? (
            <div className="mystery-thumb">
              <img
                src={imgSrc}
                alt={group?.title || 'Misterio'}
                onError={(e) => {
                  // si falla, pasamos al siguiente candidato
                  const el = e.currentTarget as HTMLImageElement;
                  const idx = candidates.indexOf(el.src.replace(window.location.origin, ''));
                  const next = candidates[idx + 1];
                  if (next) {
                    el.src = next;
                  } else {
                    // sin más candidatos, mostramos placeholder
                    el.onerror = null;
                    el.alt = 'Imagen no disponible';
                    el.style.display = 'none';
                  }
                }}
              />
            </div>
          ) : (
            <div className="mystery-thumb flex items-center justify-center text-sm muted">
              Sin imagen
            </div>
          )}
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold">{group?.title}</h2>
            {!!daysLabel && <p className="muted">Hoy: {daysLabel}</p>}
          </div>
        </div>
        {group?.description && <p className="muted mt-3">{group.description}</p>}
      </section>

      {/* Acciones principales */}
      <section className="card">
        <p className="mb-3">Has completado 2 rosarios.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/guide" className="btn btn-secondary w-full text-center">
            Guía de Misterios
          </Link>
          <Link href="/lecturas" className="btn btn-secondary w-full text-center">
            Evangelio y lecturas de hoy
          </Link>
          <Link href="/noticias" className="btn btn-secondary w-full text-center">
            Noticias
          </Link>
          <a
            href="https://youtube.com/channel/UCCB6TeHkWMk9pNTvAvMGZpw"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary w-full text-center"
          >
            Canal de YouTube
          </a>
          <Link href="/pray/full" className="btn btn-primary w-full text-center">
            Rezar el rosario completo
          </Link>
          <button onClick={shareWhatsapp} className="btn w-full text-center">
            Compartir por WhatsApp
          </button>
        </div>
      </section>

      <p className="muted text-center mt-6">
        Tip: podés instalar esta app desde el menú del navegador para usarla offline.
      </p>

      <footer className="mt-10 text-center text-xs text-gray-500">
        <span className="uppercase tracking-wide">
          Desarrollado por <strong>Ing. Alex Serrano</strong>
        </span>
      </footer>
    </main>
  );
}
