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
        className="glass-panel p-4 sm:p-6 max-w-lg w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-headline font-extrabold text-geo-on-surface uppercase">
            Weekly Leaderboard
          </h2>
          <button onClick={onClose} className="text-geo-on-surface-dim hover:text-geo-on-surface text-sm">
            ✕
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1" role="tablist">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={selectedMode === id}
              onClick={() => setSelectedMode(id)}
              className={cn(
                'px-2.5 py-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-headline font-bold whitespace-nowrap transition-colors',
                selectedMode === id ? 'bg-geo-primary/20 text-geo-primary' : 'text-geo-on-surface-dim hover:text-geo-on-surface',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {loading ? (
            <p className="text-geo-on-surface-dim text-sm text-center py-8">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-geo-on-surface-dim text-sm text-center py-8">No entries this week yet. Play a game!</p>
          ) : (
            entries.map((entry, i) => {
              const isMe = user?.id === entry.user_id
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
                    isMe ? 'bg-geo-primary/10 border border-geo-primary/30' : 'bg-geo-surface-high/30',
                  )}
                >
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-headline font-extrabold',
                    i < 3 ? `${RANK_COLORS[i]} bg-geo-surface-highest border border-geo-outline-dim/30` : 'text-geo-on-surface-dim bg-geo-surface-highest border border-geo-outline-dim/20',
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-lg">{entry.avatar ?? '🌍'}</span>
                  {entry.level && <LevelBadge level={entry.level} />}
                  <span className={cn('flex-1 truncate font-body font-medium', isMe ? 'text-geo-primary' : 'text-geo-on-surface')}>
                    {entry.nickname ?? 'Unknown'}
                  </span>
                  <span className="text-xs font-headline font-bold text-geo-secondary">
                    {entry.total_xp_earned} XP
                  </span>
                  <span className="text-xs font-headline font-bold text-geo-tertiary-bright">
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
