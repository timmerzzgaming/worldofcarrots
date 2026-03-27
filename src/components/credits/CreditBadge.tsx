'use client'

import { useAuth } from '@/lib/auth/context'

export default function CreditBadge() {
  const { user, isGuest } = useAuth()
  if (isGuest || !user) return null

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-geo-surface/60 backdrop-blur-xl border border-geo-outline-dim/20">
      <span className="text-sm">💰</span>
      <span className="text-xs font-headline font-bold text-geo-tertiary-bright">{user.credits}</span>
    </div>
  )
}
