'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  US_STATES, US_REGION_VIEWS, STATE_COLORS,
  filterStatesByDifficulty, getStateTier, TIER_POINTS,
  type USStateDifficulty,
} from '@/lib/usStates'
import MapBackground from '@/components/home/MapBackground'
import FloatingFlags from '@/components/home/FloatingFlags'
import GameAdvisor from '@/components/game/GameAdvisor'
import ThemeToggle from '@/components/ThemeToggle'
import ConfirmDialog from '@/components/game/ConfirmDialog'
import Countdown from '@/components/game/Countdown'
import HurryUp from '@/components/game/HurryUp'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import {
  playCorrect, playWrong, playGameStart, playGameOver,
  playLifeLost, playTick, playClick, startMusic, stopMusic, startMenuMusic,
} from '@/lib/sounds'
import { getTheme, mapBgColor, countryFillColor, countryHoverColor, countryLineColor, countryHoverLineColor, type Theme } from '@/lib/theme'
import { centroid, createFeatureStateSetter, shuffle } from '@/lib/mapHelpers'
import { useMapThemeListener } from '@/hooks/useMapThemeListener'
import { useGameRewards } from '@/hooks/useGameRewards'
import { useBasePath } from '@/lib/basePath'
import StarRating from '@/components/credits/StarRating'
import CreditBreakdown from '@/components/credits/CreditBreakdown'
import XpProgressBar from '@/components/xp/XpProgressBar'
import { useAuth } from '@/lib/auth/context'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase = 'idle' | 'playing' | 'feedback' | 'results'
type USGameMode = 'classic' | 'timed' | 'marathon' | 'survival' | 'practice'

interface ModeConfig {
  mode: USGameMode
  label: string
  totalQuestions: number | null
  globalTimeLimit: number | null
  perQuestionTime: number | null
  feedbackDelay: number
  lives: number | null
}

const MODES: Record<USGameMode, ModeConfig> = {
  classic:  { mode: 'classic',  label: 'Classic',     totalQuestions: 10,   globalTimeLimit: null, perQuestionTime: 15,  feedbackDelay: 1000, lives: null },
  timed:    { mode: 'timed',    label: 'Time Attack',  totalQuestions: null, globalTimeLimit: 60,   perQuestionTime: null, feedbackDelay: 1000, lives: null },
  marathon: { mode: 'marathon', label: 'Marathon',     totalQuestions: null, globalTimeLimit: null, perQuestionTime: null, feedbackDelay: 1000, lives: null },
  survival: { mode: 'survival', label: 'Survival',     totalQuestions: null, globalTimeLimit: null, perQuestionTime: 15,  feedbackDelay: 1000, lives: 3 },
  practice: { mode: 'practice', label: 'Practice',     totalQuestions: null, globalTimeLimit: null, perQuestionTime: null, feedbackDelay: 1000, lives: null },
}

const MODE_KEYS: USGameMode[] = ['classic', 'timed', 'marathon', 'survival', 'practice']
const DIFFICULTIES: { value: USStateDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
]
const LIVES_PER_LIFE_BACK = 10

interface Question { name: string; index: number }
interface Answer { question: Question; correct: boolean; selected: string | null; score: number; timeUsed: number }

