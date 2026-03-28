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

export default function UserBadge() {
  const { t } = useTranslation()
  const router = useRouter()
  const { prefixPath } = useBasePath()
  const { user, isGuest, isAdmin, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  if (isGuest) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => { playClick(); setShowMenu(!showMenu) }}
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-geo-surface/60 backdrop-blur-xl border-2 border-geo-outline-dim/20 hover:border-geo-primary/30 transition-all"
      >
        <span className="text-2xl">{user!.avatar}</span>
        <LevelBadge level={user!.level} />
        <span className="text-sm font-headline font-bold text-geo-on-surface">{user!.nickname}</span>
        <span className="text-sm font-headline font-extrabold text-geo-tertiary-bright bg-geo-tertiary/10 px-2.5 py-0.5 rounded-full border border-geo-tertiary/30">
          💰 {user!.credits.toLocaleString()}
        </span>
        {user!.carrots > 0 && (
          <span className="text-sm font-headline font-extrabold text-orange-400 bg-orange-400/10 px-2.5 py-0.5 rounded-full border border-orange-400/30">
            🥕 {user!.carrots}
          </span>
        )}
      </button>

      {showMenu && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full right-0 mt-2 glass-panel p-3 min-w-[180px] z-50">
            <div className="text-xs text-geo-on-surface-dim font-body mb-3 px-3">
              {t('auth.credits' as keyof Translations)}: <span className="text-geo-tertiary-bright font-bold">{user!.credits}</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => { playClick(); setShowMenu(false); router.push(prefixPath('/admin')) }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-headline text-geo-primary hover:bg-geo-surface-high transition-colors mb-1"
              >
                ⚙️ Admin Dashboard
              </button>
            )}
            <button
              onClick={() => { playClick(); signOut(); setShowMenu(false) }}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-headline text-geo-on-surface-dim hover:bg-geo-surface-high hover:text-geo-error transition-colors"
            >
              {t('auth.signOut' as keyof Translations)}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
