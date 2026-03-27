'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'

interface FlagQuestionCardProps {
  flagUrl: string
  questionNumber: number
  totalQuestions: number
  hintsRemaining: number
  hintLevel: number // 0 = none used, 1 = continent shown, 2 = lookalikes eliminated, 3 = aggressive elimination
  continentName: string | null
  skippedCount: number
  onUseHint: () => void
  onSkip: () => void
}

const HINT_KEYS = [
  'hint.revealContinent',
  'hint.eliminateLookalikes',
  'hint.narrowDown',
] as const

export default function FlagQuestionCard({
  flagUrl,
  questionNumber,
  totalQuestions,
  hintsRemaining,
  hintLevel,
  continentName,
  skippedCount,
  onUseHint,
  onSkip,
}: FlagQuestionCardProps) {
  const { t } = useTranslation()
  const [imageError, setImageError] = useState(false)
  const nextHintLabel = hintLevel < 3 ? t(HINT_KEYS[hintLevel]) : null
  const canUseHint = hintsRemaining > 0 && hintLevel < 3

  return (
    <motion.div
      key={flagUrl}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel px-10 py-6 text-center max-w-md"
    >
      <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-3">
        {questionNumber} {t('of')} {totalQuestions} — {t('guessTheFlag')}
      </p>

      {/* Flag display */}
      <div className="relative w-72 h-48 mx-auto mb-4 rounded-lg overflow-hidden border-2 border-geo-outline-dim/30 shadow-lg bg-geo-surface-highest">
        {!imageError ? (
          <Image
            src={flagUrl}
            alt="Country flag"
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full text-geo-outline text-base font-body">
            {t('flagUnavailable')}
          </div>
        )}
      </div>

      <p className="text-geo-on-surface text-lg font-body mb-4">
        {t('clickCountryOnMap')}
      </p>

      {/* Continent hint display */}
      <AnimatePresence>
        {hintLevel >= 1 && continentName && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-geo-secondary/20 border border-geo-secondary/40 text-geo-secondary text-sm font-headline font-bold uppercase tracking-wider">
              {continentName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint button + counter */}
      <div className="flex items-center justify-center gap-4">
        {canUseHint && (
          <button
            onClick={onUseHint}
            className={cn(
              'px-5 py-2.5 rounded-full text-sm font-headline font-bold uppercase tracking-wider transition-all border-2',
              'bg-geo-tertiary/10 border-geo-tertiary/40 text-geo-tertiary hover:bg-geo-tertiary/20 hover:border-geo-tertiary/60',
            )}
          >
            {nextHintLabel}
          </button>
        )}
        <span className={cn(
          'text-xs font-headline font-bold uppercase tracking-widest',
          hintsRemaining > 0 ? 'text-geo-tertiary' : 'text-geo-outline',
        )}>
          {hintsRemaining} {hintsRemaining !== 1 ? t('hints') : t('hint')}
        </span>
      </div>

      {/* Skip button */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={onSkip}
          className="px-5 py-2 rounded-full text-sm font-headline font-bold uppercase tracking-wider transition-all border border-geo-outline-dim/30 text-geo-on-surface-dim hover:text-geo-secondary hover:border-geo-secondary/40"
        >
          {t('skip')}
        </button>
        {skippedCount > 0 && (
          <span className="text-xs font-headline font-bold uppercase tracking-widest text-geo-outline">
            {skippedCount} {t('skipped')}
          </span>
        )}
      </div>
    </motion.div>
  )
}
