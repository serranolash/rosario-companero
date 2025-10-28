'use client'
import Link from 'next/link'
import mysteriesData from '@/data/mysteries.es.json'

export default function GuidePage() {
  return (
    <main className="container mx-auto px-4 pb-12">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-sm underline">← Volver</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Guía de Misterios</h1>
      </div>

      <div className="space-y-8">
        {(mysteriesData as any[]).map((m) => (
          <section
            key={m.id}
            id={m.id}
            className="bg-white/90 backdrop-blur rounded-2xl border border-[rgba(15,23,42,0.08)] p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              {m.image && (
                // si no tenés la imagen, esto no falla
                <img
                  src={m.image}
                  alt={m.title}
                  className="w-20 h-20 rounded-xl object-cover border border-[rgba(15,23,42,0.08)]"
                />
              )}

              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-[#1d4ed8]">{m.title}</h2>
                <p className="text-slate-500 italic mb-2">Días: {m.days.join(' / ')}</p>
                {m.description && <p className="text-slate-600 mb-3">{m.description}</p>}
              </div>
            </div>

            <ol className="mt-4 space-y-3 list-decimal pl-5">
              {m.decades?.map((d: any) => (
                <li key={d.title}>
                  <p className="font-semibold text-slate-800">{d.title}</p>
                  {d.reflection && (
                    <p className="text-slate-600">{d.reflection}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  )
}
