// src/app/api/news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listNews, addNews, deleteNews } from '@/lib/news-store';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  const data = await listNews();
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { title, body, imageUrl } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ ok: false, error: 'Faltan campos' }, { status: 400 });
  }
  const id = crypto.randomUUID();
  await addNews({ id, title, body, imageUrl, createdAt: Date.now() });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Falta id' }, { status: 400 });
  await deleteNews(id);
  return NextResponse.json({ ok: true });
}
