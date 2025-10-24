'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import BigActionButton from '@/components/BigActionButton'
import { ProgressDots } from '@/components/ProgressDots'
import { PlayerControls } from '@/components/PlayerControls'
import { load, save } from '@/lib/storage'
import { AudioEngine } from '@/lib/audio'
import prayers from '@/data/prayers.es.json'
import mysteriesData from '@/data/mysteries.es.json'
import { guessMysteryIdByLocalDate } from '@/lib/day-mysteries'
import { MysteryCard } from '@/components/MysteryCard'

type Mode = 'rosario' | 'decena'
type Phase = 'PN' | 'AM' | 'GLORIA' | 'EXTRA_MADRE' | 'EXTRA_ALABANZAS' | 'EXTRA_OH_JESUS'
type Half = 'leader' | 'responder'

const REPLY_KEY = { AM_APP: 'ave-maria/parte2.mp3', PN_APP: 'padre-nuestro/parte2.mp3', GLORIA_APP: 'gloria/parte2.mp3' } as const

const TEXT = {
  PN_P1: (prayers as any).padre_nuestro.parte1, PN_P2: (prayers as any).padre_nuestro.parte2,
  AM_P1: (prayers as any).ave_maria.parte1,    AM_P2: (prayers as any).ave_maria.parte2,
  GL_P1: (prayers as any).gloria.parte1,       GL_P2: (prayers as any).gloria.parte2,
  EXTRA_MADRE: (prayers as any).post_gloria.madre_de_gracia,
  EXTRA_ALABANZAS: (prayers as any).post_gloria.alabanzas,
  EXTRA_OH_JESUS: (prayers as any).post_gloria.oh_jesus_mio,
}

export default function PrayPage(){
  const params = useParams<{mode: Mode}>()
  const mode = (params?.mode ?? 'decena') as Mode

  const [setId, setSetId] = useState<string | null>(null)
  useEffect(() => { setSetId(guessMysteryIdByLocalDate(new Date())) }, [])
  const mysterySet = useMemo(() => (setId ? (mysteriesData as any[]).find(m => m.id === setId) : null), [setId])

  const prefs = load('prefs', {voice:1, delayMs:300, gregorian:false})
  const [decade, setDecade] = useState(0)
  const [phase, setPhase] = useState<Phase>('PN')
  const [half, setHalf] = useState<Half>('leader')
  const [amCount, setAmCount] = useState(0)
  const engineRef = useRef<AudioEngine>()
  const leaderIsUser = useMemo(() => decade % 2 === 0, [decade])

  useEffect(()=>{
    const engine = new AudioEngine('/audio')
    engineRef.current = engine
    engine.init().then(()=>{ engine.preload(Object.values(REPLY_KEY) as string[]) })
  }, [])

  useEffect(()=>{ (async ()=>{ if (engineRef.current) await engineRef.current.setGregorian(prefs.gregorian) })() }, [prefs.gregorian])

  useEffect(() => {
    setPhase('PN'); setHalf('leader'); setAmCount(0)
    if (!leaderIsUser) engineRef.current?.speak(TEXT.PN_P1, prefs.delayMs)
  }, [decade, leaderIsUser, prefs.delayMs])

  const currentDecadeTitle = useMemo(()=> mysterySet?.decades?.[decade]?.title ?? `Misterio ${decade+1}`, [mysterySet, decade])
  const currentDecadeHint = useMemo(()=> mysterySet?.decades?.[decade]?.hint ?? '', [mysterySet, decade])

  const speakerLabel = useMemo(() => (half === 'leader' ? (leaderIsUser ? 'Tú' : 'Rosario Compañero') : (leaderIsUser ? 'Rosario Compañero' : 'Tú')), [half, leaderIsUser])
  const phaseTitle = useMemo(() => phase==='PN'?'Padre Nuestro':phase==='AM'?'Ave María':phase==='GLORIA'?'Gloria':'Oraciones finales', [phase])

  async function playReply(textFallback: string, mp3Key?: keyof typeof REPLY_KEY) {
    if (!engineRef.current) return
    if (mp3Key) {
      const ok = await engineRef.current.play(REPLY_KEY[mp3Key], prefs.delayMs)
      if (!ok) engineRef.current.speak(textFallback, prefs.delayMs)
    } else engineRef.current.speak(textFallback, prefs.delayMs)
  }

  async function onTap(){
    if (phase === 'PN') {
      if (half === 'leader') { setHalf('responder'); if (leaderIsUser) await playReply(TEXT.PN_P2, 'PN_APP') }
      else { setPhase('AM'); setHalf('leader'); setAmCount(0); if (!leaderIsUser) await playReply(TEXT.AM_P1) }
      return
    }
    if (phase === 'AM') {
      if (half === 'leader') { setHalf('responder'); if (leaderIsUser) await playReply(TEXT.AM_P2, 'AM_APP') }
      else {
        const n = amCount + 1
        if (n < 10) { setAmCount(n); setHalf('leader'); if (!leaderIsUser) await playReply(TEXT.AM_P1) }
        else { setPhase('GLORIA'); setHalf('leader'); if (!leaderIsUser) await playReply(TEXT.GL_P1) }
      }
      return
    }
    if (phase === 'GLORIA') {
      if (half === 'leader') { setHalf('responder'); if (leaderIsUser) await playReply(TEXT.GL_P2, 'GLORIA_APP') }
      else { setPhase('EXTRA_MADRE'); await playReply(TEXT.EXTRA_MADRE) }
      return
    }
    if (phase === 'EXTRA_MADRE') { setPhase('EXTRA_ALABANZAS'); await playReply(TEXT.EXTRA_ALABANZAS); return }
    if (phase === 'EXTRA_ALABANZAS') { setPhase('EXTRA_OH_JESUS'); await playReply(TEXT.EXTRA_OH_JESUS); return }
    if (phase === 'EXTRA_OH_JESUS') { nextDecade(); return }
  }

  function finishRosaryAndExit(){
    const total = load('rosary:count', 0) + 1
    save('rosary:count', total)
    window.location.href = '/'
  }

  function nextDecade(){
    const d = decade + 1
    if ((mode === 'decena' && d >= 1) || (mode === 'rosario' && d >= 5)){ finishRosaryAndExit(); return }
    setDecade(d)
  }
  function prevDecade(){
    const d = Math.max(0, decade - 1)
    setDecade(d)
  }

  if (!mysterySet) {
    return <div className="card">Cargando misterios del día…</div>
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <span className="badge">Misterios del día</span>
        <MysteryCard title={mysterySet.title} subtitle={`Hoy: ${mysterySet.days.join(' / ')}`} img={`/images/misterios/${mysterySet.id}.png`} />
      </div>

      <h1 className="text-2xl font-bold">Decena {decade+1}: {currentDecadeTitle}</h1>
      {currentDecadeHint ? <div className="text-sm text-slate-600">{currentDecadeHint}</div> : null}

      <div className="text-sm text-slate-600">Comienza: <b>{(decade % 2 === 0) ? 'Tú' : 'Rosario Compañero'}</b></div>

      <ProgressDots current={decade} />

      <div className="card space-y-4">
        <div className="text-lg">Paso: <b>{phaseTitle}</b> · Habla: <b>{speakerLabel}</b></div>
        <div className="text-sm text-slate-600">Ave Marías completadas: {amCount}/10</div>
        <BigActionButton label="Responder / Siguiente" onClick={onTap} />
        <PlayerControls onPrev={prevDecade} onNext={nextDecade} />
      </div>
    </div>
  )
}