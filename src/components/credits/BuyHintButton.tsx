'use client'

import { useAuth } from '@/lib/auth/context'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { CREDIT_REWARDS } from '@/lib/credits'
import { spendCredits } from '@/lib/credits-transaction'
import { playClick, playHintEarned } from '@/lib/sounds'

interface BuyHintButtonProps {
  onHintPurchased: () => void
}

export default function BuyHintButton({ onHintPurchased }: BuyHintButtonProps) {
  const { t } = useTranslation()
  const { user, isGuest, updateCredits } = useAuth()

  if (isGuest || !user) return null

  const cost = CREDIT_REWARDS.hint_cost
  const canAfford = user.credits >= cost

  async function handleBuy() {
    if (!canAfford || !user) return
    playClick()
    const ok = await spendCredits(user.id, cost, 'hint_purchase')
    if (ok) {
      updateCredits(-cost)
      playHintEarned()
      onHintPurchased()
    }
  }

  return (
    <button
      onClick={handleBuy}
      disabled={!canAfford}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-headline font-bold uppercase tracking-wider transition-all border ${
        canAfford
          ? 'bg-geo-tertiary/20 border-geo-tertiary text-geo-tertiary-bright hover:bg-geo-tertiary/30'
          : 'bg-geo-surface/40 border-geo-outline-dim/20 text-geo-on-surface-dim opacity-50 cursor-not-allowed'
      }`}
      title={!canAfford ? t('credits.notEnough' as keyof Translations) : undefined}
    >
      <span>💰</span>
      {t('credits.buyHint' as keyof Translations)} ({cost})
    </button>
  )
}
