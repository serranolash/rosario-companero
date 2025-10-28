// src/lib/day-mysteries.ts
export type MysteryId = 'gozosos' | 'dolorosos' | 'gloriosos' | 'luminosos';

const titleById: Record<MysteryId, string> = {
  gozosos: 'Gozosos',
  dolorosos: 'Dolorosos',
  gloriosos: 'Gloriosos',
  luminosos: 'Luminosos',
};

const daysLabelById: Record<MysteryId, string> = {
  gozosos: 'lunes / sábado',
  dolorosos: 'martes / viernes',
  gloriosos: 'miércoles / domingo',
  luminosos: 'jueves',
};

const byWeekdayIndex: Record<number, MysteryId> = {
  0: 'gloriosos',  // domingo
  1: 'gozosos',    // lunes
  2: 'dolorosos',  // martes
  3: 'gloriosos',  // miércoles
  4: 'luminosos',  // jueves
  5: 'dolorosos',  // viernes
  6: 'gozosos',    // sábado
};

export function getTodayMystery(date = new Date(), tz = 'America/Argentina/Buenos_Aires') {
  // Si querés precisión por TZ, podés ajustar con Intl, pero para MVP vale getDay()
  const dayIdx = date.getDay();
  const id = byWeekdayIndex[dayIdx];
  const title = titleById[id];
  return { id, title } as { id: MysteryId; title: string };
}

export function dayLabelForToday(date = new Date()) {
  const { id } = getTodayMystery(date);
  return daysLabelById[id]; // ej: "martes / viernes"
}
