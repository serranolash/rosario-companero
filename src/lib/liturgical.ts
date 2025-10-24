export type Season =
  | 'advent' | 'christmas' | 'lent' | 'easter' | 'pentecost' | 'ordinary';

export interface Palette {
  name: Season;
  primary: string; primaryText: string;
  secondary: string; secondaryText: string;
  bg1: string; bg2: string;
  badgeBg: string; badgeText: string;
  border: string;
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function previousSunday(d: Date) { const x = new Date(d); const dow = x.getUTCDay(); return addDays(x, -dow); }
function nextSunday(d: Date) { const x = new Date(d); const dow = x.getUTCDay(); return addDays(x, 7 - dow); }

export function currentSeason(now = new Date()): Season {
  const tzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const y = tzNow.getFullYear();

  const easter = easterSunday(y);
  const ashWed = addDays(easter, -46);
  const pentecost = addDays(easter, 49);
  const adventStart = previousSunday(addDays(new Date(Date.UTC(y, 11, 25)), -21));
  const christmasStart = new Date(Date.UTC(y, 11, 25));
  const baptism = nextSunday(new Date(Date.UTC(y + 1, 0, 6)));

  const t = Date.UTC(tzNow.getFullYear(), tzNow.getMonth(), tzNow.getDate());

  if (t >= Date.UTC(y, 11, 25) && t < Date.UTC(baptism.getUTCFullYear(), baptism.getUTCMonth(), baptism.getUTCDate()))
    return 'christmas';
  if (t >= adventStart.getTime() && t < Date.UTC(y, 11, 25)) return 'advent';
  if (t >= Date.UTC(y, ashWed.getUTCMonth(), ashWed.getUTCDate()) && t < Date.UTC(easter.getUTCFullYear(), easter.getUTCMonth(), easter.getUTCDate()))
    return 'lent';
  if (t >= Date.UTC(easter.getUTCFullYear(), easter.getUTCMonth(), easter.getUTCDate()) &&
      t <= Date.UTC(pentecost.getUTCFullYear(), pentecost.getUTCMonth(), pentecost.getUTCDate()))
    return t === Date.UTC(pentecost.getUTCFullYear(), pentecost.getUTCMonth(), pentecost.getUTCDate()) ? 'pentecost' : 'easter';
  return 'ordinary';
}

export function paletteFor(season: Season): Palette {
  switch (season) {
    case 'advent': return { name:'advent', primary:'#6b4ca6', primaryText:'#ffffff', secondary:'#efe6ff', secondaryText:'#1f2937', bg1:'#fffaf2', bg2:'rgba(107,76,166,0.16)', badgeBg:'#f3e8ff', badgeText:'#5b21b6', border:'rgba(15,23,42,0.08)' };
    case 'christmas': return { name:'christmas', primary:'#f5d28a', primaryText:'#0b1020', secondary:'#fff7e6', secondaryText:'#7a5a1c', bg1:'#fffdf8', bg2:'rgba(245,210,138,0.18)', badgeBg:'#fff7e6', badgeText:'#7a5a1c', border:'rgba(15,23,42,0.08)' };
    case 'lent': return { name:'lent', primary:'#5a3e8e', primaryText:'#ffffff', secondary:'#eee8ff', secondaryText:'#1f2937', bg1:'#fbfaf6', bg2:'rgba(90,62,142,0.16)', badgeBg:'#efe6ff', badgeText:'#4c1d95', border:'rgba(15,23,42,0.08)' };
    case 'easter': return { name:'easter', primary:'#5d87ff', primaryText:'#0b1020', secondary:'#e7efff', secondaryText:'#1f2937', bg1:'#faf7f0', bg2:'rgba(93,135,255,0.18)', badgeBg:'#ffffff', badgeText:'#1f2937', border:'rgba(15,23,42,0.08)' };
    case 'pentecost': return { name:'pentecost', primary:'#e24a3b', primaryText:'#fff', secondary:'#ffe6e3', secondaryText:'#7a1c15', bg1:'#fffaf6', bg2:'rgba(226,74,59,0.14)', badgeBg:'#ffe6e3', badgeText:'#7a1c15', border:'rgba(15,23,42,0.08)' };
    default: return { name:'ordinary', primary:'#22a06b', primaryText:'#07210f', secondary:'#e8f7ef', secondaryText:'#0f5132', bg1:'#f8fcf9', bg2:'rgba(34,160,107,0.12)', badgeBg:'#e8f7ef', badgeText:'#0f5132', border:'rgba(15,23,42,0.08)' };
  }
}