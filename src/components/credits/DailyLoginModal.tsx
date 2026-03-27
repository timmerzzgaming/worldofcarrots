'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth/context'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { claimDailyLogin } from '@/lib/daily-login'
import { playCreditEarned, playLevelUp } from '@/lib/sounds'

interface DailyLoginModalProps {
  reward: number
  xpReward: number
  streakDay: number
  streakBonus: number
  streakXpBonus: number
  onClose: () => void
}

const DAY_LABELS = ['1', '2', '3', '4', '5', '6', '7']

export default function DailyLoginModal({ reward, xpReward, streakDay, streakBonus, streakXpBonus, onClose }: DailyLoginModalProps) {
  const { t } = useTranslation()
  const { user, updateCredits, updateXp } = useAuth()
  const [claimed, setClaimed] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const totalCoins = reward + streakBonus
  const totalXp = xpReward + streakXpBonus
  const currentDayIndex = (streakDay - 1) % 7

  async function handleClaim() {
    if (!user || claiming) return
    setClaiming(true)

    const result = await claimDailyLogin(user.id, user.xp)
    if (result) {
      updateCredits(result.totalCoins)
      updateXp(result.totalXp, result.newLevel)
      playCreditEarned()
      if (result.leveledUp) {
        setTimeout(playLevelUp, 500)
      }
    }

    setClaimed(true)
    setClaiming(false)
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-geo-bg/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass-panel p-6 max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-3xl mb-2">🌅</p>
        <h2 className="text-xl font-headline font-extrabold text-geo-on-surface uppercase mb-1">
          {t('daily.welcome' as keyof Translations)}
        </h2>
        <p className="text-geo-on-surface-dim text-sm font-body mb-4">
          {t('daily.streakCount' as keyof Translations)}: <span className="text-geo-tertiary-bright font-bold">🔥 {streakDay}</span>
        </p>

        {/* 7-day calendar */}
        <div className="flex justify-center gap-1.5 mb-5">
          {DAY_LABELS.map((label, i) => {
            const isPast = i < currentDayIndex
            const isCurrent = i === currentDayIndex
            return (
              <div
                key={i}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-headline font-bold border-2 transition-all ${
                  isCurrent
                    ? 'border-geo-tertiary-bright bg-geo-tertiary-bright/20 text-geo-tertiary-bright scale-110 shadow-[0_0_8px_rgba(254,208,27,0.4)]'
                    : isPast
                      ? 'border-geo-primary/40 bg-geo-primary/10 text-geo-primary'
                      : 'border-geo-outline-dim/30 bg-geo-surface text-geo-on-surface-dim'
                }`}
              >
                {isPast ? '✓' : label}
              </div>
            )
          })}
        </div>

        {/* Rewards preview */}
        <div className="glass-panel p-3 mb-4 space-y-1">
          <div className="flex justify-between text-sm font-body">
            <span className="text-geo-on-surface-dim">💰 Coins</span>
            <span className="text-geo-tertiary-bright font-bold">+{reward}</span>
          </div>
          <div className="flex justify-between text-sm font-body">
            <span className="text-geo-on-surface-dim">⚡ XP</span>
            <span className="text-geo-secondary font-bold">+{xpReward}</span>
          </div>
          {streakBonus > 0 && (
            <div className="flex justify-between text-sm font-body">
              <span className="text-geo-on-surface-dim">🔥 Streak Bonus</span>
              <span className="text-geo-primary font-bold">+{streakBonus} 💰</span>
            </div>
          )}
          {streakXpBonus > 0 && (
            <div className="flex justify-between text-sm font-body">
              <span className="text-geo-on-surface-dim">🔥 Streak XP</span>
              <span className="text-geo-primary font-bold">+{streakXpBonus} ⚡</span>
            </div>
          )}
          <div className="border-t border-geo-outline-dim/20 pt-1 flex justify-between text-sm font-headline font-extrabold">
            <span className="text-geo-on-surface">{t('credits.total' as keyof Translations)}</span>
            <span className="text-geo-tertiary-bright">+{totalCoins} 💰 +{totalXp} ⚡</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!claimed ? (
            <motion.button
              key="claim"
              onClick={handleClaim}
              disabled={claiming}
              className="btn-primary w-full py-3 text-base disabled:opacity-50"
              whileTap={{ scale: 0.95 }}
            >
              {claiming ? '...' : t('daily.claim' as keyof Translations)}
            </motion.button>
          ) : (
            <motion.p
              key="claimed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-geo-primary font-headline font-bold text-lg"
            >
              ✓ {t('daily.claimed' as keyof Translations)}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
