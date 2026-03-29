'use client'

import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'

interface PlayerScore {
  userId: string
  nickname: string
  avatar: string
  score: number
  answered: boolean
  isCorrect?: boolean
}

interface GameScoreboardProps {
  players: PlayerScore[]
  currentUserId: string
  round: number
  totalRounds: number
}

export default function GameScoreboard({ players, currentUserId, round, totalRounds }: GameScoreboardProps) {
  const { t } = useTranslation()

  // Sort by score descending
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="glass-panel p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-headline font-bold text-geo-on-surface text-sm uppercase">
          {t('mp.score')}
        </h3>
        <span className="text-xs text-geo-on-surface-dim font-headline font-bold">
          {t('mp.round')} {round}/{totalRounds}
        </span>
      </div>
      <div className="space-y-1.5">
        {sorted.map((player, i) => (
          <div
            key={player.userId}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm',
              player.userId === currentUserId ? 'bg-geo-primary/10' : '',
            )}
          >
            {/* Rank */}
            <span className="w-5 text-center font-headline font-bold text-geo-on-surface-dim text-xs">
              {i + 1}
            </span>
            {/* Avatar + name */}
            <span className="shrink-0">{player.avatar}</span>
            <span className="flex-1 truncate font-headline font-bold text-geo-on-surface text-xs">
              {player.nickname}
            </span>
            {/* Answer indicator */}
            {player.answered && (
              <span className={cn(
                'text-xs shrink-0',
                player.isCorrect === true ? 'text-green-400' : player.isCorrect === false ? 'text-geo-error' : 'text-geo-on-surface-dim',
              )} aria-hidden="true">
                {player.isCorrect === true ? '✓' : player.isCorrect === false ? '✗' : '·'}
              </span>
            )}
            {/* Score */}
            <span className="font-headline font-bold text-geo-primary text-xs tabular-nums shrink-0">
              {player.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
