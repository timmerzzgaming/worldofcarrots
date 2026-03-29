'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth/context'
import { useTranslation } from '@/lib/i18n'
import { useBasePath } from '@/lib/basePath'
import { spendCarrots } from '@/lib/carrots'
import { logCreditTransaction } from '@/lib/credits-transaction'
import { playClick } from '@/lib/sounds'
import {
  playDrumRoll,
  playOmNomNom,
  playCoinShower,
  playJackpot,
  playReveal,
  playSmallWin,
  startCasinoMusic,
  stopCasinoMusic,
} from '@/lib/casinoSounds'

type Animal = 'rabbit' | 'horse' | 'donkey' | 'pig'
type Phase = 'pick' | 'feeding' | 'reveal' | 'result'

interface AnimalData {
  id: Animal
  name: string
  emoji: string
  img: string
  color: string
  bgColor: string
  borderColor: string
}

const ANIMALS: AnimalData[] = [
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', img: '/images/animals/rabbit.svg', color: '#F5F0E8', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
  { id: 'horse', name: 'Horse', emoji: '🐴', img: '/images/animals/horse.svg', color: '#C4956A', bgColor: 'bg-amber-50', borderColor: 'border-amber-400' },
  { id: 'donkey', name: 'Donkey', emoji: '🫏', img: '/images/animals/donkey.svg', color: '#9E9E9E', bgColor: 'bg-gray-50', borderColor: 'border-gray-400' },
  { id: 'pig', name: 'Pig', emoji: '🐷', img: '/images/animals/pig.svg', color: '#FFB6C1', bgColor: 'bg-pink-50', borderColor: 'border-pink-300' },
]

const JACKPOT_AMOUNT = 500
const MIN_AMOUNT = 25
const MAX_NORMAL = 200

function generatePrizes(): Map<Animal, number> {
  const prizes = new Map<Animal, number>()
  const jackpotIndex = Math.floor(Math.random() * 4)
  ANIMALS.forEach((animal, i) => {
    if (i === jackpotIndex) {
      prizes.set(animal.id, JACKPOT_AMOUNT)
    } else {
      prizes.set(animal.id, MIN_AMOUNT + Math.floor(Math.random() * (MAX_NORMAL - MIN_AMOUNT + 1)))
    }
  })
  return prizes
}

/** Floating coin particle */
function CoinParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      className="absolute text-2xl sm:text-3xl pointer-events-none"
      initial={{ opacity: 0, y: 0, x, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -60, -120, -180],
        x: [x, x + (Math.random() - 0.5) * 60],
        scale: [0, 1.2, 1, 0.6],
        rotate: [0, Math.random() * 360],
      }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
    >
      💰
    </motion.div>
  )
}

/** Sparkle particle for jackpot */
function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute text-lg sm:text-xl pointer-events-none"
      initial={{ opacity: 0, scale: 0, x, y }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
        x: [x, x + (Math.random() - 0.5) * 100],
        y: [y, y + (Math.random() - 0.5) * 100],
      }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
    >
      {['✨', '⭐', '🌟', '💫'][Math.floor(Math.random() * 4)]}
    </motion.div>
  )
}

