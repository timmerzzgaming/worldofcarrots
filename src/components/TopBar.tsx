'use client'

import UserBadge from '@/components/auth/UserBadge'
import SoundToggle from '@/components/SoundToggle'
import LanguageSelector from '@/components/LanguageSelector'
import ChestSlots from '@/components/credits/ChestSlots'

export default function TopBar() {
  return (
    <>
      {/* Top-right: User identity + currency + chests */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-3">
        <ChestSlots />
        <UserBadge />
      </div>

      {/* Bottom-right: Settings controls */}
      <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2">
        <SoundToggle />
        <LanguageSelector />
      </div>
    </>
  )
}
