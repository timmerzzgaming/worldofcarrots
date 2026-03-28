'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import AuthModal from './AuthModal'
import { playClick } from '@/lib/sounds'
import LevelBadge from '@/components/xp/LevelBadge'
import { useBasePath } from '@/lib/basePath'
import { xpForLevel } from '@/lib/xp'

export default function UserBadge() {
  const { t } = useTranslation()
  const router = useRouter()
  const { prefixPath } = useBasePath()
  const { user, isGuest, isAdmin, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  if (isGuest) {
    return (
      <>
        <button
          onClick={() => { playClick(); setShowAuth(true) }}
          className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-geo-surface/60 backdrop-blur-xl border-2 border-geo-outline-dim/20 hover:border-geo-primary/30 transition-all"
        >
          <span className="text-lg">🌍</span>
          <span className="text-xs sm:text-sm font-headline font-bold text-geo-on-surface">{t('auth.signIn' as keyof Translations)}</span>
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    )
  }

  const xpForNext = xpForLevel(user!.level + 1)
  const xpForCurrent = xpForLevel(user!.level)
  const xpProgress = xpForNext > xpForCurrent ? Math.round(((user!.xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100) : 100

  return (
    <div className="relative">
      <button
        onClick={() => { playClick(); setShowMenu(!showMenu) }}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-geo-surface/60 backdrop-blur-xl border-2 border-geo-outline-dim/20 hover:border-geo-primary/30 transition-all"
      >
        <span className="text-xl sm:text-2xl">{user!.avatar}</span>
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-1.5">
            <LevelBadge level={user!.level} />
            <span className="text-xs sm:text-sm font-headline font-bold text-geo-on-surface">{user!.nickname}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs font-headline font-bold text-geo-tertiary-bright">
              💰{user!.credits.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs font-headline font-bold text-orange-400">
              🥕{user!.carrots}
            </span>
            <span className="text-[10px] sm:text-xs font-headline font-bold text-geo-secondary">
              ✨{user!.xp.toLocaleString()}
            </span>
          </div>
        </div>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full right-0 mt-2 glass-panel p-4 min-w-[220px] z-50">
            {/* Profile summary */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-geo-outline-dim/20">
              <span className="text-3xl">{user!.avatar}</span>
              <div>
                <p className="text-sm font-headline font-bold text-geo-on-surface">{user!.nickname}</p>
                <LevelBadge level={user!.level} showTitle />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-geo-outline-dim/20">
              <div className="text-center p-1.5 rounded-lg bg-geo-surface-high/30">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-geo-on-surface-dim">Coins</p>
                <p className="text-sm font-headline font-extrabold text-geo-tertiary-bright">💰 {user!.credits.toLocaleString()}</p>
              </div>
              <div className="text-center p-1.5 rounded-lg bg-geo-surface-high/30">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-geo-on-surface-dim">Carrots</p>
                <p className="text-sm font-headline font-extrabold text-orange-400">🥕 {user!.carrots}</p>
              </div>
              <div className="text-center p-1.5 rounded-lg bg-geo-surface-high/30">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-geo-on-surface-dim">XP</p>
                <p className="text-sm font-headline font-extrabold text-geo-secondary">✨ {user!.xp.toLocaleString()}</p>
              </div>
              <div className="text-center p-1.5 rounded-lg bg-geo-surface-high/30">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-geo-on-surface-dim">Games</p>
                <p className="text-sm font-headline font-extrabold text-geo-primary">{user!.games_completed}</p>
              </div>
            </div>

            {/* XP progress bar */}
            <div className="mb-3 pb-3 border-b border-geo-outline-dim/20">
              <div className="flex justify-between text-[10px] font-headline font-bold text-geo-on-surface-dim mb-1">
                <span>Lv {user!.level}</span>
                <span>Lv {user!.level + 1}</span>
              </div>
              <div className="h-2 bg-geo-surface-highest rounded-full overflow-hidden border border-geo-outline-dim/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-geo-secondary/80 to-geo-secondary"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <p className="text-[10px] font-headline text-geo-on-surface-dim mt-0.5 text-center">
                {(user!.xp - xpForCurrent).toLocaleString()} / {(xpForNext - xpForCurrent).toLocaleString()} XP
              </p>
            </div>

            {/* Actions */}
            {isAdmin && (
              <button
                onClick={() => { playClick(); setShowMenu(false); router.push(prefixPath('/admin')) }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-headline text-geo-primary hover:bg-geo-surface-high transition-colors mb-1"
              >
                ⚙️ Admin Dashboard
              </button>
            )}
            <button
              onClick={() => { playClick(); signOut(); setShowMenu(false) }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-headline text-geo-on-surface-dim hover:bg-geo-surface-high hover:text-geo-error transition-colors"
            >
              {t('auth.signOut' as keyof Translations)}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