export default function CarrotBonusPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { prefixPath } = useBasePath()
  const { user, isGuest, updateCredits, updateCarrots } = useAuth()

  const [phase, setPhase] = useState<Phase>('pick')
  const [prizes, setPrizes] = useState<Map<Animal, number>>(() => generatePrizes())
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [wonAmount, setWonAmount] = useState(0)
  const [isJackpot, setIsJackpot] = useState(false)
  const [revealedAnimals, setRevealedAnimals] = useState<Set<Animal>>(new Set())
  const [totalWon, setTotalWon] = useState(0)
  const [totalPlayed, setTotalPlayed] = useState(0)
  const [countUp, setCountUp] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const spentRef = useRef(false)
  const musicStarted = useRef(false)

  const carrotCount = user?.carrots ?? 0

  // Start casino music on mount
  useEffect(() => {
    if (!musicStarted.current) {
      musicStarted.current = true
      startCasinoMusic()
    }
    return () => { stopCasinoMusic() }
  }, [])

  // Count-up animation for result
  useEffect(() => {
    if (phase !== 'result') return
    if (countUp >= wonAmount) return
    const step = Math.max(1, Math.floor(wonAmount / 30))
    const timer = setTimeout(() => {
      setCountUp((prev) => Math.min(prev, wonAmount) === wonAmount ? wonAmount : Math.min(prev + step, wonAmount))
    }, 30)
    return () => clearTimeout(timer)
  }, [phase, countUp, wonAmount])

  const handlePick = useCallback(async (animal: Animal) => {
    if (phase !== 'pick') return
    if (!user || isGuest) {
      setError(t('carrotBonus.loginRequired'))
      return
    }
    if (carrotCount < 1) {
      setError(t('carrotBonus.notEnoughCarrots'))
      return
    }

    setError(null)
    setSelectedAnimal(animal)
    setPhase('feeding')
    spentRef.current = false
    playClick()

    // Spend 1 carrot
    const success = await spendCarrots(user.id, 1, 'carrot_bonus_game')
    if (!success) {
      setPhase('pick')
      setSelectedAnimal(null)
      setError(t('carrotBonus.notEnoughCarrots'))
      return
    }
    spentRef.current = true
    updateCarrots(-1)

    // Feeding animation plays for ~1.5s
    playOmNomNom()
    await new Promise((r) => setTimeout(r, 1500))

    // Drum roll + reveal
    setPhase('reveal')
    playDrumRoll()
    await new Promise((r) => setTimeout(r, 1200))

    // Reveal selected animal's prize
    const amount = prizes.get(animal) ?? MIN_AMOUNT
    const jackpot = amount === JACKPOT_AMOUNT
    setWonAmount(amount)
    setIsJackpot(jackpot)
    setRevealedAnimals(new Set([animal]))
    setCountUp(0)
    setPhase('result')

    if (jackpot) {
      playJackpot()
    } else {
      playSmallWin()
      playCoinShower()
    }

    // Award credits
    await logCreditTransaction(user.id, amount, 'carrot_bonus_win', {
      animal,
      jackpot,
    })
    updateCredits(amount)
    setTotalWon((prev) => prev + amount)
    setTotalPlayed((prev) => prev + 1)

    // Reveal all other animals after a short delay
    await new Promise((r) => setTimeout(r, 1500))
    setRevealedAnimals(new Set(ANIMALS.map((a) => a.id)))
    ANIMALS.forEach((a) => {
      if (a.id !== animal && prizes.get(a.id) !== JACKPOT_AMOUNT) return
      if (a.id !== animal) playReveal()
    })
  }, [phase, user, isGuest, carrotCount, prizes, t, updateCarrots, updateCredits])

  const handlePlayAgain = useCallback(() => {
    setPrizes(generatePrizes())
    setSelectedAnimal(null)
    setWonAmount(0)
    setIsJackpot(false)
    setRevealedAnimals(new Set())
    setCountUp(0)
    setError(null)
    setPhase('pick')
    playClick()
  }, [])

  const handleBack = useCallback(() => {
    stopCasinoMusic()
    playClick()
    router.push(prefixPath('/'))
  }, [router, prefixPath])

  return (
    <main className="relative min-h-screen flex flex-col items-center px-3 sm:px-4 pt-6 sm:pt-8 pb-12">
      {/* Background glow */}
      <div className="fixed inset-0 bg-gradient-to-b from-geo-surface-high via-geo-bg to-geo-surface-highest opacity-60 pointer-events-none" />

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed top-4 left-4 z-30"
      >
        <button
          onClick={handleBack}
          className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
          aria-label={t('back')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {t('back')}
        </button>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative text-center mb-4 sm:mb-6 z-10"
      >
        <h1 className="text-3xl sm:text-5xl font-headline font-bold text-geo-on-surface uppercase tracking-tight">
          {t('carrotBonus.title')}
        </h1>
        <p className="text-geo-on-surface-dim text-sm sm:text-base font-body mt-1">
          {t('carrotBonus.subtitle')}
        </p>
      </motion.div>

      {/* Carrot balance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative glass-panel px-5 py-2.5 mb-5 sm:mb-8 flex items-center gap-3 z-10"
      >
        <img src="/images/carrot.svg" alt="" className="w-6 h-10" aria-hidden="true" />
        <span className="font-headline font-bold text-xl sm:text-2xl text-geo-on-surface">
          {carrotCount}
        </span>
        <span className="text-geo-on-surface-dim text-sm font-body">
          {t('carrotBonus.carrots')}
        </span>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative glass-panel border-geo-error px-4 py-2 mb-4 z-10"
          >
            <p className="text-geo-error font-headline font-bold text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animal cards */}
      <div className="relative grid grid-cols-2 gap-3 sm:gap-5 w-full max-w-xl z-10">
        {ANIMALS.map((animal, i) => {
          const prize = prizes.get(animal.id) ?? MIN_AMOUNT
          const isSelected = selectedAnimal === animal.id
          const isRevealed = revealedAnimals.has(animal.id)
          const isPickable = phase === 'pick'
          const jackpotAnimal = prize === JACKPOT_AMOUNT

          return (
            <motion.div
              key={animal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1), type: 'spring', stiffness: 300, damping: 20 }}
              className="relative"
            >
              <button
                onClick={() => handlePick(animal.id)}
                disabled={!isPickable}
                className={`relative w-full aspect-square glass-panel flex flex-col items-center justify-center transition-all overflow-hidden ${
                  isPickable
                    ? 'hover:border-geo-primary hover:shadow-comic-lg cursor-pointer active:translate-y-[2px] active:shadow-comic-sm'
                    : 'cursor-default'
                } ${isSelected && phase !== 'pick' ? 'border-geo-primary shadow-comic-lg' : ''}`}
                aria-label={`${t('carrotBonus.feed')} ${animal.name}`}
              >
                {/* Animal image */}
                <motion.img
                  src={animal.img}
                  alt={animal.name}
                  className="w-20 h-20 sm:w-28 sm:h-28 object-contain"
                  animate={
                    isSelected && phase === 'feeding'
                      ? {
                          scale: [1, 1.15, 0.95, 1.1, 1],
                          rotate: [0, -5, 5, -3, 0],
                        }
                      : isSelected && phase === 'reveal'
                        ? { scale: [1, 1.05, 1], y: [0, -4, 0] }
                        : {}
                  }
                  transition={
                    isSelected && phase === 'feeding'
                      ? { duration: 1.2, repeat: Infinity }
                      : { duration: 0.6, repeat: Infinity }
                  }
                />

                {/* Animal name */}
                <span className="font-headline font-bold text-sm sm:text-base text-geo-on-surface mt-1 sm:mt-2 uppercase tracking-wide">
                  {animal.name}
                </span>

                {/* Feeding animation — carrot going to animal */}
                <AnimatePresence>
                  {isSelected && phase === 'feeding' && (
                    <motion.img
                      src="/images/carrot.svg"
                      alt=""
                      className="absolute w-8 h-14 sm:w-10 sm:h-16"
                      initial={{ opacity: 1, y: 80, x: 0, scale: 1, rotate: -30 }}
                      animate={{ opacity: [1, 1, 0], y: [80, 10, -10], scale: [1, 0.8, 0.3], rotate: [-30, 0, 10] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: 'easeInOut' }}
                      aria-hidden="true"
                    />
                  )}
                </AnimatePresence>

                {/* Prize reveal overlay */}
                <AnimatePresence>
                  {isRevealed && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl ${
                        jackpotAnimal
                          ? 'bg-gradient-to-b from-geo-tertiary/95 to-geo-tertiary-bright/95'
                          : 'bg-white/90'
                      }`}
                    >
                      <motion.div
                        animate={jackpotAnimal ? { scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] } : {}}
                        transition={jackpotAnimal ? { duration: 0.8, repeat: Infinity } : {}}
                      >
                        <img
                          src={animal.img}
                          alt={animal.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                        />
                      </motion.div>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 15 }}
                        className={`font-headline font-extrabold text-xl sm:text-3xl mt-1 ${
                          jackpotAnimal ? 'text-geo-on-surface' : 'text-geo-primary'
                        }`}
                      >
                        {isSelected ? (isJackpot ? `🎰 ${prize}` : `💰 ${prize}`) : `💰 ${prize}`}
                      </motion.span>
                      <span className="font-body text-xs sm:text-sm text-geo-on-surface-dim mt-0.5">
                        {t('carrotBonus.coins')}
                      </span>
                      {jackpotAnimal && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="font-headline font-extrabold text-xs sm:text-sm text-geo-error uppercase tracking-widest mt-1"
                        >
                          JACKPOT!
                        </motion.span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hover glow for pickable state */}
                {isPickable && (
                  <div className="absolute inset-0 rounded-2xl bg-geo-primary/0 hover:bg-geo-primary/5 transition-colors pointer-events-none" />
                )}
              </button>
            </motion.div>
          )
        })}

        {/* Coin particles on win */}
        <AnimatePresence>
          {phase === 'result' && (
            <>
              {Array.from({ length: isJackpot ? 20 : 8 }).map((_, i) => (
                <CoinParticle key={`coin-${i}`} delay={i * 0.08} x={(Math.random() - 0.5) * 200} />
              ))}
              {isJackpot &&
                Array.from({ length: 12 }).map((_, i) => (
                  <Sparkle
                    key={`sparkle-${i}`}
                    delay={i * 0.1}
                    x={(Math.random() - 0.5) * 300}
                    y={(Math.random() - 0.5) * 200}
                  />
                ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Result panel */}
      <AnimatePresence>
        {phase === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
            className="relative glass-panel px-6 py-5 sm:px-8 sm:py-6 mt-6 sm:mt-8 text-center z-10 max-w-md w-full"
          >
            {isJackpot && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-3xl sm:text-4xl mb-2"
              >
                🎉🎰🎉
              </motion.div>
            )}
            <h2 className={`font-headline font-extrabold uppercase tracking-tight ${
              isJackpot ? 'text-2xl sm:text-4xl text-geo-tertiary' : 'text-xl sm:text-3xl text-geo-primary'
            }`}>
              {isJackpot ? t('carrotBonus.jackpot') : t('carrotBonus.youWon')}
            </h2>
            <motion.p
              className="font-headline font-extrabold text-4xl sm:text-6xl text-geo-on-surface my-2"
              animate={isJackpot ? { scale: [1, 1.05, 1] } : {}}
              transition={isJackpot ? { duration: 0.6, repeat: Infinity } : {}}
            >
              {countUp} <span className="text-lg sm:text-2xl text-geo-on-surface-dim">{t('carrotBonus.coins')}</span>
            </motion.p>

            {/* Stats */}
            {totalPlayed > 1 && (
              <p className="text-geo-on-surface-dim text-xs sm:text-sm font-body mt-2">
                {t('carrotBonus.totalStats')}: {totalPlayed} {t('carrotBonus.plays')} &middot; {totalWon} {t('carrotBonus.coins')} {t('carrotBonus.won')}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-4 justify-center">
              <button
                onClick={handlePlayAgain}
                disabled={carrotCount < 1}
                className={`btn-primary px-5 py-2.5 text-sm sm:text-base flex items-center gap-2 ${
                  carrotCount < 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <img src="/images/carrot.svg" alt="" className="w-4 h-7" aria-hidden="true" />
                {t('carrotBonus.playAgain')}
              </button>
              <button onClick={handleBack} className="btn-ghost px-5 py-2.5 text-sm sm:text-base">
                {t('home')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instruction text in pick phase */}
      <AnimatePresence>
        {phase === 'pick' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative glass-panel px-5 py-3 mt-6 text-center z-10 max-w-md"
          >
            <p className="font-headline font-bold text-sm sm:text-base text-geo-on-surface">
              🥕 {t('carrotBonus.instruction')}
            </p>
            <p className="text-geo-on-surface-dim text-xs sm:text-sm font-body mt-1">
              {t('carrotBonus.jackpotHint')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest prompt */}
      {isGuest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative glass-panel px-5 py-3 mt-6 text-center z-10 max-w-md"
        >
          <p className="font-headline font-bold text-sm text-geo-secondary uppercase">
            🔒 {t('carrotBonus.loginRequired')}
          </p>
        </motion.div>
      )}
    </main>
  )
}
