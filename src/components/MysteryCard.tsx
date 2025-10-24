import React from 'react'
export function MysteryCard({ title, subtitle, img }: { title: string; subtitle?: string; img?: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="mystery-thumb">
        {img ? <img src={img} alt={title} /> : null}
      </div>
      <div>
        <div className="text-xl font-semibold text-slate-800">{title}</div>
        {subtitle ? <div className="muted">{subtitle}</div> : null}
      </div>
    </div>
  )
}