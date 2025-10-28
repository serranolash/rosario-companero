// src/app/api/lecturas/route.ts
import { NextResponse } from 'next/server'

// Util para formatear fecha en Argentina (YYYYMMDD)
function yyyymmddInTZ(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const [y, m, d] = fmt.format(new Date()).split('-')
  return `${y}${m}${d}`
}

// Fetch a Evangelizo "type=reading" or "reading_lt" en español (lang=SP)
async function evzFetch(date: string, what: 'reading' | 'reading_lt' | 'comment' | 'comment_t' | 'liturgic_t', content?: 'FR'|'PS'|'SR'|'GSP') {
  const base = 'https://feed.evangelizo.org/v2/reader.php'
  const params = new URLSearchParams({ date, type: what, lang: 'SP' })
  if (content) params.set('content', content)
  const url = `${base}?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 60 * 60 }, headers: { 'Accept': 'text/plain; charset=utf-8' } })
  if (!res.ok) throw new Error(`Evangelizo ${what}/${content || ''} -> ${res.status}`)
  const txt = await res.text()
  // Evita "NULL" o vacío
  if (!txt || /^null$/i.test(txt.trim())) return ''
  return txt.trim()
}

// Fallback muy simple al RSS ES de USCCB (nota: calendario USA)
async function usccbFallback() {
  // RSS español. No publican JSON; mostramos el enlace para lectura directa.
  // Política: se permite mostrar lecturas vía RSS en sitios sin acceso condicionado.
  // (Referencia en políticas de copyright USCCB)
  const feedUrl = 'https://bible.usccb.org/es/lecturas' // página del día en ES
  return {
    source: 'USCCB',
    note: 'Mostrando enlace del día (calendario EE.UU.).',
    url: feedUrl,
  }
}

export async function GET() {
  try {
    const date = yyyymmddInTZ('America/Argentina/Buenos_Aires')

    // Títulos breves y textos
    const [fr_t, ps_t, sr_t, gsp_t] = await Promise.all([
      evzFetch(date, 'reading_lt', 'FR').catch(()=>''),
      evzFetch(date, 'reading_lt', 'PS').catch(()=>''),
      evzFetch(date, 'reading_lt', 'SR').catch(()=>''),
      evzFetch(date, 'reading_lt', 'GSP').catch(()=>''),
    ])

    const [fr, ps, sr, gsp] = await Promise.all([
      evzFetch(date, 'reading', 'FR').catch(()=>''),
      evzFetch(date, 'reading', 'PS').catch(()=>''),
      evzFetch(date, 'reading', 'SR').catch(()=>''),
      evzFetch(date, 'reading', 'GSP').catch(()=>''),
    ])

    const [titleLiturgic, commentTitle, comment] = await Promise.all([
      evzFetch(date, 'liturgic_t').catch(()=>''),
      evzFetch(date, 'comment_t').catch(()=>''),
      evzFetch(date, 'comment').catch(()=>''),
    ])

    // Si Evangelio viene vacío por alguna rareza, hacemos fallback
    if (!gsp) {
      const fb = await usccbFallback()
      return NextResponse.json({ ok: true, fallback: fb })
    }

    return NextResponse.json({
      ok: true,
      source: 'Evangelizo',
      date,
      titleLiturgic,
      readings: [
        fr ? { key: 'FR', title: fr_t || 'Primera lectura', text: fr } : null,
        ps ? { key: 'PS', title: ps_t || 'Salmo responsorial', text: ps } : null,
        sr ? { key: 'SR', title: sr_t || 'Segunda lectura', text: sr } : null,
        gsp ? { key: 'GSP', title: gsp_t || 'Evangelio', text: gsp } : null,
      ].filter(Boolean),
      comment: comment ? { title: commentTitle || 'Comentario', text: comment } : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    // Error total → fallback
    const fb = await usccbFallback()
    return NextResponse.json({ ok: true, fallback: fb })
  }
}
