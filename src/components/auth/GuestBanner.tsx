'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import AuthModal from './AuthModal'
import { playClick } from '@/lib/sounds'

export default function GuestBanner() {
  const { isGuest } = useAuth()
  const { t } = useTranslation()
  const [showAuth, setShowAuth] = useState(false)

  if (!isGuest) return null

  return (
    <>
      <div className="glass-panel px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-headline font-bold text-geo-on-surface uppercase">
            {t('auth.guestBannerTitle' as keyof Translations)}
          </p>
          <p className="text-[10px] text-geo-on-surface-dim font-body">
            {t('auth.guestBannerDesc' as keyof Translations)}
          </p>
        </div>
        <button
          onClick={() => { playClick(); setShowAuth(true) }}
          className="btn-primary px-4 py-1.5 text-xs flex-shrink-0"
        >
          {t('auth.signUp' as keyof Translations)}
        </button>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
