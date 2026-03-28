'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'

interface DistanceFeedbackProps {
  rawDistanceKm: number
  score: number
  unit: 'km' | 'mi'
  cityName: string
  countryName: string
  multiplier: number
  delay?: number
  onContinue: () => void
}

function formatDist(km: number, unit: 'km' | 'mi'): string {
  const val = unit === 'mi' ? km * 0.621371 : km
  return `${Math.round(val).toLocaleString()} ${unit}`
}

/** Returns an inline RGB color interpolated from red (0) → yellow (50) → green (100) */
function scoreToColor(score: number): string {
  const s = Math.max(0, Math.min(100, score))
  if (s <= 50) {
    // red → yellow
    const r = 239
    const g = Math.round(68 + (187 * s) / 50) // 68 → 255
    const b = 68
    return `rgb(${r},${g},${b})`
  }
  // yellow → green
  const r = Math.round(255 - (221 * (s - 50)) / 50) // 255 → 34
  const g = Math.round(197 + (58 * (s - 50)) / 50) // 197 → 255
  const b = Math.round(68 + (125 * (s - 50)) / 50) // 68 → 193
  return `rgb(${r},${g},${b})`
}

function getShoutout(score: number): { text: string; animation: 'bounce' | 'pulse' | 'none' } | null {
  if (score === 100) return { text: 'PERFECT!', animation: 'bounce' }
  if (score >= 95) return { text: 'OUTSTANDING!', animation: 'bounce' }
  if (score >= 85) return { text: 'EXCELLENT!', animation: 'pulse' }
  if (score >= 70) return { text: 'GREAT!', animation: 'pulse' }
  if (score >= 50) return { text: 'NICE!', animation: 'none' }
  return null
}

export default function DistanceFeedback({
  rawDistanceKm,
  score,
  unit,
  cityName,
  countryName,
  multiplier,
  delay = 1000,
  onContinue,
}: DistanceFeedbackProps) {
  const { tc } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(onContinue, delay)
    return () => clearTimeout(timer)
  }, [onContinue, delay])

  const color = scoreToColor(score)
  const borderColor = score >= 50
    ? 'border-geo-primary/40 shadow-[0_0_30px_-5px_rgba(107,255,193,0.3)]'
    : score >= 15
      ? 'border-geo-tertiary/40 shadow-[0_0_30px_-5px_rgba(255,224,131,0.3)]'
      : 'border-geo-error/40 shadow-[0_0_30px_-5px_rgba(255,113,108,0.3)]'

  const correctionLabel = multiplier < 0.99
    ? `${Math.round((1 - multiplier) * 100)}% discount`
    : multiplier > 1.01
      ? `${Math.round((multiplier - 1) * 100)}% penalty`
      : null
  const correctionColor = multiplier < 0.99 ? 'text-geo-primary' : multiplier > 1.5 ? 'text-geo-error' : 'text-geo-tertiary'
  const shoutout = getShoutout(score)

  return (
    <div className="relative">
      {/* Shoutout — animated above the card */}
      {shoutout && (
        <motion.p
          initial={{ opacity: 0, y: 20, scale: 0.5 }}
          animate={{ opacity: 1, y: -10, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 12 }}
          className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 font-headline font-extrabold text-2xl sm:text-3xl uppercase tracking-wider whitespace-nowrap drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]"
          style={{ color }}
        >
          <motion.span
            animate={
              shoutout.animation === 'bounce'
                ? { y: [0, -8, 0], scale: [1, 1.1, 1] }
                : shoutout.animation === 'pulse'
                  ? { scale: [1, 1.05, 1] }
                  : {}
            }
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="inline-block"
          >
            {shoutout.text}
          </motion.span>
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`bg-geo-bg/90 backdrop-blur-md border-2 border-geo-outline-dim/40 rounded-2xl sm:rounded-3xl px-5 py-3 sm:px-8 sm:py-5 text-center shadow-xl ${borderColor}`}
      >
        <p className="text-white font-body text-lg mb-1">
          {cityName}, {tc(countryName)}
        </p>

        {/* Raw distance */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-geo-on-surface text-base font-headline font-bold"
        >
          {formatDist(rawDistanceKm, unit)} off
        </motion.p>

        {/* Size correction */}
        {correctionLabel && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={`text-sm font-headline font-bold mt-1 ${correctionColor}`}
          >
            size correction: <span className="font-extrabold">&times;{multiplier.toFixed(2)}</span> ({correctionLabel})
          </motion.p>
        )}

        {/* Final score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-2"
        >
          <p className="text-geo-on-surface text-xs font-headline font-bold uppercase tracking-widest">Final Score</p>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-headline font-extrabold" style={{ color }}>
            {score}<span className="text-base sm:text-lg lg:text-xl opacity-60">/100</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
