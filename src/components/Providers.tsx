'use client'

import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/lib/auth/context'
import DailyLoginCheck from '@/components/credits/DailyLoginCheck'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <I18nProvider>
        {children}
        <DailyLoginCheck />
      </I18nProvider>
    </AuthProvider>
  )
}
