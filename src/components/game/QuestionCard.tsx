'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'

interface QuestionCardProps {
  countryName: string
  questionNumber: number
  totalQuestions: number
}

export default function QuestionCard({
  countryName,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  const { t, tc } = useTranslation()

  return (
    <motion.div
      key={countryName}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 2xl:px-10 2xl:py-6 text-center"
    >
      <p className="text-geo-on-surface-dim text-[10px] sm:text-xs 2xl:text-sm font-headline font-bold uppercase tracking-widest mb-0.5 sm:mb-1 2xl:mb-2">
        {questionNumber} {t('of')} {totalQuestions}
      </p>
      <p className="text-geo-on-surface text-base sm:text-lg lg:text-xl 2xl:text-2xl font-body">
        {t('find')} <span className="font-headline font-extrabold text-geo-primary text-glow-primary uppercase">{tc(countryName)}</span>
      </p>
    </motion.div>
  )
}
