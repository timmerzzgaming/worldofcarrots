'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'

interface FlagQuestionCardProps {
  flagUrl: string
  questionNumber: number
  totalQuestions: number
}

export default function FlagQuestionCard({
  flagUrl,
  questionNumber,
  totalQuestions,
}: FlagQuestionCardProps) {
  const { t } = useTranslation()
  const [imageError, setImageError] = useState(false)

  return (
    <motion.div
      key={flagUrl}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel px-2 py-1.5 sm:px-3 sm:py-2 text-center"
    >
      <p className="text-geo-on-surface-dim text-[10px] sm:text-xs font-headline font-bold uppercase tracking-widest mb-1">
        {questionNumber}/{totalQuestions}
      </p>

      <div className="relative w-24 h-16 sm:w-36 sm:h-24 mx-auto rounded-lg overflow-hidden border-2 border-geo-on-surface/30 bg-geo-surface-highest">
        {!imageError ? (
          <Image
            src={flagUrl}
            alt="Country flag"
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full text-geo-on-surface-dim text-xs font-body">
            {t('flagUnavailable')}
          </div>
        )}
      </div>
    </motion.div>
  )
}
