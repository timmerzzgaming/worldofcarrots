'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChestContents } from '@/lib/chests'

interface ChestOpenAnimationProps {
  tier: string
  contents: ChestContents
  onClose: () => void
}

const TIER_EMOJI: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' }
const TIER_LABEL: Record<string, string> = { bronze: 'Bronze Chest', silver: 'Silver Chest', gold: 'Gold Chest' }
const TIER_COLOR: Record<string, string> = {
  bronze: 'text-orange-400',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
}

export default function ChestOpenAnimation({ tier, contents, onClose }: ChestOpenAnimationProps) {
  const [phase, setPhase] = useState<'shake' | 'reveal' | 'done'>('shake')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 800)
    const t2 = setTimeout(() => setPhase('done'), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-geo-bg/80 backdrop-blur-sm"
      onClick={phase === 'done' ? onClose : undefined}
    >
      <div className="text-center" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          {phase === 'shake' && (
            <motion.div
              key="shake"
              animate={{
                rotate: [0, -5, 5, -5, 5, -3, 3, 0],
                scale: [1, 1.05, 1.05, 1.1, 1.1, 1.15, 1.15, 1.2],
              }}
              transition={{ duration: 0.8 }}
              className="text-8xl"
            >
              {TIER_EMOJI[tier]}
            </motion.div>
          )}

          {(phase === 'reveal' || phase === 'done') && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-8 min-w-[240px]"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-5xl mb-2">✨</p>
                <p className={`text-lg font-headline font-extrabold uppercase ${TIER_COLOR[tier]}`}>
                  {TIER_LABEL[tier]}
                </p>
              </motion.div>

              <div className="mt-4 space-y-2">
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 text-xl font-headline font-extrabold text-geo-tertiary-bright"
                >
                  💰 +{contents.coins}
                </motion.div>

                {contents.carrots > 0 && (
                  <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 text-xl font-headline font-extrabold text-orange-400"
                  >
                    🥕 +{contents.carrots}
                  </motion.div>
                )}
              </div>

              {phase === 'done' && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={onClose}
                  className="btn-primary mt-5 px-8 py-2"
                >
                  OK
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
