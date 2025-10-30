import '@/styles/globals.css'
import type { Metadata, Viewport } from 'next'
import ThemeProvider from './providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'Rosario Compañero',
  description: 'Aplicación para rezar el Santo Rosario',
  manifest: '/manifest.json',
}
export const viewport: Viewport = { themeColor: '#5d87ff' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <main className="mx-auto w-full max-w-2xl px-5 py-8">
            {/* Header con imagen @2x, halo y tipografía */}
            <header className="flex items-center gap-4 mb-6">
              <div className="relative">
                {/* Imagen de la Virgen */}
                <img
                  src="/images/virgen@2x.png"
                  alt="Virgen María"
                  className="w-[64px] h-[64px] md:w-[80px] md:h-[80px] rounded-2xl object-cover shadow-lg ring-2 ring-[#e8b923]/70"                  
                />
                {/* Halo sutil */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-8 ring-[#e8b923]/12"></span>
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800">
                  Rosario Compañero
                </h1>
                <p className="text-slate-500 -mt-0.5">
                  Aplicación para rezar el Santo Rosario
                </p>
              </div>
            </header>

            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
