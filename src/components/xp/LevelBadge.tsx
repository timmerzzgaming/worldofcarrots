'use client'

import { getRank } from '@/lib/xp'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { cn } from '@/lib/cn'

interface LevelBadgeProps {
  level: number
  size?: 'sm' | 'md'
  showTitle?: boolean
}

export default function LevelBadge({ level, size = 'sm', showTitle = false }: LevelBadgeProps) {
  const { t } = useTranslation()
  const rank = getRank(level)

  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-headline font-bold',
      size === 'sm' ? 'text-[10px]' : 'text-xs',
    )}>
      <span className={cn(
        'rounded-full flex items-center justify-center font-extrabold border',
        size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-xs',
        level >= 50 ? 'border-geo-primary/50 bg-geo-primary/20' :
        level >= 30 ? 'border-red-400/50 bg-red-400/10' :
        level >= 20 ? 'border-yellow-400/50 bg-yellow-400/10' :
        level >= 10 ? 'border-blue-400/50 bg-blue-400/10' :
        level >= 5  ? 'border-green-400/50 bg-green-400/10' :
                      'border-gray-400/50 bg-gray-400/10',
        rank.color,
      )}>
        {level}
      </span>
      {showTitle && (
        <span className={cn(rank.color, 'tracking-wide uppercase')}>
          {t(rank.titleKey as keyof Translations)}
        </span>
      )}
    </span>
  )
}
