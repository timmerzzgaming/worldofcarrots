'use client'

import UserBadge from '@/components/auth/UserBadge'
import ChestSlots from '@/components/credits/ChestSlots'
import SettingsPanel from '@/components/SettingsPanel'

export default function TopBar() {
  return (
    <>
      {/* User identity — bottom center */}
      <div className="fixed bottom-2 sm:bottom-4 left-0 right-0 z-50 flex flex-col items-center pointer-events-none topbar-section">
        <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto">
          <ChestSlots />
        </div>
        <div className="pointer-events-auto mt-1">
          <UserBadge />
        </div>
      </div>

      {/* Settings cogwheel — bottom right */}
      <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 topbar-section">
        <SettingsPanel />
      </div>
    </>
  )
}
