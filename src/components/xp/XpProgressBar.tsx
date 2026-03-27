'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { xpToNextLevel, levelProgress, getRank } from '@/lib/xp'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { cn } from '@/lib/cn'

interface XpProgressBarProps {
  totalXp: number
  level: number
  xpEarned: number
  leveledUp: boolean
  newLevel: number
}

export default function XpProgressBar({ totalXp, level, xpEarned, leveledUp, newLevel }: XpProgressBarProps) {
  const { t } = useTranslation()
  const [showLevelUp, setShowLevelUp] = useState(false)

  const displayLevel = leveledUp ? newLevel : level
  const progress = levelProgress(totalXp, displayLevel)
  const toNext = xpToNextLevel(displayLevel)
  const rank = getRank(displayLevel)

  useEffect(() => {
    if (leveledUp) {
      const timer = setTimeout(() => setShowLevelUp(true), 800)
      return () => clearTimeout(timer)
    }
  }, [leveledUp])

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-geo-on-surface-dim">
          {t('xp.earned' as keyof Translations)}
        </p>
        <motion.span
          className="text-sm font-headline font-extrabold text-geo-secondary text-glow-secondary"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          +{xpEarned} XP
        </motion.span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 rounded-full bg-geo-surface-high/50 border border-geo-outline-dim/20 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-geo-secondary to-blue-400"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(progress * 100, 100)}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className={cn('text-[10px] font-headline font-bold', rank.color)}>
          Lv.{displayLevel} {t(rank.titleKey as keyof Translations)}
        </span>
        <span className="text-[10px] font-body text-geo-on-surface-dim">
          {toNext > 0 ? `${Math.round(progress * toNext)}/${toNext}` : 'MAX'}
        </span>
      </div>

      {/* Level up celebration */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 p-3 rounded-xl bg-geo-secondary/10 border border-geo-secondary/30 text-center"
          >
            <p className="text-lg font-headline font-extrabold text-geo-secondary text-glow-secondary uppercase">
              {t('xp.levelUp' as keyof Translations)}
            </p>
            <p className={cn('text-sm font-headline font-bold', getRank(newLevel).color)}>
              Lv.{newLevel} — {t(getRank(newLevel).titleKey as keyof Translations)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
