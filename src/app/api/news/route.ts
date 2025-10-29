// src/app/api/news/route.ts
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type NewsItem = {
  id: string
  title: string
  body: string
  image?: string
  createdAt: string
  author?: string
}

// “BD” efímera (instancia)
const store: { items: NewsItem[] } = { items: [] }

function okJson(data: any) {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'x-no-cache': Date.now().toString(),
    },
  })
}

export async function GET() {
  return okJson({ items: store.items.sort((a,b) => +new Date(b.createdAt) - +new Date(a.createdAt)) })
}

export async function POST(req: Request) {
  const user = req.headers.get('x-admin-user') || ''
  const pass = req.headers.get('x-admin-pass') || ''
  const U = process.env.NEXT_PUBLIC_NEWS_ADMIN_USER || ''
  const P = process.env.NEXT_PUBLIC_NEWS_ADMIN_PASS || ''
  if (user !== U || pass !== P) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { title, body, image, author } = await req.json()
  if (!title || !body) return new NextResponse('Bad Request', { status: 400 })

  const item: NewsItem = {
    id: crypto.randomUUID(),
    title,
    body,
    image,
    author,
    createdAt: new Date().toISOString(),
  }
  store.items.push(item)
  return okJson({ ok: true, item })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id') || ''
  const user = req.headers.get('x-admin-user') || ''
  const pass = req.headers.get('x-admin-pass') || ''
  const U = process.env.NEXT_PUBLIC_NEWS_ADMIN_USER || ''
  const P = process.env.NEXT_PUBLIC_NEWS_ADMIN_PASS || ''
  if (user !== U || pass !== P) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const i = store.items.findIndex(x => x.id === id)
  if (i >= 0) store.items.splice(i, 1)
  return okJson({ ok: true })
}
