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
    <>
      {/* Flag display — compact top-center panel */}
      <motion.div
        key={flagUrl}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel px-2 py-1.5 sm:px-3 sm:py-2 text-center"
      >
        <p className="text-geo-on-surface-dim text-[10px] sm:text-xs font-headline font-bold uppercase tracking-widest mb-1">
          {questionNumber}/{totalQuestions}
        </p>

        <div className="relative w-24 h-16 sm:w-36 sm:h-24 mx-auto rounded-lg overflow-hidden border-2 border-geo-on-surface/30 bg-geo-surface-highest">
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
            <div className="flex items-center justify-center h-full text-geo-on-surface-dim text-xs font-body">
              {t('flagUnavailable')}
            </div>
          )}
        </div>
      </motion.div>

      {/* Controls — right edge, vertically centered */}
      <div className="fixed right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10">
        <div className="glass-panel px-3 py-2 sm:px-4 sm:py-3 space-y-2 min-w-[160px]">
          {/* Continent hint */}
          <AnimatePresence>
            {hintLevel >= 1 && continentName && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <span className="inline-block px-3 py-1 rounded-full bg-geo-secondary/20 border-2 border-geo-secondary/40 text-geo-secondary text-xs font-headline font-bold uppercase">
                  {continentName}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint button + counter */}
          <div className="flex items-center gap-2">
            {canUseHint && (
              <button
                onClick={onUseHint}
                className="px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-headline font-bold uppercase tracking-wider transition-all border-2 bg-geo-tertiary/10 border-geo-tertiary/40 text-geo-on-surface hover:bg-geo-tertiary/20"
              >
                {nextHintLabel}
              </button>
            )}
            <span className={cn(
              'text-[10px] font-headline font-bold uppercase',
              hintsRemaining > 0 ? 'text-geo-tertiary' : 'text-geo-on-surface-dim',
            )}>
              {hintsRemaining} {hintsRemaining !== 1 ? t('hints') : t('hint')}
            </span>
          </div>

          {/* Skip */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-headline font-bold uppercase tracking-wider border-2 border-geo-outline/30 text-geo-on-surface-dim hover:text-geo-primary hover:border-geo-primary/40 transition-colors"
            >
              {t('skip')}
            </button>
            {skippedCount > 0 && (
              <span className="text-[10px] font-headline font-bold text-geo-on-surface-dim">
                {skippedCount} {t('skipped')}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
