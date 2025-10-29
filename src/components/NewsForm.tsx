'use client';

import { useEffect, useState } from 'react';

type Props = { onCreated?: () => void };

export default function NewsForm({ onCreated }: Props) {
  const [adminToken, setAdminToken] = useState('');
  const [hasAuth, setHasAuth] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('newsAdminToken') || '';
    if (t) { setAdminToken(t); setHasAuth(true); }
  }, []);

  function login(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('newsAdminToken', adminToken.trim());
    setHasAuth(true);
  }

  async function uploadImage(): Promise<string | undefined> {
    if (!imageFile) return undefined;
    const form = new FormData();
    form.append('file', imageFile);
    const res = await fetch('/api/news/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('newsAdminToken') || ''}` },
      body: form,
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Error al subir imagen');
    return j.url as string;
  }

  async function createNews(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const imageUrl = await uploadImage();
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('newsAdminToken') || ''}`,
        },
        body: JSON.stringify({ title, body, imageUrl }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'No se pudo crear');
      setTitle(''); setBody(''); setImageFile(null);
      onCreated?.();
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  if (!hasAuth) {
    return (
      <div className="card mt-6">
        <p className="mb-2 font-semibold">Acceso de administrador</p>
        <form onSubmit={login} className="flex flex-col gap-2">
          <input
            type="password"
            className="border rounded px-3 py-2"
            placeholder="Clave de administrador"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">Usar esta clave</button>
          <p className="text-xs muted">La clave se guarda localmente en este dispositivo.</p>
        </form>
      </div>
    );
  }

  return (
    <div className="card mt-6">
      <p className="mb-2 font-semibold">Nueva noticia</p>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={createNews} className="flex flex-col gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="border rounded px-3 py-2 min-h-[120px]"
          placeholder="Contenido (texto largo)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          {imageFile && <span className="text-sm">{imageFile.name}</span>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Publicar'}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => { localStorage.removeItem('newsAdminToken'); setHasAuth(false); }}
          >
            Cerrar sesión admin
          </button>
        </div>
      </form>
    </div>
  );
}
