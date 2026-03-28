'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playCountdownTick, playCountdownGo } from '@/lib/sounds'

interface CountdownProps {
  onComplete: () => void
}

const STEPS = ['3', '2', '1', 'GO!']
const STEP_DURATION = 700

export default function Countdown({ onComplete }: CountdownProps) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step < STEPS.length) {
      if (step < STEPS.length - 1) {
        playCountdownTick()
      } else {
        playCountdownGo()
      }
      const timer = setTimeout(() => setStep((s) => s + 1), STEP_DURATION)
      return () => clearTimeout(timer)
    } else {
      onComplete()
    }
  }, [step, onComplete])

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {step < STEPS.length && (
          <motion.p
            key={step}
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`font-headline font-extrabold uppercase drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] ${
              step === STEPS.length - 1
                ? 'text-7xl text-geo-primary text-glow-primary'
                : 'text-8xl text-geo-on-surface'
            }`}
            aria-live="assertive"
          >
            {STEPS[step]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
