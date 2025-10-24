const map: Record<string,string> = {
  'domingo': 'gloriosos',
  'lunes': 'gozosos',
  'martes': 'dolorosos',
  'miércoles': 'gloriosos',
  'jueves': 'luminosos',
  'viernes': 'dolorosos',
  'sábado': 'gozosos'
}

export function guessMysteryIdByLocalDate(d = new Date()) {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }
  const day = new Intl.DateTimeFormat('es-AR', opts).format(d).toLowerCase()
  return map[day] || 'gozosos'
}