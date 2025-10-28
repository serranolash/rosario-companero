'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import MysteryCard from '@/components/MysteryCard'
import { getTodayMystery, dayLabelForToday } from '@/lib/day-mysteries'
import { load } from '@/lib/storage'
import { registerSW } from '@/lib/pwa'

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [count, setCount] = useState<number>(0)

  // Datos del misterio del día (sincrónicos)
  const mystery = getTodayMystery() // { id, title }
  const labelDelDia = dayLabelForToday() // ej: "martes / viernes"

  useEffect(() => {
    // PWA
    registerSW?.()

    const c = Number(load('rosary:count', 0)) || 0
    setCount(c)
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

        {/* ✅ Uso del componente y helpers correctos */}
        <MysteryCard
          id={mystery.id}                               // 'dolorosos' | 'gozosos' | 'gloriosos' | 'luminosos'
          title={`Misterios ${mystery.title}`}          // ej: "Misterios Dolorosos"
          todayLabel={`Hoy: ${labelDelDia}`}            // ej: "Hoy: martes / viernes"
        />
      </section>

      <section className="card space-y-4">
        <div className="text-lg">Has completado <b>{count}</b> rosarios.</div>

        {/* Acciones principales */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <Link href="/guide" className="btn btn-secondary w-full text-center">
            Guía de Misterios
          </Link>

          {/* Botón a /lecturas */}
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
