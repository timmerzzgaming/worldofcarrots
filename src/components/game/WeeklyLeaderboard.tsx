'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth/context'
import { getWeeklyLeaderboard, type LeaderboardEntry } from '@/lib/leaderboard'
import LevelBadge from '@/components/xp/LevelBadge'
import { cn } from '@/lib/cn'

const MODES = [
  { id: 'global', label: '🌍 Global' },
  { id: 'classic', label: 'Classic' },
  { id: 'timed', label: 'Timed' },
  { id: 'marathon', label: 'Marathon' },
  { id: 'survival', label: 'Survival' },
  { id: 'flag', label: 'Flag' },
  { id: 'distance', label: 'Distance' },
]

const RANK_COLORS = ['text-geo-tertiary-bright', 'text-gray-300', 'text-orange-400']

interface WeeklyLeaderboardProps {
  onClose: () => void
}

export default function WeeklyLeaderboard({ onClose }: WeeklyLeaderboardProps) {
  const { user } = useAuth()
  const [selectedMode, setSelectedMode] = useState('global')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const data = await getWeeklyLeaderboard(selectedMode)
    setEntries(data)
    setLoading(false)
  }, [selectedMode])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-geo-bg/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5 sm:p-8 w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
        style={{ minHeight: 'min(600px, 80vh)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-headline font-extrabold text-geo-on-surface uppercase tracking-wide">
            Weekly Leaderboard
          </h2>
          <button onClick={onClose} className="text-geo-on-surface-dim hover:text-geo-on-surface text-xl sm:text-2xl p-1">
            ✕
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5 sm:gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1" role="tablist">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={selectedMode === id}
              onClick={() => setSelectedMode(id)}
              className={cn(
                'px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-sm sm:text-base font-headline font-bold whitespace-nowrap transition-colors',
                selectedMode === id ? 'bg-geo-primary/20 text-geo-primary' : 'text-geo-on-surface-dim hover:text-geo-on-surface',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3">
          {loading ? (
            <p className="text-geo-on-surface-dim text-base sm:text-lg text-center py-16">Loading...</p>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24">
              <span className="text-5xl sm:text-6xl mb-4">🏆</span>
              <p className="text-geo-on-surface-dim text-lg sm:text-xl font-headline font-bold text-center mb-2">No entries this week yet</p>
              <p className="text-geo-on-surface-dim text-sm sm:text-base text-center">Play a game to claim the top spot!</p>
            </div>
          ) : (
            entries.map((entry, i) => {
              const isMe = user?.id === entry.user_id
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 rounded-xl',
                    isMe ? 'bg-geo-primary/10 border border-geo-primary/30' : 'bg-geo-surface-high/30',
                  )}
                >
                  <span className={cn(
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-headline font-extrabold',
                    i < 3 ? `${RANK_COLORS[i]} bg-geo-surface-highest border border-geo-outline-dim/30` : 'text-geo-on-surface-dim bg-geo-surface-highest border border-geo-outline-dim/20',
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-xl sm:text-2xl">{entry.avatar ?? '🌍'}</span>
                  {entry.level && <LevelBadge level={entry.level} />}
                  <span className={cn('flex-1 truncate font-body font-medium text-base sm:text-lg', isMe ? 'text-geo-primary' : 'text-geo-on-surface')}>
                    {entry.nickname ?? 'Unknown'}
                  </span>
                  <span className="text-sm sm:text-base font-headline font-bold text-geo-secondary">
                    {entry.total_xp_earned} XP
                  </span>
                  <span className="text-sm sm:text-base font-headline font-bold text-geo-tertiary-bright">
                    💰{entry.total_coins_earned}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}
