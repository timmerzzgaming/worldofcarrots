'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth/context'
import { getPlayerChests, openChest, chestTimeRemaining, formatChestTimer, type Chest, type ChestContents } from '@/lib/chests'
import { playCreditEarned } from '@/lib/sounds'
import ChestOpenAnimation from './ChestOpenAnimation'

const TIER_EMOJI: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' }
const TIER_BORDER: Record<string, string> = {
  bronze: 'border-orange-700/40',
  silver: 'border-gray-300/40',
  gold: 'border-yellow-400/40',
}

export default function ChestSlots() {
  const { user, isGuest, updateCredits, updateCarrots } = useAuth()
  const [chests, setChests] = useState<Chest[]>([])
  const [opening, setOpening] = useState<{ chestId: string; contents: ChestContents; tier: string } | null>(null)
  const [tick, setTick] = useState(0)

  const fetchChests = useCallback(async () => {
    if (!user) return
    const data = await getPlayerChests(user.id)
    setChests(data)
  }, [user])

  useEffect(() => { fetchChests() }, [fetchChests])

  // Timer tick every second for countdown display
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleOpen(chest: Chest) {
    if (!user || chestTimeRemaining(chest) > 0) return

    const contents = await openChest(user.id, chest.id)
    if (contents) {
      let totalCoins = contents.coins
      if (contents.continentBonus) totalCoins += contents.continentBonus.coins
      setOpening({ chestId: chest.id, contents, tier: chest.tier })
      updateCredits(totalCoins)
      if (contents.carrots > 0) updateCarrots(contents.carrots)
      playCreditEarned()
    }
  }

  function handleCloseAnimation() {
    setOpening(null)
    fetchChests()
  }

  if (isGuest || !user) return null

  const emptySlots = Math.max(0, 4 - chests.length)

  return (
    <>
      <div className="flex gap-2">
        {chests.map((chest) => {
          const remaining = chestTimeRemaining(chest)
          const isReady = remaining <= 0
          return (
            <motion.button
              key={chest.id}
              onClick={() => handleOpen(chest)}
              disabled={!isReady}
              className={`relative w-11 h-11 sm:w-20 sm:h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                TIER_BORDER[chest.tier]
              } ${
                isReady
                  ? 'bg-geo-surface-high/60 hover:bg-geo-surface-high cursor-pointer animate-pulse'
                  : 'bg-geo-surface/40 cursor-default'
              }`}
              whileTap={isReady ? { scale: 0.9 } : undefined}
              title={isReady ? `Open ${chest.tier} chest` : `Unlocks in ${formatChestTimer(remaining)}`}
            >
              <span className="text-xl sm:text-3xl">{TIER_EMOJI[chest.tier]}</span>
              {!isReady && (
                <span className="text-[8px] font-headline font-bold text-geo-on-surface-dim">
                  {formatChestTimer(remaining)}
                </span>
              )}
              {isReady && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-geo-primary animate-ping" />
              )}
            </motion.button>
          )
        })}
      </div>

      {opening && (
        <ChestOpenAnimation
          tier={opening.tier}
          contents={opening.contents}
          onClose={handleCloseAnimation}
        />
      )}
    </>
  )
}
