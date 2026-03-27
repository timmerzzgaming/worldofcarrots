'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth/context'
import { getPlayerChests, chestTimeRemaining, formatChestTimer } from '@/lib/chests'
import { getUserWeeklyRank } from '@/lib/leaderboard'

/**
 * Post-game "come back tomorrow" banner.
 * Shows the most compelling retention hook: chest timer, leaderboard rank, or daily bonus.
 */
export default function RetentionBanner() {
  const { user, isGuest } = useAuth()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isGuest || !user) return

    async function check() {
      // Priority 1: chest unlocking soon
      const chests = await getPlayerChests(user!.id)
      const soonestChest = chests
        .map((c) => ({ ...c, remaining: chestTimeRemaining(c) }))
        .filter((c) => c.remaining > 0)
        .sort((a, b) => a.remaining - b.remaining)[0]

      if (soonestChest) {
        setMessage(`🎁 Chest unlocks in ${formatChestTimer(soonestChest.remaining)}`)
        return
      }

      // Priority 2: leaderboard position
      const { rank } = await getUserWeeklyRank(user!.id, 'global')
      if (rank > 0 && rank <= 20) {
        setMessage(`🏆 You're #${rank} on the weekly leaderboard!`)
        return
      }

      // Priority 3: generic encouragement
      setMessage('🔥 Play daily to build your streak!')
    }

    check()
  }, [user, isGuest])

  if (!message) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5 }}
      className="mt-3 px-4 py-2 rounded-xl bg-geo-surface/50 border border-geo-outline-dim/20 text-center"
    >
      <p className="text-xs font-body text-geo-on-surface-dim">{message}</p>
    </motion.div>
  )
}
