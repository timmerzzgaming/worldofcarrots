'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import MapBackground from '@/components/home/MapBackground'
import FloatingFlags from '@/components/home/FloatingFlags'
import LoadingScreen from '@/components/home/LoadingScreen'
import LanguageSelector from '@/components/LanguageSelector'
import SoundToggle from '@/components/SoundToggle'
import { playClick, playHover, playEnter, startMenuMusic } from '@/lib/sounds'
import { useTranslation } from '@/lib/i18n'
import { useBasePath } from '@/lib/basePath'
import type { Translations } from '@/lib/i18n'
import ClickCountryMenu from '@/components/game/menus/ClickCountryMenu'
import FlagMenu from '@/components/game/menus/FlagMenu'
import DistanceMenu from '@/components/game/menus/DistanceMenu'
import USStatesMenu from '@/components/game/menus/USStatesMenu'
import DailyChallengeBanner from '@/components/game/DailyChallengeBanner'
import WeeklyLeaderboard from '@/components/game/WeeklyLeaderboard'
import { useAuth } from '@/lib/auth/context'
import { GAME_UNLOCK_REQUIREMENTS, isGameUnlocked, getUserUnlocks, getUnlockLabel } from '@/lib/unlocks'

interface GameModeEntry {
  titleKey: keyof Translations
  descKey: keyof Translations
  href: string
  available: boolean
  icon: string
  badge?: string
}

interface Category {
  id: string
  titleKey: keyof Translations
  descKey: keyof Translations
  icon: string
  modes: GameModeEntry[]
}

const categories: Category[] = [
  {
    id: 'mapGames',
    titleKey: 'cat.mapGames',
    descKey: 'cat.mapGames.desc',
    icon: '🌍',
    modes: [
      {
        titleKey: 'home.guessCountry',
        descKey: 'home.guessCountry.desc',
        href: '/game/click-country',
        available: true,
        icon: '🌍',
        badge: 'ACTIVE',
      },
      {
        titleKey: 'home.guessFlag',
        descKey: 'home.guessFlag.desc',
        href: '/game/flag',
        available: true,
        icon: '🏁',
        badge: 'ACTIVE',
      },
      {
        titleKey: 'home.distance',
        descKey: 'home.distance.desc',
        href: '/game/distance',
        available: true,
        icon: '📍',
        badge: 'ACTIVE',
      },
      {
        titleKey: 'home.usStates',
        descKey: 'home.usStates.desc',
        href: '/game/us-states',
        available: true,
        icon: '🇺🇸',
        badge: 'NEW',
      },
      {
        titleKey: 'home.nameCountry',
        descKey: 'home.nameCountry.desc',
        href: '#',
        available: false,
        icon: '✏️',
      },
      {
        titleKey: 'home.silhouette',
        descKey: 'home.silhouette.desc',
        href: '#',
        available: false,
        icon: '🖤',
      },
      {
        titleKey: 'home.borderNeighbors',
        descKey: 'home.borderNeighbors.desc',
        href: '#',
        available: false,
        icon: '🤝',
      },
      {
        titleKey: 'home.mapPuzzle',
        descKey: 'home.mapPuzzle.desc',
        href: '#',
        available: false,
        icon: '🧩',
      },
      {
        titleKey: 'home.explorer',
        descKey: 'home.explorer.desc',
        href: '#',
        available: false,
        icon: '🧭',
      },
    ],
  },
  {
    id: 'trivia',
    titleKey: 'cat.trivia',
    descKey: 'cat.trivia.desc',
    icon: '🧠',
    modes: [
      {
        titleKey: 'home.capitalCities',
        descKey: 'home.capitalCities.desc',
        href: '#',
        available: false,
        icon: '🏛️',
      },
      {
        titleKey: 'home.populationHL',
        descKey: 'home.populationHL.desc',
        href: '#',
        available: false,
        icon: '👥',
      },
      {
        titleKey: 'home.areaCompare',
        descKey: 'home.areaCompare.desc',
        href: '#',
        available: false,
        icon: '📐',
      },
      {
        titleKey: 'home.currencyMatch',
        descKey: 'home.currencyMatch.desc',
        href: '#',
        available: false,
        icon: '💰',
      },
      {
        titleKey: 'home.languageMatch',
        descKey: 'home.languageMatch.desc',
        href: '#',
        available: false,
        icon: '🗣️',
      },
      {
        titleKey: 'home.timeZone',
        descKey: 'home.timeZone.desc',
        href: '#',
        available: false,
        icon: '🕐',
      },
      {
        titleKey: 'home.quizzes',
        descKey: 'home.quizzes.desc',
        href: '#',
        available: false,
        icon: '❓',
      },
      {
        titleKey: 'home.anagram',
        descKey: 'home.anagram.desc',
        href: '#',
        available: false,
        icon: '🔤',
      },
    ],
  },
  {
    id: 'challenge',
    titleKey: 'cat.challenge',
    descKey: 'cat.challenge.desc',
    icon: '⚡',
    modes: [
      {
        titleKey: 'home.dailyChallenge',
        descKey: 'home.dailyChallenge.desc',
        href: '#',
        available: false,
        icon: '📅',
      },
      {
        titleKey: 'home.streakMode',
        descKey: 'home.streakMode.desc',
        href: '#',
        available: false,
        icon: '🔥',
      },
      {
        titleKey: 'home.continentSprint',
        descKey: 'home.continentSprint.desc',
        href: '#',
        available: false,
        icon: '🏃',
      },
      {
        titleKey: 'home.compassMode',
        descKey: 'home.compassMode.desc',
        href: '#',
        available: false,
        icon: '🧭',
      },
      {
        titleKey: 'home.reverseDistance',
        descKey: 'home.reverseDistance.desc',
        href: '#',
        available: false,
        icon: '📌',
      },
      {
        titleKey: 'home.nationalAnthem',
        descKey: 'home.nationalAnthem.desc',
        href: '#',
        available: false,
        icon: '🎵',
      },
      {
        titleKey: 'home.studyMode',
        descKey: 'home.studyMode.desc',
        href: '#',
        available: false,
        icon: '📖',
      },
    ],
  },
  {
    id: 'bonus',
    titleKey: 'cat.bonus',
    descKey: 'cat.bonus.desc',
    icon: '🎰',
    modes: [
      {
        titleKey: 'home.carrotBonus',
        descKey: 'home.carrotBonus.desc',
        href: '/game/carrot-bonus',
        available: true,
        icon: '🥕',
        badge: 'NEW',
      },
      {
        titleKey: 'home.stickerAlbum',
        descKey: 'home.stickerAlbum.desc',
        href: '/game/sticker-album',
        available: true,
        icon: '🗺️',
        badge: 'NEW',
      },
    ],
  },
]

