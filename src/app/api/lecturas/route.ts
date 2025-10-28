// src/app/api/lecturas/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 🔹 Forzamos idioma español
    const url = 'https://universalis.com/es/mass.htm'
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 3 } })

    if (!res.ok) throw new Error(`Universalis respondió ${res.status}`)
    const html = await res.text()

    // Extraer solo el cuerpo para embebido limpio
    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const body = match ? match[1] : html

    // Reemplazar links relativos → absolutos
    const fixed = body.replace(/href="\//g, 'href="https://universalis.com/')

    return NextResponse.json({ ok: true, html: fixed })
  } catch (e: any) {
    console.error('Error al obtener lecturas:', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
