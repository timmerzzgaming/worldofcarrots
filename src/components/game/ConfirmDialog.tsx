'use client'

import { useTranslation } from '@/lib/i18n'
import { playClick } from '@/lib/sounds'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-geo-bg/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="glass-panel p-6 max-w-xs w-full text-center">
        <p className="text-geo-on-surface font-headline font-extrabold text-lg uppercase mb-1">{title}</p>
        <p className="text-geo-on-surface-dim text-sm font-body mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => { playClick(); onCancel() }}
            className="btn-ghost flex-1 py-2.5 text-sm"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm ${
              confirmVariant === 'danger'
                ? 'btn-tactile bg-geo-error text-white border-b-4 border-geo-error-dim active:border-b-0'
                : 'btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
