'use client'

import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'
import type { LobbyPlayer } from '@/lib/multiplayer'

interface PlayerListProps {
  players: LobbyPlayer[]
  currentUserId: string
  hostId: string
  onKick?: (userId: string) => void
}

export default function PlayerList({ players, currentUserId, hostId, onKick }: PlayerListProps) {
  const { t } = useTranslation()
  const isHost = currentUserId === hostId

  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.user_id}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl transition-colors',
            player.is_spectator ? 'opacity-60' : '',
            player.user_id === currentUserId ? 'bg-geo-primary/10' : 'bg-geo-surface/50',
          )}
        >
          {/* Avatar */}
          <span className="text-2xl shrink-0" aria-hidden="true">{player.avatar}</span>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-geo-on-surface truncate text-base">
                {player.nickname}
              </span>
              {player.is_host && (
                <span className="text-xs bg-geo-primary text-black px-2 py-0.5 rounded-full font-headline font-bold uppercase">
                  HOST
                </span>
              )}
              {player.is_spectator && (
                <span className="text-xs bg-geo-outline text-geo-on-surface px-2 py-0.5 rounded-full font-headline font-bold uppercase">
                  {t('mp.spectating')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-geo-on-surface-dim">
              {!player.is_spectator && (
                <span className={cn(
                  'font-bold',
                  player.is_ready ? 'text-green-400' : 'text-geo-on-surface-dim',
                )}>
                  {player.is_ready ? t('mp.ready') : t('mp.notReady')}
                </span>
              )}
              {player.ping_ms > 0 && (
                <span>{t('mp.ping')}: {player.ping_ms}ms</span>
              )}
            </div>
          </div>

          {/* Kick button (host only, not self) */}
          {isHost && player.user_id !== currentUserId && !player.is_host && onKick && (
            <button
              onClick={() => onKick(player.user_id)}
              className="text-geo-error hover:text-red-400 transition-colors p-1 shrink-0"
              aria-label={`${t('mp.kick')} ${player.nickname}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
