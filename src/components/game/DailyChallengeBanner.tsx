'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth/context'
import { getTodaysChallenge, hasCompletedToday, type DailyChallenge } from '@/lib/daily-challenge'

interface DailyChallengeBannerProps {
  onPlay: (mode: string, difficulty: string, seed: string) => void
}

export default function DailyChallengeBanner({ onPlay }: DailyChallengeBannerProps) {
  const { user, isGuest } = useAuth()
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [completed, setCompleted] = useState(false)
  const [hoursLeft, setHoursLeft] = useState(0)

  useEffect(() => {
    getTodaysChallenge().then(setChallenge)
  }, [])

  useEffect(() => {
    if (!user || isGuest) return
    hasCompletedToday(user.id).then(setCompleted)
  }, [user, isGuest])

  useEffect(() => {
    // Calculate hours until midnight UTC
    const now = new Date()
    const midnight = new Date(now)
    midnight.setUTCHours(24, 0, 0, 0)
    setHoursLeft(Math.ceil((midnight.getTime() - now.getTime()) / 3600000))
  }, [])

  if (!challenge) return null

  const modeLabel = challenge.mode.charAt(0).toUpperCase() + challenge.mode.slice(1)
  const diffLabel = challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-3 sm:p-4 border-2 border-geo-tertiary/30"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <p className="text-xs font-headline font-bold text-geo-tertiary-bright uppercase tracking-widest">
            Daily Challenge
          </p>
          <p className="text-sm font-body text-geo-on-surface mt-0.5">
            15 countries in 60 seconds
          </p>
          <p className="text-[10px] text-geo-on-surface-dim font-body">
            🏆 +{challenge.coin_reward} coins — Perfect: +🥕 — Resets in {hoursLeft}h
          </p>
        </div>
        <div>
          {completed ? (
            <span className="px-4 py-2 rounded-xl text-xs font-headline font-bold text-green-400 bg-green-400/10 border border-green-400/30">
              ✓ Done
            </span>
          ) : (
            <button
              onClick={() => onPlay(challenge.mode, challenge.difficulty, challenge.seed)}
              className="btn-primary px-5 py-2 text-sm"
            >
              Play
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
