'use client'
import React from 'react'
import cn from 'classnames'

export default function BigActionButton({label, onClick, disabled=false}:{label:string;onClick:()=>void;disabled?:boolean}){
  return (
    <button
      className={cn('w-full rounded-2xl px-6 py-5 text-lg font-semibold bg-[var(--color-primary)] text-[var(--color-primary-text)] shadow-[0_10px_30px_rgba(93,135,255,0.25)] active:scale-[0.98] transition',
        {'opacity-60 cursor-not-allowed': disabled})}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}