// ---------------------------------------------------------------------------
// Map constants
// ---------------------------------------------------------------------------
const SOURCE_ID = 'us-states'
const FILL_LAYER = 'us-states-fill'
const LINE_LAYER = 'us-states-line'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function USStatesPage() {
  const router = useRouter()
  const { prefixPath } = useBasePath()
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartRef = useRef(false)
  const hoveredIdRef = useRef<number | null>(null)
  const nameToIdRef = useRef<Map<string, number>>(new Map())
  const centroidsRef = useRef<Map<string, [number, number]>>(new Map())
  const labelFeaturesRef = useRef<GeoJSON.Feature[]>([])

  // Menu state
  const [selectedMode, setSelectedMode] = useState<USGameMode>('classic')
  const [selectedDifficulty, setSelectedDifficulty] = useState<USStateDifficulty>('easy')

  // Auto-start from URL params (e.g. /game/us-states?mode=classic&difficulty=easy)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode') as USGameMode | null
    const diff = params.get('difficulty') as USStateDifficulty | null
    if (mode && diff) {
      setSelectedMode(mode)
      setSelectedDifficulty(diff)
      autoStartRef.current = true
    }
  }, [])

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [showCountdown, setShowCountdown] = useState(false)
  const [showHurryUp, setShowHurryUp] = useState(false)

  // Game state
  const [phase, setPhase] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const [questions, setQuestions] = useState<Question[]>([])
  const questionsRef = useRef<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentIndexRef = useRef(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const livesRef = useRef(3)
  const [streak, setStreak] = useState(0)
  const streakRef = useRef(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const timeRemainingRef = useRef(0)
  const [elapsed, setElapsed] = useState(0)
  const [feedbackState, setFeedbackState] = useState<string | null>(null)
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null)
  const [correctStates, setCorrectStates] = useState<Set<string>>(new Set())
  const modeConfigRef = useRef<ModeConfig>(MODES.classic)

  // Player name / scores
  const [playerName, setPlayerName] = useState('')
  const [saved, setSaved] = useState(false)

  // ---------------------------------------------------------------------------
  // Map init
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      try {
        const maplibregl = (await import('maplibre-gl')).default
        const res = await fetch('/data/us-states.geojson')
        if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`)
        const geojson: GeoJSON.FeatureCollection = await res.json()
        if (cancelled || !containerRef.current) return

        const nameToId = new Map<string, number>()
        geojson.features.forEach((f, i) => {
          const name = f.properties?.NAME
          if (typeof name === 'string') nameToId.set(name, i)
        })
        nameToIdRef.current = nameToId

        // Compute centroids for label placement
        const centroids = new Map<string, [number, number]>()
        geojson.features.forEach((f) => {
          const name = f.properties?.NAME
          if (typeof name !== 'string') return
          const [lng, lat] = centroid(f.geometry)
          if (lng !== 0 || lat !== 0) centroids.set(name, [lng, lat])
        })
        centroidsRef.current = centroids

        const map = new maplibregl.Map({
          container: containerRef.current!,
          style: {
            version: 8,
            name: 'US States',
            sources: {},
            layers: [{ id: 'background', type: 'background', paint: { 'background-color': mapBgColor() } }],
          },
          center: [-98, 39],
          zoom: 3.5,
          attributionControl: false,
          renderWorldCopies: false,
        })

        map.addControl(new maplibregl.NavigationControl(), 'top-right')
        map.getCanvas().style.cursor = 'crosshair'

        map.on('load', () => {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson, generateId: true })

          map.addLayer({
            id: FILL_LAYER,
            type: 'fill',
            source: SOURCE_ID,
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
                ['boolean', ['feature-state', 'correct'], false], 0.9,
                ['boolean', ['feature-state', 'wrong'], false], 0.9,
                ['boolean', ['feature-state', 'target'], false], 0.9,
                ['boolean', ['feature-state', 'solved'], false], 0.85,
                ['boolean', ['feature-state', 'hover'], false], 0.7,
                0.95,
              ],
            },
          })

          map.addLayer({
            id: LINE_LAYER,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': [
                'case',
                ['boolean', ['feature-state', 'correct'], false], '#16a34a',
                ['boolean', ['feature-state', 'wrong'], false], '#ea580c',
                ['boolean', ['feature-state', 'target'], false], '#2563eb',
                ['boolean', ['feature-state', 'solved'], false], '#334155',
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

          // Labels source — updated dynamically as states are solved
          map.addSource('state-labels', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })
          map.addLayer({
            id: 'state-labels-layer',
            type: 'symbol',
            source: 'state-labels',
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'text-color': '#1e293b',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            },
          })

          // Hover
          map.on('mousemove', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] })
            if (hoveredIdRef.current !== null) {
              map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false })
              hoveredIdRef.current = null
            }
            if (features.length > 0) {
              const name = features[0].properties?.NAME
              const polyId = name ? nameToId.get(name) : undefined
              if (polyId !== undefined) {
                hoveredIdRef.current = polyId
                map.setFeatureState({ source: SOURCE_ID, id: polyId }, { hover: true })
              }
              map.getCanvas().style.cursor = 'pointer'
            } else {
              map.getCanvas().style.cursor = 'crosshair'
            }
          })

          // Click
          map.on('click', (e) => {
            if (phaseRef.current !== 'playing') return
            const features = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] })
            if (features.length > 0) {
              const name = features[0].properties?.NAME
              if (typeof name === 'string') handleAnswer(name)
            }
          })

          // Auto-start game if URL params were set
          if (autoStartRef.current) {
            autoStartRef.current = false
            setTimeout(() => launchWithCountdown(handleStartGame), 200)
          }
        })

        mapRef.current = map
      } catch (err) {
        console.error('Map init failed:', err)
      }
    }

    init()
    return () => {
      cancelled = true
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const usThemeUpdates = useMemo(() => [
    { layer: 'background', property: 'background-color', value: (t: Theme) => mapBgColor(t) },
    {
      layer: 'states-line', property: 'line-color',
      value: (t: Theme) => [
        'case',
        ['boolean', ['feature-state', 'correct'], false], '#16a34a',
        ['boolean', ['feature-state', 'wrong'], false], '#ea580c',
        ['boolean', ['feature-state', 'target'], false], '#2563eb',
        ['boolean', ['feature-state', 'solved'], false], '#334155',
        countryLineColor(t),
      ],
    },
  ], [])
  useMapThemeListener(mapRef, usThemeUpdates)

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const sfState = createFeatureStateSetter(mapRef, SOURCE_ID)

  function clearAllFeatureStates() {
    const lookup = nameToIdRef.current
    lookup.forEach((id) => {
      sfState(id, { correct: false, wrong: false, target: false, solved: false, hover: false })
    })
    // Clear labels
    labelFeaturesRef.current = []
    updateLabels()
  }

  function addLabel(stateName: string) {
    const center = centroidsRef.current.get(stateName)
    if (!center) return
    labelFeaturesRef.current.push({
      type: 'Feature',
      properties: { name: stateName },
      geometry: { type: 'Point', coordinates: center },
    })
    updateLabels()
  }

  function updateLabels() {
    const map = mapRef.current as { getSource: (id: string) => { setData: (d: GeoJSON.FeatureCollection) => void } | undefined } | null
    const src = map?.getSource('state-labels')
    src?.setData({ type: 'FeatureCollection', features: labelFeaturesRef.current })
  }

  function flyTo(region: string) {
    const view = US_REGION_VIEWS[region] ?? US_REGION_VIEWS.All
    const map = mapRef.current as { flyTo?: (opts: { center: [number, number]; zoom: number; duration: number }) => void } | null
    map?.flyTo?.({ center: view.center, zoom: view.zoom, duration: 1200 })
  }

  // ---------------------------------------------------------------------------
  // Start game
  // ---------------------------------------------------------------------------
  function handleStartGame() {
    const config = MODES[selectedMode]
    modeConfigRef.current = config

    // Build question pool
    const allNames = US_STATES.map((s) => s.name)
    let pool: string[]
    if (selectedMode === 'marathon') {
      pool = allNames
    } else {
      pool = filterStatesByDifficulty(allNames, selectedDifficulty)
      if (pool.length === 0) pool = allNames
    }

    // Shuffle
    const shuffled = shuffle(pool)
    const count = config.totalQuestions ?? shuffled.length
    const qs: Question[] = shuffled.slice(0, count).map((name, i) => ({ name, index: i }))

    questionsRef.current = qs
    currentIndexRef.current = 0
    phaseRef.current = 'playing'
    livesRef.current = config.lives ?? 3
    streakRef.current = 0
    timeRemainingRef.current = config.globalTimeLimit ?? config.perQuestionTime ?? 0

    setQuestions(qs)
    setCurrentIndex(0)
    setAnswers([])
    setScore(0)
    setLives(config.lives ?? 3)
    setStreak(0)
    setTimeRemaining(config.globalTimeLimit ?? config.perQuestionTime ?? 0)
    setElapsed(0)
    setFeedbackState(null)
    setFeedbackCorrect(null)
    setCorrectStates(new Set())
    setPhase('playing')
    setSaved(false)

    clearAllFeatureStates()
    flyTo('All')
    playGameStart()
    startMusic()
  }

  // ---------------------------------------------------------------------------
  // Answer handling
  // ---------------------------------------------------------------------------
  const handleAnswer = useCallback((selectedName: string) => {
    if (phaseRef.current !== 'playing') return
    const qs = questionsRef.current
    const idx = currentIndexRef.current
    const q = qs[idx]
    if (!q) return

    const correct = selectedName === q.name
    const cfg = modeConfigRef.current
    const perQ = cfg.perQuestionTime
    const used = perQ ? perQ - timeRemainingRef.current : 0
    const tier = getStateTier(q.name)
    const pts = correct ? TIER_POINTS[tier] : 0

    const answer: Answer = { question: q, correct, selected: selectedName, score: pts, timeUsed: used }

    // Lives
    let newLives = livesRef.current
    let newStreak = streakRef.current
    if (cfg.lives !== null) {
      if (correct) {
        newStreak = streakRef.current + 1
        if (newStreak > 0 && newStreak % LIVES_PER_LIFE_BACK === 0) newLives++
      } else {
        newLives--
        newStreak = 0
      }
    }
    livesRef.current = newLives
    streakRef.current = newStreak

    // Feedback visuals
    const lookup = nameToIdRef.current
    if (correct) {
      playCorrect()
      const id = lookup.get(q.name)
      if (id !== undefined) sfState(id, { correct: true })
    } else {
      playWrong()
      if (cfg.lives !== null) playLifeLost()
      const wrongId = lookup.get(selectedName)
      if (wrongId !== undefined) sfState(wrongId, { wrong: true })
      const targetId = lookup.get(q.name)
      if (targetId !== undefined) sfState(targetId, { target: true })
    }

    phaseRef.current = 'feedback'
    setPhase('feedback')
    setFeedbackState(q.name)
    setFeedbackCorrect(correct)
    setLives(newLives)
    setStreak(newStreak)
    setAnswers((prev) => [...prev, answer])
    setScore((prev) => prev + pts)
    if (correct) setCorrectStates((prev) => new Set(prev).add(q.name))

    // Auto-advance after delay
    setTimeout(() => {
      if (phaseRef.current !== 'feedback') return

      // Clear flash
      if (correct) {
        const id = lookup.get(q.name)
        if (id !== undefined) { sfState(id, { correct: false, solved: true }); addLabel(q.name) }
      } else {
        const wrongId = lookup.get(selectedName)
        if (wrongId !== undefined) sfState(wrongId, { wrong: false })
        const targetId = lookup.get(q.name)
        if (targetId !== undefined) sfState(targetId, { target: false })
      }

      // Check game over conditions
      const cfg2 = modeConfigRef.current
      if (cfg2.lives !== null && newLives <= 0) {
        endGame(); return
      }
      if (cfg2.globalTimeLimit && timeRemainingRef.current <= 0) {
        endGame(); return
      }
      if (currentIndexRef.current + 1 >= questionsRef.current.length) {
        endGame(); return
      }

      // Next question
      currentIndexRef.current++
      phaseRef.current = 'playing'
      setCurrentIndex(currentIndexRef.current)
      setPhase('playing')
      setFeedbackState(null)
      setFeedbackCorrect(null)
      if (cfg2.perQuestionTime) {
        timeRemainingRef.current = cfg2.perQuestionTime
        setTimeRemaining(cfg2.perQuestionTime)
      }
    }, modeConfigRef.current.feedbackDelay)
  }, [])

  function endGame() {
    phaseRef.current = 'results'
    setPhase('results')
    setFeedbackState(null)
    setFeedbackCorrect(null)
    playGameOver()
    stopMusic()
  }

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------
  // Timer — paused during countdown
  useEffect(() => {
    if (showCountdown) return
    if (phase === 'playing') {
      const cfg = modeConfigRef.current
      const hasTimer = cfg.globalTimeLimit || cfg.perQuestionTime
      timerRef.current = setInterval(() => {
        if (hasTimer) {
          timeRemainingRef.current = Math.max(0, timeRemainingRef.current - 0.1)
          setTimeRemaining(timeRemainingRef.current)
          if (timeRemainingRef.current <= 0) {
            if (cfg.globalTimeLimit) {
              endGame()
            } else if (cfg.perQuestionTime) {
              handleAnswer('')
            }
          } else if (timeRemainingRef.current <= 5 && Math.floor(timeRemainingRef.current * 10) % 10 === 0) {
            playTick()
          }
        }
        setElapsed((prev) => prev + 0.1)
      }, 100)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, showCountdown])

  // Menu music
  useEffect(() => {
    if (phase === 'idle') startMenuMusic()
  }, [phase])

  // Reset to idle
  function handleReset() {
    phaseRef.current = 'idle'
    setPhase('idle')
    clearAllFeatureStates()
    flyTo('All')
    startMenuMusic()
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const q = questions[currentIndex]
  const correctCount = useMemo(() => answers.filter((a) => a.correct).length, [answers])
  const cfg = MODES[selectedMode]
  const { user: authUser } = useAuth()

  const usAccuracy = answers.length > 0 ? correctCount / answers.length : 0
  const rewards = useGameRewards({
    phase,
    mode: 'us-states',
    difficulty: selectedDifficulty,
    correctCount,
    totalQuestions: answers.length || questions.length,
    accuracy: usAccuracy,
    maxStreak: streak,
  })
  const maxTime = cfg.globalTimeLimit ?? cfg.perQuestionTime ?? 0

  const advisorText = selectedMode === 'marathon'
    ? t('us.speech.marathon' as keyof Translations)
    : t(`us.speech.${selectedMode}` as keyof Translations).replace(
        '{pool}',
        t(`us.diff.${selectedDifficulty}.desc` as keyof Translations),
      )

  const pendingStartRef = useRef<(() => void) | null>(null)

  function launchWithCountdown(startFn: () => void) {
    pendingStartRef.current = startFn
    setShowCountdown(true)
  }

  function onCountdownComplete() {
    setShowCountdown(false)
    if (pendingStartRef.current) {
      pendingStartRef.current()
      pendingStartRef.current = null
    }
  }

  // Hurry up at 5 seconds remaining
  const hurryUpShownRef = useRef(false)
  useEffect(() => {
    if (phase === 'playing' && maxTime > 0 && timeRemaining <= 5 && timeRemaining > 0 && !hurryUpShownRef.current) {
      hurryUpShownRef.current = true
      setShowHurryUp(true)
      setTimeout(() => setShowHurryUp(false), 1500)
    }
    if (phase !== 'playing' || timeRemaining > 5) {
      hurryUpShownRef.current = false
    }
  }, [phase, timeRemaining, maxTime])

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Decorative background for menu / results */}
      {(phase === 'idle' || phase === 'results') && !showCountdown && (
        <>
          <MapBackground />
          <FloatingFlags />
        </>
      )}

      {/* Game map */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ visibility: (phase === 'idle' || phase === 'results') && !showCountdown ? 'hidden' : 'visible' }}
      />

      {/* HUD — playing & feedback */}
      {(phase === 'playing' || phase === 'feedback') && q && (
        <>
          {/* Question card — top center */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="glass-panel px-6 py-3 text-center">
              <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest">
                {t('find')} {currentIndex + 1} {t('of')} {questions.length}
              </p>
              <p className="text-2xl font-headline font-extrabold text-geo-on-surface uppercase tracking-wide mt-1">
                {q.name}
              </p>
            </div>
          </div>

          {/* Scoreboard — top right */}
          <div className="absolute top-4 right-4 z-10">
            <div className="glass-panel px-4 py-3 space-y-1 text-right min-w-[120px]">
              <div className="text-xs text-geo-on-surface-dim font-headline uppercase tracking-wider">{t('score')}</div>
              <div className="text-xl font-headline font-extrabold text-geo-primary">{score.toLocaleString()}</div>
              {cfg.lives !== null && (
                <div className="text-xs text-geo-error font-headline font-bold">{t('lives')}: {'❤️'.repeat(Math.max(0, lives))}</div>
              )}
              {maxTime > 0 && (
                <div className={`text-sm font-headline font-bold ${timeRemaining <= 5 ? 'text-geo-error animate-pulse' : 'text-geo-on-surface-dim'}`}>
                  {Math.ceil(timeRemaining)}s
                </div>
              )}
              <div className="text-[10px] text-geo-on-surface-dim font-body">
                {t('found')}: {correctCount}/{questions.length}
              </div>
            </div>
          </div>

          {/* Quit & Restart buttons */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button
              onClick={() => { playClick(); setShowQuitConfirm(true) }}
              className="px-5 py-3 rounded-full glass-panel border-geo-on-surface/30 text-geo-primary text-sm font-headline font-bold uppercase tracking-wider hover:text-geo-error hover:border-geo-error/30 transition-colors"
            >
              {t('quit')}
            </button>
            <button
              onClick={() => { playClick(); setShowRestartConfirm(true) }}
              className="px-5 py-3 rounded-full glass-panel border-geo-on-surface/30 text-geo-primary text-sm font-headline font-bold uppercase tracking-wider hover:text-geo-primary hover:border-geo-primary/30 transition-colors"
            >
              {t('restart')}
            </button>
            <ThemeToggle />
          </div>

          {/* Feedback overlay */}
          {phase === 'feedback' && feedbackState && feedbackCorrect !== null && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
              <div className={`glass-panel px-6 py-3 text-center ${feedbackCorrect ? 'border-green-500' : 'border-red-500'} border-2`}>
                <p className={`text-lg font-headline font-extrabold ${feedbackCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {feedbackCorrect ? t('correct') : t('wrong')}
                </p>
                {!feedbackCorrect && (
                  <p className="text-sm text-geo-on-surface-dim font-body mt-1">
                    {t('answer')} {feedbackState}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showQuitConfirm && (
        <ConfirmDialog
          title={t('quitGame')}
          message={t('progressLost')}
          confirmLabel={t('quit')}
          confirmVariant="danger"
          onCancel={() => setShowQuitConfirm(false)}
          onConfirm={() => { setShowQuitConfirm(false); stopMusic(); handleReset(); router.push(prefixPath('/?cat=mapGames&game=/game/us-states')) }}
        />
      )}
      {showRestartConfirm && (
        <ConfirmDialog
          title={`${t('restart')}?`}
          message={t('progressLost')}
          confirmLabel={t('restart')}
          onCancel={() => setShowRestartConfirm(false)}
          onConfirm={() => { setShowRestartConfirm(false); handleReset(); launchWithCountdown(handleStartGame) }}
        />
      )}

      {/* ================================================================== */}
      {/* MODE SELECTION — idle                                              */}
      {/* ================================================================== */}
      {phase === 'idle' && !showCountdown && (
        <div className="absolute inset-0 z-20 flex flex-col items-center px-4 pt-4 pb-4">
          <div className="absolute top-4 left-4 flex gap-2 z-30">
            <button
              onClick={() => { playClick(); router.push(prefixPath('/?cat=mapGames&game=/game/us-states')) }}
              className="btn-ghost px-3 py-1.5 text-sm flex items-center gap-1"
              aria-label={t('home')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {t('home')}
            </button>
            <button
              onClick={() => { playClick(); router.back() }}
              className="btn-ghost px-3 py-1.5 text-sm flex items-center gap-1"
              aria-label={t('back')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              {t('back')}
            </button>
          </div>
          <h1 className="text-6xl sm:text-7xl font-headline font-extrabold text-geo-on-surface italic uppercase tracking-tighter drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] text-center mt-6 mb-4 flex-shrink-0">
            World<span className="text-geo-primary text-glow-primary">Of</span>Carrots
          </h1>
          <div className="max-w-xl w-full flex-1 min-h-0 overflow-y-auto">
            <h2 className="text-2xl sm:text-3xl font-headline font-extrabold text-geo-on-surface italic uppercase tracking-tighter drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] text-center mb-1">
              {(() => { const w = t('usStatesMode').split(' '); const last = w.pop()!; return w.length ? <>{w.join(' ')} <span className="text-geo-primary text-glow-primary">{last}</span></> : <span className="text-geo-primary text-glow-primary">{last}</span>; })()}
            </h2>
            <p className="text-geo-on-surface-dim text-center mb-6 font-body text-sm">
              {t('usStatesSubtitle')}
            </p>

            {/* Game modes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
              {MODE_KEYS.map((m) => {
                const icons: Record<string, string> = { classic: '🎯', timed: '⏱️', marathon: '🏃', survival: '❤️', practice: '📝' }
                return (
                  <button
                    key={m}
                    onClick={() => { playClick(); setSelectedMode(m) }}
                    className={`group glass-panel p-3 sm:p-4 aspect-square flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      selectedMode === m
                        ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_20px_-5px_rgba(107,255,193,0.2)]'
                        : 'hover:border-geo-primary/40 hover:shadow-[0_0_30px_-10px_rgba(107,255,193,0.2)]'
                    }`}
                  >
                    <div className="text-2xl mb-2">{icons[m]}</div>
                    <p className={`text-sm font-headline font-extrabold uppercase tracking-wide ${
                      selectedMode === m ? 'text-geo-primary' : 'text-geo-on-surface group-hover:text-geo-primary transition-colors'
                    }`}>{t(`mode.${m}` as keyof Translations)}</p>
                    <p className="text-xs mt-1 text-geo-on-surface-dim leading-relaxed">{t(`mode.${m}.desc` as keyof Translations)}</p>
                  </button>
                )
              })}
              {/* Jigsaw — coming soon placeholder */}
              <div className="glass-panel p-3 sm:p-4 aspect-square flex flex-col items-center justify-center text-center opacity-70 cursor-not-allowed">
                <div className="text-2xl mb-2">🧩</div>
                <p className="text-sm font-headline font-extrabold uppercase tracking-wide text-white">{t('mode.jigsaw' as keyof Translations) || 'Jigsaw'}</p>
                <p className="text-xs mt-1 bg-geo-primary text-black font-headline font-bold leading-relaxed px-2 py-0.5 rounded-full">{t('comingSoon')}</p>
              </div>
            </div>

            {/* Difficulty */}
            <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectDifficulty')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {DIFFICULTIES.map((d) => {
                const isMarathon = selectedMode === 'marathon'
                const icons: Record<string, string> = { easy: '🟢', medium: '🟡', hard: '🟠', expert: '🔴' }
                return (
                  <button
                    key={d.value}
                    onClick={() => { if (!isMarathon) { playClick(); setSelectedDifficulty(d.value) } }}
                    disabled={isMarathon}
                    className={`glass-panel p-3 flex flex-col items-center text-center transition-all ${
                      isMarathon
                        ? 'opacity-30 cursor-not-allowed'
                        : selectedDifficulty === d.value
                          ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_15px_-5px_rgba(107,255,193,0.2)] cursor-pointer'
                          : 'hover:border-geo-primary/40 hover:shadow-[0_0_20px_-5px_rgba(107,255,193,0.15)] cursor-pointer'
                    }`}
                  >
                    <div className="text-xl mb-1">{icons[d.value]}</div>
                    <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                      isMarathon ? 'text-geo-on-surface-dim' : selectedDifficulty === d.value ? 'text-geo-primary' : 'text-geo-on-surface-dim'
                    }`}>{t(`diff.${d.value}` as keyof Translations)}</p>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => launchWithCountdown(handleStartGame)}
              className="btn-primary w-full py-4 text-lg"
            >
              {t('startGame')}
            </button>
          </div>

          {/* Game advisor */}
          <div className="hidden xl:block absolute left-[calc(50%+17rem)] top-1/2 -translate-y-1/2">
            <GameAdvisor text={advisorText} />
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* RESULTS                                                            */}
      {/* ================================================================== */}
      {phase === 'results' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-8 text-center max-h-[90vh] overflow-y-auto">
            {/* Stars */}
            {rewards && rewards.stars > 0 && <div className="mb-4"><StarRating stars={rewards.stars} /></div>}

            <h2 className="text-3xl font-headline font-extrabold text-geo-on-surface italic uppercase tracking-tighter mb-4">
              {correctCount === questions.length ? t('perfect') : t('gameOver')}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-panel p-3">
                <p className="text-[10px] text-geo-on-surface-dim font-headline font-bold uppercase tracking-widest">{t('score')}</p>
                <p className="text-2xl font-headline font-extrabold text-geo-primary">{score.toLocaleString()}</p>
              </div>
              <div className="glass-panel p-3">
                <p className="text-[10px] text-geo-on-surface-dim font-headline font-bold uppercase tracking-widest">{t('found')}</p>
                <p className="text-2xl font-headline font-extrabold text-geo-secondary">{correctCount}/{questions.length}</p>
              </div>
              <div className="glass-panel p-3">
                <p className="text-[10px] text-geo-on-surface-dim font-headline font-bold uppercase tracking-widest">{t('stat.accuracy')}</p>
                <p className="text-2xl font-headline font-extrabold text-geo-tertiary-bright">
                  {answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0}%
                </p>
              </div>
              <div className="glass-panel p-3">
                <p className="text-[10px] text-geo-on-surface-dim font-headline font-bold uppercase tracking-widest">{t('stat.time')}</p>
                <p className="text-2xl font-headline font-extrabold text-geo-on-surface">{Math.round(elapsed)}s</p>
              </div>
            </div>

            {/* XP Progress */}
            {rewards && rewards.xp.total > 0 && authUser && (
              <div className="mb-4 text-left">
                <XpProgressBar
                  totalXp={authUser.xp}
                  level={authUser.level}
                  xpEarned={rewards.xp.total}
                  leveledUp={rewards.leveledUp}
                  newLevel={rewards.newLevel}
                />
              </div>
            )}

            {/* Credits Earned */}
            {rewards && rewards.breakdown.total > 0 && (
              <div className="mb-5 text-left">
                <CreditBreakdown breakdown={rewards.breakdown} />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { handleReset(); launchWithCountdown(handleStartGame) }}
                className="btn-primary flex-1 py-3"
              >
                {t('playAgain')}
              </button>
              <button
                onClick={handleReset}
                className="btn-ghost flex-1 py-3"
              >
                {t('backToMenu')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCountdown && <Countdown onComplete={onCountdownComplete} />}
      {showHurryUp && <HurryUp />}
    </div>
  )
}
