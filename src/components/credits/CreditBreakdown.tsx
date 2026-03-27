'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth/context'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import type { CreditBreakdown as BreakdownType } from '@/lib/credits'
import { playCreditEarned } from '@/lib/sounds'

interface CreditBreakdownProps {
  breakdown: BreakdownType
}

export default function CreditBreakdown({ breakdown }: CreditBreakdownProps) {
  const { t } = useTranslation()
  const { isGuest } = useAuth()
  const [displayTotal, setDisplayTotal] = useState(0)

  // Animated count-up
  useEffect(() => {
    if (breakdown.total <= 0) return
    if (isGuest) return

    let current = 0
    const step = Math.max(1, Math.ceil(breakdown.total / 30))
    const timer = setInterval(() => {
      current = Math.min(current + step, breakdown.total)
      setDisplayTotal(current)
      if (current >= breakdown.total) {
        clearInterval(timer)
        playCreditEarned()
      }
    }, 40)
    return () => clearInterval(timer)
  }, [breakdown.total, isGuest])

  const lines: { label: string; amount: number }[] = [
    { label: t('credits.base' as keyof Translations), amount: breakdown.base },
  ]
  if (breakdown.perCorrectBonus > 0) {
    lines.push({ label: t('credits.perCorrect' as keyof Translations), amount: breakdown.perCorrectBonus })
  }
  if (breakdown.starBonus > 0) {
    lines.push({ label: t('credits.starBonus' as keyof Translations), amount: breakdown.starBonus })
  }
  if (breakdown.streakBonus > 0) {
    lines.push({ label: t('credits.streakBonus' as keyof Translations), amount: breakdown.streakBonus })
  }
  if (breakdown.perfectBonus > 0) {
    lines.push({ label: t('credits.perfectBonus' as keyof Translations), amount: breakdown.perfectBonus })
  }
  if (breakdown.noHintsBonus > 0) {
    lines.push({ label: t('credits.noHintsBonus' as keyof Translations), amount: breakdown.noHintsBonus })
  }
  if (breakdown.speedBonus > 0) {
    lines.push({ label: t('credits.speedBonus' as keyof Translations), amount: breakdown.speedBonus })
  }

  return (
    <div className={`glass-panel p-4 ${isGuest ? 'opacity-60' : ''}`}>
      <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-geo-on-surface-dim mb-2">
        {t('credits.earned' as keyof Translations)}
      </p>
      <div className="space-y-1">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between text-xs font-body">
            <span className="text-geo-on-surface-dim">{line.label}</span>
            <span className="text-geo-primary font-bold">+{line.amount}</span>
          </div>
        ))}
        <div className="border-t border-geo-outline-dim/20 pt-1 flex justify-between text-sm font-headline font-extrabold">
          <span className="text-geo-on-surface">💰 {t('credits.total' as keyof Translations)}</span>
          <motion.span
            className="text-geo-tertiary-bright"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ delay: 1, duration: 0.3 }}
          >
            +{isGuest ? breakdown.total : displayTotal}
          </motion.span>
        </div>
      </div>
      {isGuest && (
        <p className="text-[10px] text-geo-on-surface-dim font-body mt-2 text-center italic">
          {t('credits.signUpToEarn' as keyof Translations)}
        </p>
      )}
    </div>
  )
}
