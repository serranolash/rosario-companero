'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { audio } from '@/lib/audio';
import { recognition } from '@/lib/recognition';

/** Fases del rezo (simple y explícito para TS) */
type Phase = 'IDLE' | 'INTRO' | 'ANNOUNCE' | 'RUNNING' | 'GLORIA' | 'DONE';

export default function PrayPage() {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>('IDLE');

  /** Línea que “dice” la app (viene de audio.setOnLine) */
  const [appLine, setAppLine] = useState<string | null>(null);

  /** Lo que la app va reconociendo del feligrés */
  const [userPartial, setUserPartial] = useState('');
  const [userFinal, setUserFinal] = useState('');

  /** bandera simple para no encimar audios */
  const busyRef = useRef(false);

  /** Inicializa audio + engancha “línea hablada” */
  useEffect(() => {
    audio.init();
    audio.setOnLine((l) => setAppLine(l || ''));
    return () => {
      audio.stop();
      recognition.stop();
      audio.setOnLine(null);
    };
  }, []);

  /** util: espera N ms */
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  /** Arranca el rosario completo (flujo mínimo y robusto) */
  const startRosary = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setStarted(true);

    try {
      // ---------- INTRO ----------
      setPhase('INTRO');

      // Oraciones iniciales (acortadas para que no se corten en móviles)
      await audio.sayOrPlay(
        'Por la señal de la Santa Cruz. En el nombre del Padre, del Hijo y del Espíritu Santo. Amén.',
        '/audio/intro/por-la-senal.mp3'
      );
      await audio.sayOrPlay(
        'Señor, ábreme los labios. Y mi boca proclamará tu alabanza.',
        '/audio/intro/abre-labios.mp3'
      );
      await audio.sayOrPlay(
        'Dios mío, ven en mi auxilio. Señor, date prisa en socorrerme.',
        '/audio/intro/ven-auxilio.mp3'
      );

      // ---------- ANUNCIO DEL MISTERIO ----------
      setPhase('ANNOUNCE');
      await audio.sayOrPlay(
        'Primer misterio del día. Comencemos con el Padre Nuestro.',
        '/audio/misterios/announce-next.mp3'
      );

      // ---------- MODO MANOS LIBRES (una decena de ejemplo) ----------
      setPhase('RUNNING');

      // 1) Espera la mitad del fiel: Padre Nuestro
      await listenUserHalf('Padre Nuestro');

      // 2) Responde la mitad de la app (Padre Nuestro parte 2)
      await audio.sayOrPlay(
        'Amén.',
        '/audio/padre-nuestro/amen.mp3'
      );

      // 3) Ahora Ave María ×10 (usuario/app alternan)
      for (let i = 0; i < 10; i++) {
        await listenUserHalf(`Ave María ${i + 1}`);
        await audio.sayOrPlay(
          'Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.',
          '/audio/avemaria/santa-maria.mp3'
        );
      }

      // ---------- GLORIA + MARÍA MADRE DE GRACIA + OH JESÚS MÍO ----------
      setPhase('GLORIA');
      await audio.sayOrPlay(
        'Gloria al Padre y al Hijo y al Espíritu Santo.',
        '/audio/gloria/parte1.mp3'
      );
      await audio.sayOrPlay(
        'Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.',
        '/audio/gloria/parte2.mp3'
      );
      await audio.sayOrPlay(
        'María, Madre de gracia y Madre de misericordia, defiéndenos de nuestros enemigos, y ampáranos ahora y en la hora de nuestra muerte. Amén.',
        '/audio/extras/maria-madre.mp3'
      );
      await audio.sayOrPlay(
        'Oh Jesús mío, perdona nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia.',
        '/audio/extras/oh-jesus-mio.mp3'
      );

      // Aquí podrías encadenar los otros 4 misterios con el mismo patrón
      // (ANNOUNCE → RUNNING con PN/Ave x10 → GLORIA), o navegar a una
      // segunda pantalla que continúe la secuencia.

      setPhase('DONE');
      await audio.sayOrPlay(
        'Sesión finalizada. Gracias por rezar.',
        '/audio/extras/gracias.mp3'
      );
    } catch {
      // si algo falla, no reventar
    } finally {
      recognition.stop();
      busyRef.current = false;
    }
  };

  /**
   * Espera la mitad del fiel en manos libres:
   * — comienza a escuchar
   * — muestra parcial
   * — cuando el reconocimiento emite resultado final que contiene un “ender”
   *   (Amén, Gloria al Padre, etc.), se resuelve y para de escuchar.
   */
  const listenUserHalf = async (label: string) => {
    return new Promise<void>((resolve) => {
      setUserPartial('');
      setUserFinal('');

      recognition.onPartial((t) => setUserPartial(t));
      recognition.onFinal((t) => setUserFinal(t));

      // arrancar escucha
      recognition.start();

      // *Reconocimiento* ya tiene su propia lógica: cuando detecta un “ender”
      // detiene la escucha. Aquí chequeamos periódicamente si paró.
      const check = async () => {
        // damos tiempo de colchón para que no se adelante
        if (!recognition.isListening()) {
          await sleep(250); // mini pausa
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  };

  // ------------------ UI ------------------
  return (
    <main className="container mx-auto px-4 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-sm underline">&larr; Volver</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold">Rezar</h1>
      </div>

      {started ? (
        <>
          <div className="card mb-4">
            {phase === 'INTRO'    && <p>Preparando audio y micrófono…</p>}
            {phase === 'ANNOUNCE' && <p>Anunciando el misterio…</p>}
            {phase === 'RUNNING'  && (
              <p><b>Manos libres:</b> la app escucha tu mitad y responde automáticamente.</p>
            )}
            {phase === 'GLORIA'   && <p>Gloria y oraciones finales de la decena…</p>}
            {phase === 'DONE'     && <p><b>Sesión finalizada.</b> Gracias por rezar.</p>}
          </div>

          {/* Línea que dice la app (TTS) */}
          {appLine && (
            <div className="card mb-4">
              <div className="badge mb-2">Rosario Compañero</div>
              <p>{appLine}</p>
            </div>
          )}

          {/* Lo que va diciendo el feligrés */}
          {(userPartial || userFinal) && (
            <div className="card mb-4">
              <div className="badge mb-2">Tu voz</div>
              {userFinal ? (
                <p><b>Final:</b> {userFinal}</p>
              ) : (
                <p className="muted"><i>Escuchando…</i> {userPartial}</p>
              )}
            </div>
          )}

          {/* Controles de seguridad */}
          <div className="flex gap-3">
            <button
              className="btn btn-secondary"
              onClick={() => { try { recognition.stop(); } catch {} }}
            >
              Detener escucha
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => { if (!busyRef.current) startRosary(); }}
            >
              Reintentar paso
            </button>
          </div>
        </>
      ) : (
        <div className="card">
          <p className="mb-4">Presioná para comenzar el rosario en modo manos libres.</p>
          <button className="btn btn-primary" onClick={startRosary}>
            Rezar ahora
          </button>
        </div>
      )}
    </main>
  );
}
