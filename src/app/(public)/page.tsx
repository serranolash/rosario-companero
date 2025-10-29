'use client'

import Link from 'next/link'

export default function HomePage(){
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">Rosario Compañero</h1>
      <p className="text-center muted mb-6">Aplicación para rezar el Santo Rosario</p>

      {/* Bloque de acciones: grilla responsiva con botones de igual tamaño */}
      <div className="card mb-6">
        <p className="mb-4">Has completado <b>3</b> rosarios.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link href="/guide" className="btn btn-secondary w-full h-24 flex items-center justify-center text-center">
            <span>Guía de<br/>Misterios</span>
          </Link>

          <Link href="/lecturas" className="btn btn-secondary w-full h-24 flex items-center justify-center text-center">
            <span>Evangelio y lecturas<br/>de hoy</span>
          </Link>

          <Link href="/noticias" className="btn btn-secondary w-full h-24 flex items-center justify-center text-center">
            <span>Noticias</span>
          </Link>

          <a
            className="btn btn-primary w-full h-24 flex items-center justify-center text-center"
            href="https://youtube.com/channel/UCCB6TeHkWMk9pNTvAvMGZpw"
            target="_blank" rel="noreferrer"
          >
            <span>Canal de<br/>YouTube</span>
          </a>

          <Link href="/pray/decena" className="btn btn-secondary w-full h-24 flex items-center justify-center text-center">
            <span>Rezar una<br/>decena</span>
          </Link>
        </div>

        {/* Acciones principales debajo (dos columnas en desktop) */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/pray/rosario" className="btn btn-primary w-full h-12 flex items-center justify-center">
            Rezar el rosario completo
          </Link>          
        </div>
      </div>

      <p className="text-center text-sm text-gray-500">
        Tip: podés instalar esta app desde el menú del navegador para usarla offline.
      </p>
    </main>
  )
}
