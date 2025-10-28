// src/app/api/lecturas/route.ts
import { NextResponse } from 'next/server'

function absolutize(html: string) {
  // href/src relativos -> absolutos a universalis.com
  return html
    .replace(/href="\//g, 'href="https://universalis.com/')
    .replace(/src="\//g, 'src="https://universalis.com/')
}

function stripUnwanted(html: string) {
  let h = html
  // Quitar scripts y estilos inyectados
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '')
  h = h.replace(/<style[\s\S]*?<\/style>/gi, '')
  // Quitar bloques de redes, banners, navs, footers, etc. (best-effort)
  h = h.replace(/<div[^>]*class="[^"]*(share|social|icons|banner|navbar|menu|footer|header)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  h = h.replace(/<nav[\s\S]*?<\/nav>/gi, '')
  h = h.replace(/<footer[\s\S]*?<\/footer>/gi, '')
  h = h.replace(/<header[\s\S]*?<\/header>/gi, '')
  // Forzar atributo lang a es (cosmético)
  h = h.replace(/lang="en"/gi, 'lang="es"')
  return h
}

export async function GET() {
  try {
    // ✅ Forzar español usando la variante /es/
    const url = 'https://universalis.com/es/mass.htm'
    const res = await fetch(url, {
      headers: {
        // refuerzo adicional
        'Accept-Language': 'es-ES,es;q=0.9'
      },
      // revalidar cada 2h
      next: { revalidate: 60 * 60 * 2 }
    })
    if (!res.ok) throw new Error(`Universalis ${res.status}`)

    const full = await res.text()
    const bodyMatch = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const body = bodyMatch ? bodyMatch[1] : full

    const fixed = absolutize(stripUnwanted(body))

    return NextResponse.json({ ok: true, html: fixed }, {
      headers: {
        // evitar servir cache viejo a los clientes
        'Cache-Control': 'no-store'
      }
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'fetch error' }, { status: 500 })
  }
}
