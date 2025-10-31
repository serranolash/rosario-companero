// src/app/api/news/route.ts
// Runtime Edge + sin caché: ideal para Vercel con Blob
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';

type NewsItem = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string; // ISO
  author?: string;
};

const MANIFEST_KEY = 'news/news.json';
const ADMIN_TOKEN = process.env.NEWS_ADMIN_TOKEN || ''; // Configura en Vercel

async function readManifest(): Promise<NewsItem[]> {
  try {
    const { blobs } = await list({ prefix: MANIFEST_KEY });
    if (!blobs.length) return [];
    const res = await fetch(blobs[0].downloadUrl, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? (json as NewsItem[]) : [];
  } catch {
    return [];
  }
}

async function writeManifest(items: NewsItem[]) {
  await put(
    MANIFEST_KEY,
    JSON.stringify(items, null, 2),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    }
  );
}

// ------- GET: lista noticias (desc) -------
export async function GET() {
  const items = await readManifest();
  const sorted = items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(sorted, { headers: { 'Cache-Control': 'no-store' } });
}

// ------- POST: crear noticia (PROTEGIDO) -------
export async function POST(req: NextRequest) {
  // Token en header "Authorization: Bearer <token>" o "x-admin-token"
  const hAuth = req.headers.get('authorization') || '';
  const hToken = req.headers.get('x-admin-token') || '';
  const token = hToken || (hAuth.startsWith('Bearer ') ? hAuth.slice(7) : '');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const title = String(form.get('title') || '').trim();
  const body = String(form.get('body') || '').trim();
  const author = String(form.get('author') || '').trim();
  const image = form.get('image') as File | null;
  const video = form.get('video') as File | null;

  if (!title || !body) {
    return NextResponse.json({ error: 'title y body son requeridos' }, { status: 400 });
  }

  const id = `${Date.now()}`; // simple id
  let imageUrl: string | undefined;
  let videoUrl: string | undefined;

  // Subir imagen si viene
  if (image && image.size > 0) {
    const ext = (image.name.split('.').pop() || 'jpg').toLowerCase();
    const key = `news/${id}/image.${ext}`;
    const up = await put(key, image, {
      access: 'public',
      contentType: image.type || 'image/jpeg',
    });
    imageUrl = up.url;
  }

  // Subir video si viene
  if (video && video.size > 0) {
    const ext = (video.name.split('.').pop() || 'mp4').toLowerCase();
    const key = `news/${id}/video.${ext}`;
    const up = await put(key, video, {
      access: 'public',
      contentType: video.type || 'video/mp4',
    });
    videoUrl = up.url;
  }

  const nuevo: NewsItem = {
    id,
    title,
    body,
    imageUrl,
    videoUrl,
    createdAt: new Date().toISOString(),
    author: author || 'Admin',
  };

  const items = await readManifest();
  items.push(nuevo);
  await writeManifest(items);

  return NextResponse.json(nuevo, { status: 201 });
}

// ------- DELETE: borra noticia por ?id= (PROTEGIDO) -------
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';

  const hAuth = req.headers.get('authorization') || '';
  const hToken = req.headers.get('x-admin-token') || '';
  const token = hToken || (hAuth.startsWith('Bearer ') ? hAuth.slice(7) : '');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const items = await readManifest();
  const idx = items.findIndex((n) => n.id === id);
  if (idx === -1) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  // (Opcional) borrar blobs asociados:
  // No es obligatorio, pero si quisieras, podrías listar y borrar aquí los blobs con prefix `news/${id}/...`
  // await del({ url: items[idx].imageUrl! }); // solo si quieres borrar el blob
  // await del({ url: items[idx].videoUrl! }); // idem

  items.splice(idx, 1);
  await writeManifest(items);

  return NextResponse.json({ ok: true });
}
