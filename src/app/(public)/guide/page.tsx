'use client'

import Link from 'next/link'
import MysteryCard from '@/components/MysteryCard'
import mysteriesData from '@/data/mysteries.es.json'
// ❌ borra esta línea si no la usás: import { guessMysteryIdByLocalDate } from '@/lib/day-mysteries';

export default function GuidePage() {
  return (
    <main className="container mx-auto px-4 pb-12">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-sm underline">← Volver</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Guía de Misterios</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {mysteriesData.map((m: any) => (
          <Link key={m.id} href={`/guide#${m.id}`} className="block">
            <MysteryCard
              id={m.id}
              title={`Misterios ${m.title}`}
              todayLabel={m.days?.join(' / ')}
            />
          </Link>
        ))}
      </div>
    </main>
  )
}
