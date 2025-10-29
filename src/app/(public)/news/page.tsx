'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import NewsList from '@/components/NewsList';

const NewsForm = dynamic(() => import('@/components/NewsForm'), { ssr: false });

export default function NewsPage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-sm underline">← Volver</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Noticias de la parroquia</h1>
      </div>

      <NewsList />

      {/* Form solo visible cuando el admin ingresa la clave en el cliente */}
      <NewsForm onCreated={() => { location.reload(); }} />
    </main>
  );
}
