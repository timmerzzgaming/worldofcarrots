'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { checkDailyLogin } from '@/lib/daily-login'
import DailyLoginModal from './DailyLoginModal'

/**
 * Checks for daily login bonus when user is authenticated.
 * Renders DailyLoginModal if bonus is available.
 * Place this component inside AuthProvider.
 */
export default function DailyLoginCheck() {
  const { user, isGuest, isLoading } = useAuth()
  const [loginData, setLoginData] = useState<{
    reward: number
    xpReward: number
    streakDay: number
    streakBonus: number
    streakXpBonus: number
  } | null>(null)
  const checked = useRef(false)

  useEffect(() => {
    if (isLoading || isGuest || !user || checked.current) return
    checked.current = true

    checkDailyLogin(user.id).then((result) => {
      if (result?.isNewDay) {
        setLoginData({
          reward: result.reward,
          xpReward: result.xpReward,
          streakDay: result.streakDay,
          streakBonus: result.streakBonus,
          streakXpBonus: result.streakXpBonus,
        })
      }
    })
  }, [user, isGuest, isLoading])

  if (!loginData) return null

  return (
    <DailyLoginModal
      reward={loginData.reward}
      xpReward={loginData.xpReward}
      streakDay={loginData.streakDay}
      streakBonus={loginData.streakBonus}
      streakXpBonus={loginData.streakXpBonus}
      onClose={() => setLoginData(null)}
    />
  )
}
