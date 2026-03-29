'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAuth } from '@/lib/auth/context'
import { useBasePath } from '@/lib/basePath'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import {
  getTodaysChallenge,
  hasCompletedToday,
  submitDailyChallengeResult,
  getDailyChallengeLeaderboard,
  seededShuffle,
  type DailyChallenge,
  type DailyChallengeResult,
} from '@/lib/daily-challenge'
import { getCountriesFromGeoJSON } from '@/lib/gameEngine'
import { calculateStars } from '@/lib/stars'
import {
  getMapStyle, COUNTRIES_SOURCE, COUNTRIES_FILL_LAYER, COUNTRIES_LINE_LAYER,
  SMALL_COUNTRIES_SOURCE, SMALL_COUNTRIES_CIRCLE_LAYER, SMALL_COUNTRIES_RING_LAYER,
  initialViewState,
} from '@/lib/mapConfig'
import { buildSmallCountryPoints, createFeatureStateSetter } from '@/lib/mapHelpers'
import { countryFillColor, countryLineColor, countryHoverColor, countryHoverLineColor, circleStrokeColor } from '@/lib/theme'
import StarRating from '@/components/credits/StarRating'
import LevelBadge from '@/components/xp/LevelBadge'
import { cn } from '@/lib/cn'
import { playCorrect, playWrong, playGameOver, playGameStart, playCreditEarned, playLevelUp, playTick } from '@/lib/sounds'

interface DailyQuestion {
  name: string
  featureId: number
}

interface DailyAnswer {
  question: string
  correct: boolean
  clicked: string | null
  points: number
}

type Phase = 'loading' | 'ready' | 'countdown' | 'playing' | 'feedback' | 'results' | 'already_done'

const QUESTION_COUNT = 15
const GAME_TIME = 60 // 60 seconds total
const PERFECT_BONUS = 30 // bonus for all 15 correct
// Progressive scoring: question 1 = 1pt, question 2 = 2pt, ... question 15 = 15pt
// Max base = 1+2+...+15 = 120. Max total = 120 + 30 = 150 points.

