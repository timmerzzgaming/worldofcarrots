'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'

export default function HurryUp() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.5 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [1.5, 1, 1, 0.8] }}
      transition={{ duration: 1.5, times: [0, 0.15, 0.7, 1] }}
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
      aria-live="assertive"
    >
      <p className="text-5xl font-headline font-extrabold uppercase text-geo-error text-glow-error drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)]">
        {t('hurryUp')}
      </p>
    </motion.div>
  )
}
