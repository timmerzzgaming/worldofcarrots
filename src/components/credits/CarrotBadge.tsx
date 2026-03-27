'use client'

import { useAuth } from '@/lib/auth/context'

export default function CarrotBadge() {
  const { user, isGuest } = useAuth()

  if (isGuest || !user) return null

  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-headline font-bold text-orange-400">
      🥕 {user.carrots}
    </span>
  )
}
