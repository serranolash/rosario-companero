'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import mysteriesData from '@/data/mysteries.es.json'
import { guessMysteryIdByLocalDate } from '@/lib/day-mysteries'
import { MysteryCard } from '@/components/MysteryCard'

export default function GuidePage(){
  const router = useRouter()
  const [setId, setSetId] = useState<string>('gozosos')

  useEffect(()=>{ setSetId(guessMysteryIdByLocalDate(new Date())) },[])

  const current = (mysteriesData as any[]).find(m => m.id === setId) || mysteriesData[0]

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar con botón Volver */}
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          className="btn btn-secondary"
          aria-label="Volver al inicio"
          title="Volver"
        >
          ← Volver
        </button>
        <h1 className="text-xl font-bold">Guía de Misterios</h1>
      </div>

      <div className="space-y-2">
        <span className="badge">Misterios</span>
        <MysteryCard
          title={current.title}
          subtitle={current.days.join(' / ')}
          img={`/images/misterios/${current.id}.png`}
        />
      </div>

      <div className="card">
        <ol className="list-decimal pl-6 space-y-2">
          {current.decades.map((d:any, i:number) => (
            <li key={i}><b>{d.title}</b>{d.hint ? ` — ${d.hint}` : ''}</li>
          ))}
        </ol>
      </div>

      <div className="card space-y-3">
        <div className="text-sm">Cambiar conjunto:</div>
        <div className="flex gap-2 flex-wrap">
          {mysteriesData.map((m:any)=> (
            <button
              key={m.id}
              onClick={()=>setSetId(m.id)}
              className={`btn ${setId===m.id?'btn-primary':'btn-secondary'}`}
            >
              {m.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
