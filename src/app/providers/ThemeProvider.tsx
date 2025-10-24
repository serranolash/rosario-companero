'use client'
import { useEffect } from 'react'
import { currentSeason, paletteFor } from '@/lib/liturgical'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const s = currentSeason();
    const p = paletteFor(s);
    const root = document.documentElement;
    root.style.setProperty('--color-primary', p.primary);
    root.style.setProperty('--color-primary-text', p.primaryText);
    root.style.setProperty('--color-secondary', p.secondary);
    root.style.setProperty('--color-secondary-text', p.secondaryText);
    root.style.setProperty('--color-bg1', p.bg1);
    root.style.setProperty('--color-bg2', p.bg2);
    root.style.setProperty('--color-badge-bg', p.badgeBg);
    root.style.setProperty('--color-badge-text', p.badgeText);
    root.style.setProperty('--color-border', p.border);
  }, []);
  return <>{children}</>;
}