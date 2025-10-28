
// src/app/api/lecturas/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://universalis.com/mass.htm?lang=es', {
      // Revalida cada 3h (opcional)
      next: { revalidate: 60 * 60 * 3 }
    })
    const html = await res.text()
    // Extraer <body> para insertar en la app
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const body = bodyMatch ? bodyMatch[1] : html
    return NextResponse.json({ ok: true, html: body })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
