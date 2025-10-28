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
            <header className="mb-6 flex items-center gap-3">
              <img src="/images/virgen.png" alt="Virgen María" className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-white p-1" />
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Rosario Compañero</h1>
                <p className="text-sm text-slate-500">Aplicación para rezar el Santo Rosario</p>
              </div>
            </header>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}