type MenuView = 'categories' | string

export default function HomePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { prefixPath } = useBasePath()
  const [loaded, setLoaded] = useState(false)
  const [entered, setEntered] = useState(false)
  const [view, setView] = useState<MenuView>('categories')
  const [expandedGame, setExpandedGame] = useState<GameModeEntry | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const { user, isGuest } = useAuth()
  const [unlockedSet, setUnlockedSet] = useState<Set<string>>(new Set())
  const handleLoaded = useCallback(() => setLoaded(true), [])
  const restoredRef = useRef(false)

  // Load user unlocks
  useEffect(() => {
    if (!user || isGuest) return
    getUserUnlocks(user.id).then(setUnlockedSet)
  }, [user, isGuest])

  // Restore state from sessionStorage + URL params (runs once after hydration)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const wasEntered = sessionStorage.getItem('woc-entered') === 'true'
    if (wasEntered) {
      setLoaded(true)
      setEntered(true)
    }
    const params = new URLSearchParams(window.location.search)
    const cat = params.get('cat')
    if (cat && categories.some((c) => c.id === cat)) {
      setLoaded(true)
      setEntered(true)
      setView(cat)
      const gameHref = params.get('game')
      if (gameHref) {
        const category = categories.find((c) => c.id === cat)
        const mode = category?.modes.find((m) => m.href === gameHref)
        if (mode) setExpandedGame(mode)
      }
    }
  }, [])

  function handleEnter() {
    playEnter()
    startMenuMusic()
    setEntered(true)
    sessionStorage.setItem('woc-entered', 'true')
  }

  function handleCategoryClick(categoryId: string) {
    playClick()
    setView(categoryId)
    router.push(prefixPath(`/?cat=${categoryId}`), { scroll: false })
  }

  function handleBack() {
    playClick()
    setExpandedGame(null)
    setView('categories')
    router.push(prefixPath('/'), { scroll: false })
  }

  useEffect(() => {
    if (loaded && entered) startMenuMusic()
  }, [loaded, entered])

  const activeCategory = categories.find((c) => c.id === view)

  return (
    <>
      {!loaded && <LoadingScreen onComplete={handleLoaded} />}

      {loaded && (
        <>
          <MapBackground />
          <FloatingFlags />
        </>
      )}

      {/* Title screen */}
      {loaded && !entered && (
        <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Rabbit mascot */}
            <motion.img
              src="/images/rabbit-hero.svg"
              alt="World Of Carrots mascot"
              width={160}
              height={224}
              className="mx-auto mb-4 drop-shadow-lg"
              initial={{ y: 10 }}
              animate={{ y: -5 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            />
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-headline font-bold text-geo-on-surface uppercase tracking-tight mb-2">
              World<span className="text-geo-primary">Of</span>Carrots
            </h1>
            <p className="text-geo-on-surface-dim text-base sm:text-lg font-body max-w-md mx-auto mb-8 sm:mb-10">
              {t('testYourKnowledge')}
            </p>
            <motion.button
              onClick={handleEnter}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
              className="btn-primary px-8 py-3 sm:px-12 sm:py-4 text-lg sm:text-xl"
            >
              {t('startGame')}
            </motion.button>
          </motion.div>
        </main>
      )}

      {/* Main menu */}
      {entered && (
        <main className="relative min-h-screen flex flex-col items-center px-3 sm:px-4 pt-8 sm:pt-10 pb-12 sm:pb-16">
          {/* TopBar (UserBadge, SoundToggle, LanguageSelector) is in layout */}

          {/* Header — fixed at top, fade in */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-4 sm:mb-10 flex-shrink-0 pointer-events-none"
          >
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-headline font-bold text-geo-on-surface uppercase tracking-tight mb-2">
              World<span className="text-geo-primary">Of</span>Carrots
            </h1>
            <p className="text-geo-on-surface-dim text-base sm:text-lg font-body max-w-md mx-auto">
              {t('testYourKnowledge')}
            </p>
          </motion.div>

          {/* Animated view switching */}
          <div className="w-full max-w-5xl flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {view === 'categories' ? (
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.25 }}
                  className="w-full space-y-6"
                >
                  {/* Daily Challenge bar */}
                  <div className="max-w-5xl mx-auto">
                    <DailyChallengeBanner onPlay={(mode, difficulty, seed) => router.push(prefixPath(`/game/daily?mode=${mode}&difficulty=${difficulty}&seed=${seed}`))} />
                  </div>

                  <div className="grid gap-3 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
                  {/* 1. Solo Play (mapGames) */}
                  {(() => {
                    const cat = categories[0]
                    const available = cat.modes.filter((m) => m.available).length
                    const upcoming = cat.modes.filter((m) => !m.available).length
                    return (
                      <motion.button
                        key={cat.id}
                        onMouseEnter={() => playHover()}
                        onClick={() => handleCategoryClick(cat.id)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="group relative flex flex-row sm:flex-col items-center sm:items-center text-left sm:text-center p-3 sm:p-8 lg:p-10 glass-panel transition-all gap-3 sm:gap-0 hover:border-geo-primary hover:shadow-comic-lg cursor-pointer"
                      >
                        <div className="text-3xl sm:text-6xl lg:text-7xl shrink-0 sm:mb-5">{cat.icon}</div>
                        <div className="flex flex-col sm:items-center min-w-0">
                          <h2 className="text-base sm:text-2xl font-headline font-extrabold uppercase tracking-wide text-geo-on-surface group-hover:text-geo-primary transition-colors">
                            {t(cat.titleKey)}
                          </h2>
                          <p className="text-geo-on-surface-dim mt-0.5 sm:mt-2 text-xs sm:text-base leading-relaxed">
                            {t(cat.descKey)}
                          </p>
                          <div className="mt-1.5 sm:mt-4 flex flex-wrap gap-2 sm:gap-3 sm:justify-center text-xs sm:text-sm">
                            {available > 0 && (
                              <span className="bg-geo-primary text-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-headline font-bold">
                                {available} {t('gamesAvailable')}
                              </span>
                            )}
                            {upcoming > 0 && (
                              <span className="bg-geo-primary text-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-headline font-bold">
                                +{upcoming} {t('moreComingSoon')}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })()}

                  {/* 2. Multiplayer — coming soon */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="group relative flex flex-row sm:flex-col items-center sm:items-center text-left sm:text-center p-3 sm:p-8 lg:p-10 glass-panel opacity-50 cursor-not-allowed gap-3 sm:gap-0"
                  >
                    <span className="absolute -top-2 right-2 bg-geo-primary text-black text-[10px] sm:text-xs font-headline font-extrabold uppercase px-2 sm:px-3 py-0.5 rounded-full">
                      {t('comingSoon')}
                    </span>
                    <div className="text-3xl sm:text-6xl lg:text-7xl shrink-0 sm:mb-5 grayscale">🎮</div>
                    <div className="flex flex-col sm:items-center min-w-0">
                      <h2 className="text-base sm:text-2xl font-headline font-extrabold uppercase tracking-wide text-geo-on-surface-dim">
                        {t('mp.multiplayer')}
                      </h2>
                      <p className="text-geo-on-surface-dim mt-0.5 sm:mt-2 text-xs sm:text-base leading-relaxed">
                        {t('mp.multiplayer.desc')}
                      </p>
                    </div>
                  </motion.div>

                  {/* 3-5. Remaining categories (trivia, challenge, bonus) */}
                  {categories.slice(1).map((cat, i) => {
                    const guestCatLocked = isGuest && cat.id !== 'mapGames'
                    const available = cat.modes.filter((m) => m.available).length
                    const upcoming = cat.modes.filter((m) => !m.available).length
                    return (
                      <motion.button
                        key={cat.id}
                        onMouseEnter={() => !guestCatLocked && playHover()}
                        onClick={() => !guestCatLocked && handleCategoryClick(cat.id)}
                        disabled={guestCatLocked}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * (i + 2) }}
                        className={`group relative flex flex-row sm:flex-col items-center sm:items-center text-left sm:text-center p-3 sm:p-8 lg:p-10 glass-panel transition-all gap-3 sm:gap-0 ${
                          guestCatLocked
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-geo-primary hover:shadow-comic-lg cursor-pointer'
                        }`}
                      >
                        {guestCatLocked && (
                          <span className="absolute -top-2 right-2 bg-geo-secondary/80 text-white text-[10px] sm:text-xs font-headline font-extrabold uppercase px-2 sm:px-3 py-0.5 rounded-full">
                            🔒
                          </span>
                        )}
                        <div className={`text-3xl sm:text-6xl lg:text-7xl shrink-0 sm:mb-5 ${guestCatLocked ? 'grayscale' : ''}`}>{cat.icon}</div>
                        <div className="flex flex-col sm:items-center min-w-0">
                          <h2 className={`text-base sm:text-2xl font-headline font-extrabold uppercase tracking-wide ${guestCatLocked ? 'text-geo-on-surface-dim' : 'text-geo-on-surface group-hover:text-geo-primary transition-colors'}`}>
                            {t(cat.titleKey)}
                          </h2>
                          <p className="text-geo-on-surface-dim mt-0.5 sm:mt-2 text-xs sm:text-base leading-relaxed">
                            {t(cat.descKey)}
                          </p>
                          <div className="mt-1.5 sm:mt-4 flex flex-wrap gap-2 sm:gap-3 sm:justify-center text-xs sm:text-sm">
                            {available > 0 && (
                              <span className="bg-geo-primary text-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-headline font-bold">
                                {available} {t('gamesAvailable')}
                              </span>
                            )}
                            {upcoming > 0 && (
                              <span className="bg-geo-primary text-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-headline font-bold">
                                +{upcoming} {t('moreComingSoon')}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}

                  {/* 6. Leaderboard */}
                  <motion.button
                    onMouseEnter={() => playHover()}
                    onClick={() => { playClick(); setShowLeaderboard(true) }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="group relative flex flex-row sm:flex-col items-center sm:items-center text-left sm:text-center p-3 sm:p-8 lg:p-10 glass-panel transition-all gap-3 sm:gap-0 hover:border-geo-primary hover:shadow-comic-lg cursor-pointer"
                  >
                    <div className="text-3xl sm:text-6xl lg:text-7xl shrink-0 sm:mb-5">🏆</div>
                    <div className="flex flex-col sm:items-center min-w-0">
                      <h2 className="text-base sm:text-2xl font-headline font-extrabold uppercase tracking-wide text-geo-on-surface group-hover:text-geo-primary transition-colors">
                        {t('home.leaderboard')}
                      </h2>
                      <p className="text-geo-on-surface-dim mt-0.5 sm:mt-2 text-xs sm:text-base leading-relaxed">
                        {t('home.leaderboard.desc')}
                      </p>
                    </div>
                  </motion.button>
                  </div>
                  {isGuest && (
                    <p className="text-center mt-6 text-geo-secondary font-headline font-bold text-sm sm:text-base uppercase tracking-wide">
                      🔒 Create an account to unlock more game modes
                    </p>
                  )}
                </motion.div>
              ) : activeCategory ? (
                <>
                  {/* Back button — fixed, outside animated container to avoid position flash */}
                  <AnimatePresence>
                    {!expandedGame && (
                      <motion.div
                        key="back-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.25, duration: 0.3 }}
                        className="fixed top-10 left-2 sm:top-4 sm:left-4 z-[60]"
                      >
                        <button
                          onClick={handleBack}
                          className="btn-ghost px-4 py-3 sm:px-5 sm:py-2.5 text-base sm:text-sm flex items-center gap-2"
                          aria-label={t('back')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                          </svg>
                          {t('back')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    key={activeCategory.id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center w-full"
                  >

                  {/* Category title */}
                  <motion.div
                    className="mb-6"
                    animate={{ opacity: expandedGame ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-headline font-extrabold text-geo-on-surface uppercase tracking-wide text-center">
                      <span className="mr-2">{activeCategory.icon}</span>
                      {t(activeCategory.titleKey)}
                    </h2>
                  </motion.div>

                  {/* Game mode grid */}
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
                    animate={{ opacity: expandedGame ? 0 : 1, scale: expandedGame ? 0.9 : 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {activeCategory.modes.map((mode, i) => (
                      <motion.div
                        key={mode.titleKey}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * (i + 1) }}
                      >
                        {(() => {
                          if (!mode.available) {
                            // Coming soon — not built yet
                            return (
                              <div className="relative flex flex-col items-center justify-center text-center w-full aspect-[4/3] sm:aspect-square glass-panel opacity-70 cursor-not-allowed">
                                <span className="absolute -top-2 right-2 bg-geo-primary text-black text-[10px] sm:text-xs font-headline font-extrabold uppercase px-2 sm:px-3 py-0.5 rounded-full">
                                  {t('comingSoon')}
                                </span>
                                <div className="text-2xl sm:text-5xl lg:text-6xl mb-1 sm:mb-3">{mode.icon}</div>
                                <h3 className="text-sm sm:text-base lg:text-lg font-headline font-extrabold text-white uppercase tracking-wide px-2 leading-tight">
                                  {t(mode.titleKey)}
                                </h3>
                              </div>
                            )
                          }

                          // Guest restriction: only click-country is available
                          const guestLocked = isGuest && mode.href !== '/game/click-country'

                          if (guestLocked) {
                            return (
                              <div className="group relative flex flex-col items-center justify-center text-center w-full aspect-[4/3] sm:aspect-square glass-panel opacity-60 cursor-not-allowed border-geo-outline-dim/30">
                                <span className="absolute -top-2 right-2 bg-geo-secondary/80 text-white text-[10px] sm:text-xs font-headline font-extrabold uppercase px-2 sm:px-3 py-0.5 rounded-full">
                                  🔒
                                </span>
                                <div className="text-4xl sm:text-5xl lg:text-6xl mb-2 sm:mb-3 grayscale opacity-50">{mode.icon}</div>
                                <h3 className="text-sm sm:text-base lg:text-lg font-headline font-extrabold text-geo-on-surface-dim uppercase tracking-wide px-2 leading-tight">
                                  {t(mode.titleKey)}
                                </h3>
                              </div>
                            )
                          }

                          const unlockReq = GAME_UNLOCK_REQUIREMENTS[mode.href]
                          const unlocked = !user || isGameUnlocked(mode.href, user.level, unlockedSet)

                          if (!unlocked) {
                            // Locked — show requirement
                            return (
                              <div className="group relative flex flex-col items-center justify-center text-center w-full aspect-[4/3] sm:aspect-square glass-panel opacity-60 cursor-not-allowed border-geo-outline-dim/30">
                                <span className="absolute -top-2 right-2 bg-geo-secondary/80 text-white text-[10px] sm:text-xs font-headline font-extrabold uppercase px-2 sm:px-3 py-0.5 rounded-full">
                                  🔒 {unlockReq ? getUnlockLabel(unlockReq) : ''}
                                </span>
                                <div className="text-4xl sm:text-5xl lg:text-6xl mb-2 sm:mb-3 grayscale opacity-50">{mode.icon}</div>
                                <h3 className="text-sm sm:text-base lg:text-lg font-headline font-extrabold text-geo-on-surface-dim uppercase tracking-wide px-2 leading-tight">
                                  {t(mode.titleKey)}
                                </h3>
                              </div>
                            )
                          }

                          // Unlocked — playable
                          // Direct-navigate modes (no sub-menu needed)
                          const directNav = mode.href === '/game/carrot-bonus' || mode.href === '/game/sticker-album'

                          return (
                            <button
                              onMouseEnter={() => playHover()}
                              onClick={() => {
                                playClick()
                                if (directNav) {
                                  router.push(prefixPath(mode.href))
                                } else {
                                  setExpandedGame(mode)
                                }
                              }}
                              className="group relative flex flex-col items-center justify-center text-center w-full aspect-[4/3] sm:aspect-square glass-panel hover:border-geo-primary hover:shadow-comic-lg transition-all cursor-pointer"
                            >
                              {mode.badge && (
                                <span className="absolute -top-2 right-2 bg-geo-primary text-geo-on-primary text-[10px] sm:text-xs font-headline font-extrabold uppercase px-2 sm:px-3 py-0.5 rounded-full border-b-2 border-geo-on-primary">
                                  {mode.badge}
                                </span>
                              )}
                              <div className="text-4xl sm:text-5xl lg:text-6xl mb-2 sm:mb-3">{mode.icon}</div>
                              <h3 className="text-sm sm:text-base lg:text-lg font-headline font-extrabold text-geo-on-surface uppercase tracking-wide group-hover:text-geo-primary transition-colors px-2 leading-tight">
                                {t(mode.titleKey)}
                              </h3>
                            </button>
                          )
                        })()}
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Guest unlock prompt */}
                  {isGuest && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-center mt-6 text-geo-secondary font-headline font-bold text-sm sm:text-base uppercase tracking-wide"
                    >
                      🔒 Create an account to unlock more game modes
                    </motion.p>
                  )}

                  {/* Zoom panel — selected game grows to replace the grid, shows actual menu */}
                  <AnimatePresence>
                    {expandedGame && (
                      <motion.div
                        key="expanded"
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 z-30 flex items-center justify-center"
                      >
                        <div className="glass-panel border-geo-primary shadow-comic-lg flex flex-col overflow-hidden" style={{ width: 'min(820px, 95vw)', height: 'min(820px, 80vh)' }}>
                          {/* Fixed header: back button + game title */}
                          <div className="flex-shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3">
                            <button
                              onClick={() => { playClick(); setExpandedGame(null) }}
                              className="btn-ghost px-4 py-2 text-sm flex items-center gap-2 mb-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                              </svg>
                              {t('back')}
                            </button>
                            <h2 className="text-2xl sm:text-3xl font-headline font-extrabold text-geo-on-surface italic uppercase tracking-tighter drop-shadow-sm text-center">
                              {(() => {
                                const w = t(expandedGame.titleKey).split(' ')
                                const last = w.pop()!
                                return w.length ? <>{w.join(' ')} <span className="text-geo-primary text-geo-primary">{last}</span></> : <span className="text-geo-primary text-geo-primary">{last}</span>
                              })()}
                            </h2>
                          </div>
                          {/* Scrollable menu content (no title — it's in the fixed header above) */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.3 }}
                            className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 sm:px-6 pb-4 sm:pb-6"
                          >
                            {expandedGame.href === '/game/click-country' && (
                              <ClickCountryMenu onStartGame={(mode, diff, region, variant) => {
                                router.push(prefixPath(`/game/click-country?mode=${mode}&difficulty=${diff}&region=${region}${variant ? `&variant=${variant}` : ''}`))
                              }} />
                            )}
                            {expandedGame.href === '/game/flag' && (
                              <FlagMenu onStartGame={(diff, region) => {
                                router.push(prefixPath(`/game/flag?difficulty=${diff}&region=${region}`))
                              }} />
                            )}
                            {expandedGame.href === '/game/distance' && (
                              <DistanceMenu onStartGame={(diff, region, unit) => {
                                router.push(prefixPath(`/game/distance?difficulty=${diff}&region=${region}&unit=${unit}`))
                              }} />
                            )}
                            {expandedGame.href === '/game/us-states' && (
                              <USStatesMenu onStartGame={(mode, diff) => {
                                router.push(prefixPath(`/game/us-states?mode=${mode}&difficulty=${diff}`))
                              }} />
                            )}
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </main>
      )}
      {showLeaderboard && <WeeklyLeaderboard onClose={() => setShowLeaderboard(false)} />}
    </>
  )
}
