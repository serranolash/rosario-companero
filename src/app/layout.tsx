'use client';
import Image from 'next/image';
import { useState } from 'react';

export default function Header() {
  const [imgSrc, setImgSrc] = useState('/images/virgen@2x.png');

  return (
    <header className="flex items-center gap-4 mb-6">
      <div className="relative">
        <Image
          src={imgSrc}
          alt="Virgen María"
          width={80}
          height={80}
          className="rounded-2xl object-cover shadow-lg ring-2 ring-[#e8b923]/70"
          priority
          onError={() => setImgSrc('/images/virgen-fallback.png')}
        />
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
  );
}
