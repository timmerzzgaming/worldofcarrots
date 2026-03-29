'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'
import { getFlagUrl } from '@/lib/flagHints'
import type { MultiQuestion as MultiQuestionType } from '@/lib/multiplayer'

interface MultiQuestionProps {
  question: MultiQuestionType
  timeRemaining: number
  onTimeout: () => void
}

export default function MultiQuestion({ question, timeRemaining, onTimeout }: MultiQuestionProps) {
  const { t, tc } = useTranslation()
  const progress = Math.max(0, Math.min(100, (timeRemaining / (question.timeLimit * 1000)) * 100))

  // Trigger timeout when time runs out
  useEffect(() => {
    if (timeRemaining <= 0) onTimeout()
  }, [timeRemaining, onTimeout])

  const flagUrl = question.type === 'flag' && question.isoA3
    ? getFlagUrl(question.prompt, question.isoA3)
    : null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${question.type}-${question.prompt}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="glass-panel p-4 sm:p-5"
      >
        {/* Timer bar */}
        <div className="h-1.5 bg-geo-surface rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-200',
              progress > 30 ? 'bg-geo-primary' : progress > 10 ? 'bg-yellow-400' : 'bg-geo-error',
            )}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(timeRemaining / 1000)}
            aria-valuemin={0}
            aria-valuemax={question.timeLimit}
            aria-label="Time remaining"
          />
        </div>

        {/* Question content */}
        <div className="text-center">
          {question.type === 'flag' && flagUrl && (
            <div className="mb-3">
              <img
                src={flagUrl}
                alt="Flag to identify"
                className="mx-auto h-16 sm:h-20 rounded-md shadow-md border border-geo-outline/20"
              />
            </div>
          )}

          {question.type === 'country' && (
            <p className="text-xs text-geo-on-surface-dim mb-1 uppercase font-headline">
              {t('find')}
            </p>
          )}

          {question.type === 'distance' && (
            <p className="text-xs text-geo-on-surface-dim mb-1 uppercase font-headline">
              {t('whereIs')}
            </p>
          )}

          <h2 className="text-xl sm:text-2xl font-headline font-extrabold text-geo-on-surface">
            {question.type === 'country' ? tc(question.prompt) : question.prompt}
          </h2>

          <p className="text-xs text-geo-on-surface-dim mt-2 font-headline uppercase">
            {question.type === 'flag' && t('clickCountryOnMap')}
            {question.type === 'country' && t('clickCountryOnMap')}
            {question.type === 'distance' && t('pinOnMap')}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
