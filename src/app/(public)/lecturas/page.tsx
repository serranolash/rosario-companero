'use client'
import ReadingsWidget from '@/components/ReadingsWidget'

export default function LecturasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => history.length > 1 ? history.back() : location.assign('/')} className="btn btn-secondary">← Volver</button>
        <h1 className="text-xl font-bold">Lecturas del día</h1>
      </div>
      <ReadingsWidget />
    </div>
  )
}
