import React from 'react'

export function ProgressDots({ current }: { current: number }){
  const dots = Array.from({length:5}, (_,i)=>i)
  return (
    <div className="flex gap-2">
      {dots.map(i => (
        <div key={i} className={`h-2 flex-1 rounded-full ${i<=current ? 'bg-[var(--color-primary)]' : 'bg-slate-200'}`} />
      ))}
    </div>
  )
}