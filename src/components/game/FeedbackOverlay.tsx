'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { getFlagUrl } from '@/lib/flagHints'

interface FeedbackOverlayProps {
  correct: boolean
  countryName: string
  isoA3: string
  selectedCountry: string | null
  score: number
  delay?: number
  onContinue: () => void
}

export default function FeedbackOverlay({
  correct,
  countryName,
  isoA3,
  selectedCountry,
  score,
  delay = 1000,
  onContinue,
}: FeedbackOverlayProps) {
  const { t, tc } = useTranslation()
  const flagSrc = correct ? getFlagUrl(countryName, isoA3) : null

  useEffect(() => {
    const timer = setTimeout(onContinue, delay)
    return () => clearTimeout(timer)
  }, [onContinue, delay])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`glass-panel px-4 py-3 sm:px-8 sm:py-5 lg:px-10 lg:py-7 text-center ${
        correct
          ? 'border-geo-primary/40 shadow-[0_0_30px_-5px_rgba(107,255,193,0.3)]'
          : 'border-geo-error/40 shadow-[0_0_30px_-5px_rgba(255,113,108,0.3)]'
      }`}
    >
      {correct ? (
        <>
          <p className="text-geo-primary text-xl sm:text-2xl lg:text-3xl font-headline font-extrabold uppercase text-glow-primary">
            {t('correct')}
          </p>
          <p className="text-geo-on-surface text-base sm:text-lg lg:text-xl font-headline font-bold mt-1 sm:mt-2">{tc(countryName)}</p>
          {flagSrc && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative w-20 h-14 sm:w-24 sm:h-16 lg:w-28 lg:h-20 mx-auto mt-2 sm:mt-3 rounded overflow-hidden border border-geo-outline-dim/30 shadow"
            >
              <Image src={flagSrc} alt={countryName} fill className="object-cover" />
            </motion.div>
          )}
          <p className="text-geo-primary-dim mt-2 sm:mt-3 text-base sm:text-lg font-headline font-bold">+{score} {t('pts')}</p>
        </>
      ) : (
        <>
          <p className="text-geo-error text-xl sm:text-2xl lg:text-3xl font-headline font-extrabold uppercase text-glow-error">
            {t('wrong')}
          </p>
          {selectedCountry && (
            <p className="text-geo-on-surface-dim mt-2 text-base font-body">
              {t('youClicked')} <span className="text-geo-error font-bold">{tc(selectedCountry)}</span>
            </p>
          )}
          <p className="text-geo-on-surface mt-2 text-base font-body">
            {t('answer')} <span className="font-headline font-extrabold text-geo-secondary text-glow-secondary">{tc(countryName)}</span>
          </p>
        </>
      )}
    </motion.div>
  )
}
