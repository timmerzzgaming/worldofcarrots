'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    const advance = async () => {
      // Stage 1: load maplibre-gl (0-40%)
      setProgress(5)
      await import('maplibre-gl')
      if (cancelled) return
      setProgress(40)

      // Stage 2: fetch GeoJSON (40-80%)
      const res = await fetch('/data/countries.geojson')
      if (cancelled) return
      setProgress(75)
      await res.json()
      if (cancelled) return
      setProgress(90)

      // Stage 3: short pause for fonts/CSS (90-100%)
      await new Promise((r) => setTimeout(r, 300))
      if (cancelled) return
      setProgress(100)

      // Fade out
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled) return
      setDone(true)
    }

    advance().catch(() => {
      setProgress(100)
      setTimeout(() => setDone(true), 400)
    })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (done) onComplete()
  }, [done, onComplete])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-geo-bg"
        >
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-headline font-extrabold text-geo-on-surface italic uppercase tracking-tighter drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] mb-2">
            World<span className="text-geo-primary text-glow-primary">Of</span>Carrots
          </h1>

          <div className="w-56 sm:w-64 mt-8">
            <div className="flex justify-between mb-2">
              <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest">
                {t('loadingGame')}
              </p>
              <p className="text-geo-primary text-xs font-headline font-bold tabular-nums">
                {Math.round(progress)}%
              </p>
            </div>
            <div className="h-3 bg-geo-surface-highest rounded-full overflow-hidden border border-geo-outline-dim/30">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-geo-primary-container to-geo-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
