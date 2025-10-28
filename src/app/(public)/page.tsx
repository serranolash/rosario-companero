'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { guessMysteryIdByLocalDate } from '@/lib/day-mysteries'
import mysteriesData from '@/data/mysteries.es.json'
import { MysteryCard } from '@/components/MysteryCard'
import { load } from '@/lib/storage'
import { registerSW } from '@/lib/pwa'

type Myst = (typeof mysteriesData)[number]

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [count, setCount] = useState<number>(0)
  const [todays, setTodays] = useState<Myst | null>(null)

  useEffect(() => {
    // PWA
    registerSW?.()

    const c = Number(load('rosary:count', 0)) || 0
    const id = guessMysteryIdByLocalDate(new Date())
    const m = (mysteriesData as any).find((x: any) => x.id === id) as Myst | undefined

    setCount(c)
    setTodays(m ?? null)
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="card h-20" />
        <div className="card space-y-4">
          <div className="text-lg">Has completado <b>0</b> rosarios.</div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <span className="btn btn-secondary w-full text-center opacity-60">Guía de Misterios</span>
            <span className="btn btn-secondary w-full text-center opacity-60">Evangelio y lecturas de hoy</span>
            <div className="flex gap-3 w-full">
              <span className="btn btn-secondary w-full text-center opacity-60">Rezar una decena</span>
              <span className="btn btn-primary w-full text-center opacity-60">Rezar el rosario completo</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <section className="space-y-2">
        <span className="badge">Misterio del día</span>
        {todays && (
          <MysteryCard
            title={todays.title}
            subtitle={`Hoy: ${todays.days.join(' / ')}`}
            img={`/images/misterios/${todays.id}.png`}
          />
        )}
      </section>

      <section className="card space-y-4">
        <div className="text-lg">Has completado <b>{count}</b> rosarios.</div>

        {/* Acciones principales */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <Link href="/guide" className="btn btn-secondary w-full text-center">
            Guía de Misterios
          </Link>

          {/* Nuevo botón a /lecturas */}
          <Link href="/lecturas" className="btn btn-secondary w-full text-center">
            Evangelio y lecturas de hoy
          </Link>

          <div className="flex gap-3 w-full">
            <Link href="/pray/decena" className="btn btn-secondary w-full text-center">
              Rezar una decena
            </Link>
            <Link href="/pray/rosario" className="btn btn-primary w-full text-center">
              Rezar el rosario completo
            </Link>
          </div>
        </div>
      </section>

      <p className="muted text-sm">
        Tip: podés instalar esta app desde el menú del navegador para usarla offline.
      </p>

      <footer className="mt-10 text-center text-xs text-gray-500">
        <span className="uppercase tracking-wide">
          Desarrollado por <strong>Ing. Alex Serrano</strong>
        </span>
      </footer>
    </main>
  )
}
