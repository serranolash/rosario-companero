'use client'
import React from 'react'

export function PlayerControls({ onPrev, onNext }:{ onPrev:()=>void; onNext:()=>void }){
  return (
    <div className="flex gap-3">
      <button className="btn btn-secondary w-full" onClick={onPrev}>Anterior</button>
      <button className="btn btn-secondary w-full" onClick={onNext}>Siguiente</button>
    </div>
  )
}