'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'

interface ScoreDot {
  score: number
}

interface CityQuestionCardProps {
  cityName: string
  countryName: string
  showCountry: boolean
  questionNumber: number
  totalQuestions: number
  history?: ScoreDot[]
}

function dotStyle(score: number): React.CSSProperties {
  const s = Math.max(0, Math.min(100, score))
  let r: number, g: number, b: number
  if (s <= 50) {
    r = 239
    g = Math.round(68 + (187 * s) / 50)
    b = 68
  } else {
    r = Math.round(255 - (221 * (s - 50)) / 50)
    g = Math.round(197 + (58 * (s - 50)) / 50)
    b = Math.round(68 + (125 * (s - 50)) / 50)
  }
  return { backgroundColor: `rgb(${r},${g},${b})` }
}

export default function CityQuestionCard({
  cityName,
  countryName,
  showCountry,
  questionNumber,
  totalQuestions,
  history,
}: CityQuestionCardProps) {
  const { t, tc } = useTranslation()

  return (
    <motion.div
      key={cityName}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-geo-bg/90 backdrop-blur-md border-2 border-geo-outline-dim/40 rounded-3xl px-10 py-6 text-center shadow-xl"
    >
      <p className="text-geo-on-surface text-xs font-headline font-bold uppercase tracking-widest mb-2">
        {questionNumber} {t('of')} {totalQuestions}
      </p>
      <p className="text-white text-3xl font-body">
        {t('whereIs')} <span className="font-headline font-extrabold text-geo-primary text-glow-primary">{cityName}</span>
        {showCountry && <span className="text-geo-on-surface text-xl">, {tc(countryName)}</span>}
        <span className="text-white">?</span>
      </p>
      <p className="text-geo-on-surface-dim text-base font-body mt-3">
        {t('pinOnMap')}
      </p>

      {/* Progress dots */}
      {history && history.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {history.map((dot, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full"
              style={dotStyle(dot.score)}
              title={`${dot.score}/100`}
            />
          ))}
          {Array.from({ length: totalQuestions - history.length - 1 }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-3.5 h-3.5 rounded-full bg-geo-outline-dim/30"
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
