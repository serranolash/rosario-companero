// src/app/api/lecturas/route.ts
import { NextResponse } from 'next/server'

// ---- utils ---------------------------------------------------------------

// fecha YYYYMMDD en Argentina
function yyyymmddInTZ(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const [y, m, d] = fmt.format(new Date()).split('-')
  return `${y}${m}${d}`
}

// reemplaza BR por \n
function replaceBrWithNewline(html: string) {
  return html.replace(/<br\s*\/?>/gi, '\n')
}

// quita etiquetas/ruido frecuentes
function stripUnwanted(html: string) {
  let h = html
  // quitar <script> y <style>
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '')
  h = h.replace(/<style[\s\S]*?<\/style>/gi, '')
  // quitar tags <font ...>...</font> dejando el contenido
  h = h.replace(/<\/?font[^>]*>/gi, '')
  // quitar atributos on* y class/id excesivos
  h = h.replace(/\s(on\w+|style|class|id)="[^"]*"/gi, '')

  // quitar promos al pie de Evangelio del día
  h = h.replace(/Extraído de la Biblia:.*$/gim, '')
  h = h.replace(/Para recibir cada mañana.*?(evangeliodeldia\.org).*$/gim, '')

  // eliminar enlaces sueltos de promo
  h = h.replace(/&nbsp;+/g, ' ')
  h = h.replace(/\n{3,}/g, '\n\n')
  return h.trim()
}

// decodifica entidades HTML básicas
function decodeEntities(s: string) {
  const map: Record<string,string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&lt;': '<',
    '&gt;': '>'
  }
  return s.replace(/(&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;)/g, m => map[m] || m)
}

// quita etiquetas HTML dejando texto y saltos
function htmlToPlain(html: string) {
  let h = html

  // 1️⃣ Eliminar bloques de script, style y comentarios
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '')
  h = h.replace(/<style[\s\S]*?<\/style>/gi, '')
  h = h.replace(/<!--[\s\S]*?-->/g, '')

  // 2️⃣ Eliminar todas las etiquetas <font>, <span> y sus atributos
  h = h.replace(/<\/?font[^>]*>/gi, '')
  h = h.replace(/<\/?span[^>]*>/gi, '')

  // 3️⃣ Convertir encabezados en títulos destacados
  h = h.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (_, text) => `\n\n🕊️ ${text.toUpperCase()}\n\n`)

  // 4️⃣ Convertir listas en viñetas limpias
  h = h.replace(/<\/li>\s*/gi, '\n')
  h = h.replace(/<li[^>]*>/gi, '• ')

  // 5️⃣ Quitar el resto de etiquetas, manteniendo párrafos y br
  h = h.replace(/<\/p>\s*/gi, '\n\n')
  h = h.replace(/<p[^>]*>/gi, '')
  h = h.replace(/(<br\s*\/?>\s*){2,}/gi, '\n\n') // 2 o más <br> → salto de párrafo
  h = h.replace(/<br\s*\/?>/gi, ' ') // 1 solo <br> → espacio

  // 6️⃣ Eliminar cualquier otra etiqueta HTML que quede
  h = h.replace(/<\/?[^>]+>/g, '')

  // 7️⃣ Decodificar entidades HTML
  h = decodeEntities(h)

  // 8️⃣ Limpiar líneas y espacios dobles
  h = h.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  return h
}



type EKey = 'FR'|'PS'|'SR'|'GSP'

async function evzFetch(date: string, what: 'reading' | 'reading_lt' | 'comment' | 'comment_t' | 'liturgic_t', content?: EKey) {
  const base = 'https://feed.evangelizo.org/v2/reader.php'
  const params = new URLSearchParams({ date, type: what, lang: 'SP' })
  if (content) params.set('content', content)
  const url = `${base}?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 60 * 60 }, headers: { 'Accept': 'text/plain; charset=utf-8' } })
  if (!res.ok) throw new Error(`Evangelizo ${what}/${content || ''} -> ${res.status}`)
  const txt = (await res.text()).trim()
  if (!txt || /^null$/i.test(txt)) return ''
  return txt
}

async function usccbFallback() {
  return {
    source: 'USCCB',
    note: 'Mostrando enlace del día (calendario EE.UU.).',
    url: 'https://bible.usccb.org/es/lecturas'
  }
}

// ---- handler -------------------------------------------------------------

export async function GET() {
  try {
    const date = yyyymmddInTZ('America/Argentina/Buenos_Aires')

    // TÍTULOS
    const [fr_t, ps_t, sr_t, gsp_t, titleLiturgic] = await Promise.all([
      evzFetch(date, 'reading_lt', 'FR').catch(()=>''),
      evzFetch(date, 'reading_lt', 'PS').catch(()=>''),
      evzFetch(date, 'reading_lt', 'SR').catch(()=>''),
      evzFetch(date, 'reading_lt', 'GSP').catch(()=>''),
      evzFetch(date, 'liturgic_t').catch(()=>'')
    ])

    // TEXTOS
    const [fr_raw, ps_raw, sr_raw, gsp_raw, commentTitle, commentRaw] = await Promise.all([
      evzFetch(date, 'reading', 'FR').catch(()=>''),
      evzFetch(date, 'reading', 'PS').catch(()=>''),
      evzFetch(date, 'reading', 'SR').catch(()=>''),
      evzFetch(date, 'reading', 'GSP').catch(()=>''),
      evzFetch(date, 'comment_t').catch(()=>''),
      evzFetch(date, 'comment').catch(()=>'')
    ])

    if (!gsp_raw) {
      // Evangelio vacío → fallback
      const fb = await usccbFallback()
      return NextResponse.json({ ok: true, fallback: fb }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // Sanear
    const clean = (x: string) => stripUnwanted(replaceBrWithNewline(x))
    const toPlain = (x: string) => htmlToPlain(x)

    const fr = fr_raw ? { key: 'FR', title: fr_t || 'Primera lectura', html: clean(fr_raw), textPlain: toPlain(clean(fr_raw)) } : null
    const ps = ps_raw ? { key: 'PS', title: ps_t || 'Salmo responsorial', html: clean(ps_raw), textPlain: toPlain(clean(ps_raw)) } : null
    const sr = sr_raw ? { key: 'SR', title: sr_t || 'Segunda lectura', html: clean(sr_raw), textPlain: toPlain(clean(sr_raw)) } : null
    const gsp = gsp_raw ? { key: 'GSP', title: gsp_t || 'Evangelio', html: clean(gsp_raw), textPlain: toPlain(clean(gsp_raw)) } : null
    const com = commentRaw ? { title: commentTitle || 'Comentario', html: clean(commentRaw), textPlain: toPlain(clean(commentRaw)) } : null

    const readings = [fr, ps, sr, gsp].filter(Boolean)

    return NextResponse.json({
      ok: true,
      source: 'Evangelizo',
      date,
      titleLiturgic: decodeEntities(titleLiturgic || ''),
      readings,
      comment: com
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    const fb = await usccbFallback()
    return NextResponse.json({ ok: true, fallback: fb }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
