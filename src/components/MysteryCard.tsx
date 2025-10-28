import React from 'react';

type Props = {
  id: 'gozosos' | 'dolorosos' | 'gloriosos' | 'luminosos';
  title: string;
  todayLabel?: string;
};

const artById: Record<string, string> = {
  gozosos:   '/images/misterios/gozosos.jpg',
  dolorosos: '/images/misterios/dolorosos.jpg',
  gloriosos: '/images/misterios/gloriosos.jpg',
  luminosos: '/images/misterios/luminosos.jpg',
};

export default function MysteryCard({ id, title, todayLabel }: Props) {
  const cover = artById[id] ?? '/images/misterios/rosario-beads.jpg';
  return (
    <div className="relative rounded-3xl border border-[rgba(15,23,42,0.08)] bg-white/85 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.06)] px-4 py-4 md:px-6 md:py-5">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <img src={cover} alt={title} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover shadow-md ring-1 ring-black/5" />
          <span className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-b from-white/40 to-transparent blur-sm"></span>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl md:text-3xl font-semibold tracking-wide text-slate-800">{title}</h3>
          {todayLabel && <p className="text-slate-500 mt-1">{todayLabel}</p>}
        </div>
      </div>
      <span className="pointer-events-none absolute -left-[1px] top-3 bottom-3 w-[6px] rounded-full bg-[#e8b923]/90"></span>
    </div>
  );
}
