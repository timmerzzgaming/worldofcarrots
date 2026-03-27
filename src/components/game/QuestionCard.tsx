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
      className="glass-panel px-10 py-6 text-center"
    >
      <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2">
        {questionNumber} {t('of')} {totalQuestions}
      </p>
      <p className="text-geo-on-surface text-2xl font-body">
        {t('find')} <span className="font-headline font-extrabold text-geo-primary text-glow-primary uppercase">{tc(countryName)}</span>
      </p>
    </motion.div>
  )
}
