'use client'

import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'
import type { GameMode } from '@/types/game'

interface ScoreBoardProps {
  mode: GameMode
  score: number
  timeRemaining: number
  maxTime: number
  currentIndex: number
  totalQuestions: number
  lives?: number
  streak?: number
  elapsed?: number
  correctCount?: number
}

export default function ScoreBoard({
  mode,
  score,
  timeRemaining,
  maxTime,
  currentIndex,
  totalQuestions,
  lives = 3,
  streak = 0,
  elapsed = 0,
  correctCount = 0,
}: ScoreBoardProps) {
  const { t } = useTranslation()
  const hasTimer = maxTime > 0
  const timePercent = hasTimer ? (timeRemaining / maxTime) * 100 : 0
  const urgent = hasTimer && timePercent < 25

  return (
    <div className="glass-panel px-5 py-3 flex items-center gap-5">
      {/* Score */}
      <div>
        <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest">
          {mode === 'timed' ? t('found') : t('score')}
        </p>
        <p className="text-geo-primary text-2xl font-headline font-extrabold tabular-nums text-glow-primary">
          {mode === 'timed' ? correctCount : score.toLocaleString()}
        </p>
      </div>

      {/* Lives (survival / borderless / flag) */}
      {(mode === 'survival' || mode === 'borderless' || mode === 'flag') && (
        <div>
          <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest">{t('lives')}</p>
          <p className="text-geo-error text-2xl font-headline font-extrabold tabular-nums">
            {'♥'.repeat(lives)}
            <span className="text-geo-outline">{'♡'.repeat(Math.max(0, 3 - lives))}</span>
          </p>
        </div>
      )}

      {/* Progress (marathon/survival/flag) */}
      {(mode === 'marathon' || mode === 'survival' || mode === 'flag') && (
        <div>
          <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest">{t('progress')}</p>
          <p className="text-geo-secondary text-lg font-headline font-extrabold tabular-nums">
            {currentIndex + 1}/{totalQuestions}
          </p>
        </div>
      )}

      {/* Timer */}
      {hasTimer && (
        <div className="flex-1 min-w-[100px]">
          <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-1">{t('time')}</p>
          <div className="h-3 bg-geo-surface-highest rounded-full overflow-hidden border border-geo-outline-dim/30">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-100',
                urgent ? 'bg-gradient-to-r from-geo-error-dim to-geo-error' : 'bg-gradient-to-r from-geo-primary-container to-geo-primary'
              )}
              style={{ width: `${timePercent}%` }}
            />
          </div>
          <p className={cn(
            'text-sm font-headline font-bold mt-0.5 tabular-nums',
            urgent ? 'text-geo-error text-glow-error' : 'text-geo-on-surface-dim'
          )}>
            {timeRemaining.toFixed(1)}s
          </p>
        </div>
      )}

      {/* Elapsed (marathon) */}
      {!hasTimer && mode === 'marathon' && (
        <div>
          <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest">{t('time')}</p>
          <p className="text-geo-on-surface text-lg font-headline font-extrabold tabular-nums">
            {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, '0')}
          </p>
        </div>
      )}

      {/* Streak (survival / borderless / flag) */}
      {(mode === 'survival' || mode === 'borderless' || mode === 'flag') && streak >= 2 && (
        <div>
          <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest">{t('streak')}</p>
          <p className="text-geo-tertiary text-lg font-headline font-extrabold tabular-nums text-glow-tertiary">{streak}</p>
        </div>
      )}
    </div>
  )
}