export default function DailyChallengePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user, isGuest, updateCredits, updateCarrots, updateXp } = useAuth()
  const { prefixPath } = useBasePath()

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const nameToIdRef = useRef<Map<string, number>>(new Map())
  const hoveredIdRef = useRef<number | null>(null)
  const smallNameToIdRef = useRef<Map<string, number>>(new Map())

  const [phase, setPhase] = useState<Phase>('loading')
  const phaseRef = useRef<Phase>('loading')
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [questions, setQuestions] = useState<DailyQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentIndexRef = useRef(0)
  const [answers, setAnswers] = useState<DailyAnswer[]>([])
  const answersRef = useRef<DailyAnswer[]>([])
  const [score, setScore] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(GAME_TIME)
  const timeRemainingRef = useRef(GAME_TIME)
  const [countdownNum, setCountdownNum] = useState(3)
  const [leaderboard, setLeaderboard] = useState<DailyChallengeResult[]>([])
  const [rewardResult, setRewardResult] = useState<{ totalCoins: number; carrots: number; xpEarned: number; leveledUp: boolean } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [feedbackCountry, setFeedbackCountry] = useState<string | null>(null)
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null)

  const correctCount = useMemo(() => answers.filter((a) => a.correct).length, [answers])
  const totalQuestions = questions.length
  const currentQ = questions[currentIndex]

  // Load challenge + init map
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      const ch = await getTodaysChallenge()
      if (!ch || cancelled) { setPhase('ready'); return }
      setChallenge(ch)

      if (user && !isGuest) {
        const done = await hasCompletedToday(user.id)
        if (done) { setPhase('already_done'); return }
      }

      try {
        const maplibregl = (await import('maplibre-gl')).default
        const res = await fetch('/data/countries.geojson')
        const geojson: GeoJSON.FeatureCollection = await res.json()
        if (cancelled) return

        // Build name→featureId map
        const nameToId = new Map<string, number>()
        geojson.features.forEach((f, i) => {
          const name = f.properties?.ADMIN
          if (typeof name === 'string') nameToId.set(name, i)
        })
        nameToIdRef.current = nameToId

        // Generate seeded questions
        const countries = getCountriesFromGeoJSON(geojson)
        const shuffled = seededShuffle(countries, ch.seed)
        const qs: DailyQuestion[] = shuffled.slice(0, QUESTION_COUNT).map((c) => ({
          name: c.name,
          featureId: nameToId.get(c.name) ?? 0,
        }))
        setQuestions(qs)

        // Create map — use getMapStyle to match other game pages
        const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''
        const map = new maplibregl.Map({
          container: containerRef.current!,
          style: getMapStyle(apiKey),
          center: initialViewState.center,
          zoom: initialViewState.zoom,
          attributionControl: false,
          renderWorldCopies: true,
        })

        map.addControl(new maplibregl.NavigationControl(), 'top-right')
        map.getCanvas().style.cursor = 'crosshair'

        map.on('load', () => {
          map.addSource(COUNTRIES_SOURCE, { type: 'geojson', data: geojson, generateId: true })

          map.addLayer({
            id: COUNTRIES_FILL_LAYER, type: 'fill', source: COUNTRIES_SOURCE,
            paint: {
              'fill-color': [
                'case',
                ['boolean', ['feature-state', 'correct'], false], '#22c55e',
                ['boolean', ['feature-state', 'wrong'], false], '#fdba74',
                ['boolean', ['feature-state', 'target'], false], '#3b82f6',
                ['boolean', ['feature-state', 'solved'], false], '#86efac',
                ['boolean', ['feature-state', 'hover'], false], countryHoverColor(),
                countryFillColor(),
              ],
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'correct'], false], 0.8,
                ['boolean', ['feature-state', 'wrong'], false], 0.8,
                ['boolean', ['feature-state', 'target'], false], 0.8,
                ['boolean', ['feature-state', 'solved'], false], 0.6,
                ['boolean', ['feature-state', 'hover'], false], 0.9,
                0.95,
              ],
            },
          })

          map.addLayer({
            id: COUNTRIES_LINE_LAYER, type: 'line', source: COUNTRIES_SOURCE,
            paint: {
              'line-color': [
                'case',
                ['boolean', ['feature-state', 'correct'], false], '#16a34a',
                ['boolean', ['feature-state', 'wrong'], false], '#ea580c',
                ['boolean', ['feature-state', 'target'], false], '#2563eb',
                ['boolean', ['feature-state', 'solved'], false], '#22c55e',
                ['boolean', ['feature-state', 'hover'], false], countryHoverLineColor(),
                countryLineColor(),
              ],
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'correct'], false], 3,
                ['boolean', ['feature-state', 'wrong'], false], 3,
                ['boolean', ['feature-state', 'target'], false], 3,
                ['boolean', ['feature-state', 'hover'], false], 2,
                1.2,
              ],
            },
          })

          // Small country circles
          const smallPoints = buildSmallCountryPoints(geojson.features)
          const smallLookup = new Map<string, number>()
          smallPoints.features.forEach((f, i) => {
            if (typeof f.properties?.ADMIN === 'string') smallLookup.set(f.properties.ADMIN, i)
          })
          smallNameToIdRef.current = smallLookup

          map.addSource(SMALL_COUNTRIES_SOURCE, { type: 'geojson', data: smallPoints })
          map.addLayer({
            id: SMALL_COUNTRIES_CIRCLE_LAYER, type: 'circle', source: SMALL_COUNTRIES_SOURCE,
            paint: { 'circle-radius': ['get', 'radius'], 'circle-color': circleStrokeColor(), 'circle-opacity': 0.12 },
          })
          map.addLayer({
            id: SMALL_COUNTRIES_RING_LAYER, type: 'circle', source: SMALL_COUNTRIES_SOURCE,
            paint: {
              'circle-radius': ['get', 'radius'], 'circle-color': 'transparent',
              'circle-stroke-width': 2,
              'circle-stroke-color': [
                'case',
                ['boolean', ['feature-state', 'correct'], false], '#22c55e',
                ['boolean', ['feature-state', 'wrong'], false], '#f97316',
                ['boolean', ['feature-state', 'target'], false], '#3b82f6',
                ['boolean', ['feature-state', 'hover'], false], countryHoverLineColor(),
                circleStrokeColor(),
              ],
              'circle-stroke-opacity': 0.8,
            },
          })

          const queryLayers = [COUNTRIES_FILL_LAYER, SMALL_COUNTRIES_CIRCLE_LAYER]

          // Hover
          map.on('mousemove', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: queryLayers })
            if (hoveredIdRef.current !== null) {
              map.setFeatureState({ source: COUNTRIES_SOURCE, id: hoveredIdRef.current }, { hover: false })
              hoveredIdRef.current = null
            }
            if (features.length > 0) {
              const name = features[0].properties?.ADMIN
              const polyId = name ? nameToId.get(name) : undefined
              if (polyId !== undefined) {
                hoveredIdRef.current = polyId
                map.setFeatureState({ source: COUNTRIES_SOURCE, id: polyId }, { hover: true })
              }
              map.getCanvas().style.cursor = 'pointer'
            } else {
              map.getCanvas().style.cursor = 'crosshair'
            }
          })

          // Click — submit answer
          map.on('click', (e) => {
            if (phaseRef.current !== 'playing') return
            const features = map.queryRenderedFeatures(e.point, { layers: queryLayers })
            if (features.length > 0) {
              const name = features[0].properties?.ADMIN
              if (typeof name === 'string') handleMapClick(name)
            }
          })
        })

        mapRef.current = map
        setPhase('ready')
      } catch (err) {
        console.error('Daily challenge map init failed:', err)
        setPhase('ready')
      }
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sfState = createFeatureStateSetter(mapRef, COUNTRIES_SOURCE)
  const sfSmall = createFeatureStateSetter(mapRef, SMALL_COUNTRIES_SOURCE)

  // Handle map click
  const handleMapClick = useCallback((clickedName: string) => {
    const qi = currentIndexRef.current
    const q = questions[qi]
    if (!q) return

    const correct = clickedName === q.name
    // Progressive scoring: question N (1-indexed) gives N points
    const points = correct ? qi + 1 : 0

    if (correct) playCorrect()
    else playWrong()

    // Visual feedback on map
    const clickedId = nameToIdRef.current.get(clickedName)
    const targetId = nameToIdRef.current.get(q.name)
    const clickedSmallId = smallNameToIdRef.current.get(clickedName)
    const targetSmallId = smallNameToIdRef.current.get(q.name)

    if (correct && clickedId !== undefined) {
      sfState(clickedId, { correct: true })
      if (clickedSmallId !== undefined) sfSmall(clickedSmallId, { correct: true })
    } else {
      if (clickedId !== undefined) sfState(clickedId, { wrong: true })
      if (targetId !== undefined) sfState(targetId, { target: true })
      if (clickedSmallId !== undefined) sfSmall(clickedSmallId, { wrong: true })
      if (targetSmallId !== undefined) sfSmall(targetSmallId, { target: true })
    }

    setFeedbackCountry(clickedName)
    setFeedbackCorrect(correct)

    const answer: DailyAnswer = { question: q.name, correct, clicked: clickedName, points }
    answersRef.current = [...answersRef.current, answer]
    setAnswers(answersRef.current)
    setScore((prev) => prev + points)

    // Pause timer briefly during feedback
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    phaseRef.current = 'feedback'
    setPhase('feedback')

    feedbackTimerRef.current = setTimeout(() => {
      // Clear feedback states
      if (clickedId !== undefined) sfState(clickedId, { correct: false, wrong: false })
      if (targetId !== undefined) sfState(targetId, { target: false })
      if (clickedSmallId !== undefined) sfSmall(clickedSmallId, { correct: false, wrong: false })
      if (targetSmallId !== undefined) sfSmall(targetSmallId, { target: false })

      // Mark solved
      if (correct && clickedId !== undefined) {
        sfState(clickedId, { solved: true })
        if (clickedSmallId !== undefined) sfSmall(clickedSmallId, { solved: true })
      }

      setFeedbackCountry(null)
      setFeedbackCorrect(null)

      if (qi + 1 >= QUESTION_COUNT) {
        finishGame(answersRef.current)
      } else {
        currentIndexRef.current = qi + 1
        setCurrentIndex(qi + 1)
        phaseRef.current = 'playing'
        setPhase('playing')
      }
    }, 800) // Slightly faster feedback to keep pace with 60s timer
  }, [questions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdownNum(3)
    const interval = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          phaseRef.current = 'playing'
          setPhase('playing')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  // Global game timer — counts down from 60s
  useEffect(() => {
    if (phase !== 'playing') return

    timerRef.current = setInterval(() => {
      timeRemainingRef.current -= 0.1
      setTimeRemaining(timeRemainingRef.current)

      if (timeRemainingRef.current <= 10 && timeRemainingRef.current > 9.9) playTick()
      if (timeRemainingRef.current <= 5 && Math.abs(timeRemainingRef.current % 1) < 0.15) playTick()

      if (timeRemainingRef.current <= 0) {
        // Time's up — end the game immediately
        if (timerRef.current) clearInterval(timerRef.current)
        finishGame(answersRef.current)
      }
    }, 100)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  function startGame() {
    setCurrentIndex(0)
    currentIndexRef.current = 0
    setAnswers([])
    answersRef.current = []
    setScore(0)
    timeRemainingRef.current = GAME_TIME
    setTimeRemaining(GAME_TIME)
    playGameStart()
    phaseRef.current = 'countdown'
    setPhase('countdown')
  }

  async function finishGame(finalAnswers: DailyAnswer[]) {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null }
    playGameOver()
    phaseRef.current = 'results'
    setPhase('results')

    const finalCorrect = finalAnswers.filter((a) => a.correct).length
    const finalAccuracy = finalAnswers.length > 0 ? finalCorrect / finalAnswers.length : 0
    let finalScore = finalAnswers.reduce((s, a) => s + a.points, 0)

    // Perfect bonus: all 15 correct = +30 bonus points + 1 carrot
    const isPerfect = finalCorrect === QUESTION_COUNT
    if (isPerfect) finalScore += PERFECT_BONUS
    setScore(finalScore)

    const stars = calculateStars({ mode: 'classic', correctCount: finalCorrect, totalQuestions: QUESTION_COUNT, accuracy: finalAccuracy })

    if (user && !isGuest) {
      const result = await submitDailyChallengeResult({
        userId: user.id,
        score: finalScore,
        correctCount: finalCorrect,
        totalQuestions: QUESTION_COUNT,
        stars,
        elapsed: GAME_TIME - Math.max(0, timeRemainingRef.current),
        currentXp: user.xp,
      })

      if (result) {
        setRewardResult(result)
        if (result.totalCoins > 0) updateCredits(result.totalCoins)
        if (result.carrots > 0) updateCarrots(result.carrots)
        if (result.xpEarned > 0) updateXp(result.xpEarned, result.newLevel)
        playCreditEarned()
        if (result.leveledUp) setTimeout(playLevelUp, 500)
      }
    }

    const lb = await getDailyChallengeLeaderboard()
    setLeaderboard(lb)
  }

  const stars = useMemo(() => {
    if (phase !== 'results') return 0
    return calculateStars({ mode: 'classic', correctCount, totalQuestions: QUESTION_COUNT, accuracy: totalQuestions > 0 ? correctCount / totalQuestions : 0 })
  }, [phase, correctCount, totalQuestions])

  const isPerfect = correctCount === QUESTION_COUNT && phase === 'results'

  return (
    <div className="relative w-full h-screen overflow-hidden bg-geo-bg">
      {/* Map container — always rendered */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Loading overlay */}
      {phase === 'loading' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-geo-bg/80 backdrop-blur-sm">
          <p className="text-geo-on-surface-dim font-body">Loading daily challenge...</p>
        </div>
      )}

      {/* Already completed */}
      {phase === 'already_done' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-geo-bg/80 backdrop-blur-sm p-4">
          <div className="glass-panel p-8 max-w-sm text-center">
            <p className="text-4xl mb-3">✅</p>
            <h2 className="text-xl font-headline font-extrabold text-geo-on-surface uppercase mb-2">Already Completed</h2>
            <p className="text-geo-on-surface-dim text-sm font-body mb-4">
              You&apos;ve already finished today&apos;s challenge. Come back tomorrow!
            </p>
            <button onClick={() => router.push(prefixPath('/'))} className="btn-primary px-8 py-3">{t('backToMenu')}</button>
          </div>
        </div>
      )}

      {/* Ready to start */}
      {phase === 'ready' && challenge && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-geo-bg/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 max-w-sm text-center">
            <p className="text-4xl mb-3">🏆</p>
            <h2 className="text-2xl font-headline font-extrabold text-geo-tertiary-bright uppercase mb-1">Daily Challenge</h2>
            <p className="text-geo-on-surface-dim text-sm font-body mb-1">
              Find {QUESTION_COUNT} countries in {GAME_TIME} seconds
            </p>
            <p className="text-geo-on-surface-dim text-xs font-body mb-1">
              Each correct answer scores more points than the last
            </p>
            <p className="text-xs text-geo-on-surface-dim font-body mb-6">
              All {QUESTION_COUNT} correct = +{PERFECT_BONUS} bonus + 🥕
            </p>
            {isGuest && (
              <p className="text-xs text-geo-error font-body mb-4">Sign in to save your results and earn rewards!</p>
            )}
            <button onClick={startGame} className="btn-primary px-10 py-3 text-lg">Start</button>
            <div className="mt-4">
              <button onClick={() => router.push(prefixPath('/'))} className="text-geo-on-surface-dim text-sm font-headline hover:text-geo-on-surface">
                ← {t('back')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.p
              key={countdownNum}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-8xl font-headline font-extrabold text-geo-primary text-glow-primary drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)]"
            >
              {countdownNum}
            </motion.p>
          </AnimatePresence>
        </div>
      )}

      {/* HUD during gameplay */}
      {(phase === 'playing' || phase === 'feedback') && currentQ && (
        <>
          {/* Question card — top center */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="glass-panel px-3 py-2 sm:px-4 2xl:px-6 2xl:py-3 text-center min-w-[200px] sm:min-w-[280px]">
              <p className="text-[10px] font-headline font-bold text-geo-tertiary-bright uppercase tracking-widest mb-1">
                Daily Challenge — {currentIndex + 1}/{QUESTION_COUNT}
              </p>
              <p className="text-xl font-headline font-extrabold text-geo-on-surface">
                {t('find' as keyof Translations)} <span className="text-geo-primary text-glow-primary">{currentQ.name}</span>
              </p>
              <p className="text-[10px] font-headline text-geo-on-surface-dim mt-0.5">
                +{currentIndex + 1} {currentIndex + 1 === 1 ? 'point' : 'points'}
              </p>
            </div>
          </div>

          {/* Timer + Score — bottom center */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="glass-panel px-4 py-2 sm:px-5">
              <div className="flex items-center gap-4 text-sm font-headline font-bold">
                <span className={cn(
                  'tabular-nums',
                  timeRemaining <= 10 ? 'text-geo-error' : 'text-geo-on-surface',
                )}>
                  ⏱ {Math.ceil(Math.max(0, timeRemaining))}s
                </span>
                <span className="text-geo-primary">{score} pts</span>
                <span className="text-geo-on-surface-dim">{correctCount} ✓</span>
              </div>
              {/* Global timer bar */}
              <div className="h-1.5 rounded-full bg-geo-surface-high/50 mt-1.5 overflow-hidden min-w-[200px]">
                <div
                  className={cn('h-full rounded-full transition-all duration-100', timeRemaining > 10 ? 'bg-geo-primary' : 'bg-geo-error')}
                  style={{ width: `${(Math.max(0, timeRemaining) / GAME_TIME) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Feedback overlay */}
          {feedbackCountry && feedbackCorrect !== null && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'px-5 py-2 rounded-xl font-headline font-extrabold text-lg',
                  feedbackCorrect ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white',
                )}
              >
                {feedbackCorrect ? `✓ +${currentIndex + 1}` : `✗ ${currentQ.name}`}
              </motion.div>
            </div>
          )}
        </>
      )}

      {/* Results */}
      {phase === 'results' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-geo-bg/80 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            <StarRating stars={stars as 0 | 1 | 2 | 3} />

            <h2 className="text-2xl font-headline font-extrabold text-geo-on-surface uppercase text-center mt-3 mb-4">
              Daily Challenge Complete
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-geo-surface-high/50 rounded-2xl p-3 text-center border border-geo-outline-dim/20">
                <p className="text-[10px] text-geo-on-surface-dim font-headline font-bold uppercase tracking-widest">Score</p>
                <p className="text-2xl font-headline font-extrabold text-geo-primary">{score}</p>
              </div>
              <div className="bg-geo-surface-high/50 rounded-2xl p-3 text-center border border-geo-outline-dim/20">
                <p className="text-[10px] text-geo-on-surface-dim font-headline font-bold uppercase tracking-widest">Correct</p>
                <p className="text-2xl font-headline font-extrabold text-geo-secondary">{correctCount}/{QUESTION_COUNT}</p>
              </div>
            </div>

            {isPerfect && (
              <div className="text-center mb-4 p-3 rounded-2xl bg-geo-tertiary-bright/10 border border-geo-tertiary-bright/30">
                <p className="text-lg font-headline font-extrabold text-geo-tertiary-bright">
                  🎉 PERFECT! +{PERFECT_BONUS} bonus + 🥕
                </p>
              </div>
            )}

            {rewardResult && (
              <div className="glass-panel p-3 mb-4 space-y-1">
                <p className="text-[10px] font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest mb-1">Rewards</p>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-geo-on-surface-dim">💰 Coins</span>
                  <span className="text-geo-tertiary-bright font-bold">+{rewardResult.totalCoins}</span>
                </div>
                {rewardResult.carrots > 0 && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-geo-on-surface-dim">🥕 Carrots</span>
                    <span className="text-orange-400 font-bold">+{rewardResult.carrots}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-body">
                  <span className="text-geo-on-surface-dim">⚡ XP</span>
                  <span className="text-geo-secondary font-bold">+{rewardResult.xpEarned}</span>
                </div>
              </div>
            )}

            {leaderboard.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest mb-2">Today&apos;s Rankings</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {leaderboard.map((entry, i) => {
                    const isMe = user?.id === entry.user_id
                    return (
                      <div key={entry.id} className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm',
                        isMe ? 'bg-geo-primary/10 border border-geo-primary/30' : 'bg-geo-surface-high/30',
                      )}>
                        <span className="w-5 text-xs font-headline font-bold text-geo-on-surface-dim">{i + 1}</span>
                        <span>{entry.avatar ?? '🌍'}</span>
                        {entry.level && <LevelBadge level={entry.level} />}
                        <span className={cn('flex-1 truncate font-body', isMe ? 'text-geo-primary font-bold' : 'text-geo-on-surface')}>
                          {entry.nickname ?? 'Anonymous'}
                        </span>
                        <span className="font-headline font-bold text-xs text-geo-on-surface-dim">{entry.score}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Answer breakdown */}
            <details className="mb-4">
              <summary className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest cursor-pointer hover:text-geo-on-surface mb-2">
                {t('answerDetails')}
              </summary>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {answers.map((a, i) => (
                  <div key={i} className={cn(
                    'flex items-center justify-between px-3 py-1.5 rounded-xl text-sm',
                    a.correct ? 'bg-geo-primary/10 text-geo-primary-dim' : 'bg-geo-error/10 text-geo-error',
                  )}>
                    <span className="font-body">{a.question}</span>
                    <span className="font-headline font-bold">{a.correct ? `+${a.points}` : '0'}</span>
                  </div>
                ))}
              </div>
            </details>

            <button onClick={() => router.push(prefixPath('/'))} className="btn-primary w-full py-3 text-sm">
              {t('backToMenu')}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
