'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChestContents } from '@/lib/chests'
import { COUNTRY_TO_CONTINENT } from '@/lib/stickers'

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

const CONTINENT_EMOJI: Record<string, string> = {
  Africa: '🌍',
  Asia: '🌏',
  Europe: '🌍',
  'North America': '🌎',
  'South America': '🌎',
  Oceania: '🌏',
}

export default function ChestOpenAnimation({ tier, contents, onClose }: ChestOpenAnimationProps) {
  const [phase, setPhase] = useState<'shake' | 'reveal' | 'stickers' | 'done'>('shake')

  const hasStickers = contents.stickers && contents.stickers.length > 0
  const hasContinentBonus = !!contents.continentBonus

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 800)
    const t2 = setTimeout(() => setPhase(hasStickers ? 'stickers' : 'done'), 2200)
    const t3 = hasStickers ? setTimeout(() => setPhase('done'), hasContinentBonus ? 5500 : 4200) : null
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (t3) clearTimeout(t3)
    }
  }, [hasStickers, hasContinentBonus])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-geo-bg/80 backdrop-blur-sm"
      onClick={phase === 'done' ? onClose : undefined}
      role="dialog"
      aria-label="Chest opening"
    >
      <div className="text-center max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
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

          {phase === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
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

                {hasStickers && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center justify-center gap-2 text-base font-headline font-bold text-geo-secondary"
                  >
                    🗺️ +{contents.stickers.length} sticker{contents.stickers.length > 1 ? 's' : ''}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'stickers' && hasStickers && (
            <motion.div
              key="stickers"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-panel p-6 min-w-[240px]"
            >
              <p className="text-sm font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest mb-3">
                New Stickers!
              </p>

              <div className="space-y-3">
                {contents.stickers.map((country, i) => {
                  const continent = COUNTRY_TO_CONTINENT[country] ?? ''
                  const emoji = CONTINENT_EMOJI[continent] ?? '🌍'
                  return (
                    <motion.div
                      key={country}
                      initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40, scale: 0.5 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{
                        delay: 0.3 * i,
                        type: 'spring',
                        stiffness: 400,
                        damping: 15,
                      }}
                      className="glass-panel px-4 py-3 border-geo-primary"
                    >
                      <div className="flex items-center gap-3">
                        <motion.span
                          className="text-3xl"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ delay: 0.3 * i + 0.2, duration: 0.4 }}
                        >
                          {emoji}
                        </motion.span>
                        <div className="text-left">
                          <p className="font-headline font-extrabold text-geo-on-surface text-base leading-tight">
                            {country}
                          </p>
                          <p className="text-geo-on-surface-dim text-xs font-body">
                            {continent}
                          </p>
                        </div>
                        <motion.span
                          className="ml-auto text-2xl"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.3 * i + 0.4, type: 'spring', stiffness: 500 }}
                        >
                          ⭐
                        </motion.span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Continent completion bonus */}
              {hasContinentBonus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: contents.stickers.length * 0.3 + 0.5,
                    type: 'spring',
                    stiffness: 300,
                  }}
                  className="mt-4 glass-panel p-4 border-geo-tertiary bg-geo-tertiary/10"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <p className="text-2xl">🏆</p>
                  </motion.div>
                  <p className="font-headline font-extrabold text-geo-tertiary text-sm uppercase tracking-wide mt-1">
                    {contents.continentBonus!.continent} Complete!
                  </p>
                  <p className="font-headline font-extrabold text-2xl text-geo-on-surface mt-1">
                    +{contents.continentBonus!.coins} 💰
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.button
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                onClick={onClose}
                className="btn-primary px-8 py-2"
              >
                OK
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
