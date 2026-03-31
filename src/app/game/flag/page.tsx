'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cn } from '@/lib/cn'
import { useGameStore } from '@/store/gameStore'
import { getCountriesFromGeoJSON, GAME_MODES } from '@/lib/gameEngine'
import { DIFFICULTIES, type Difficulty } from '@/lib/countryDifficulty'
import { getHighScores } from '@/lib/highScores'
import {
  COUNTRIES_SOURCE,
  COUNTRIES_FILL_LAYER,
  COUNTRIES_LINE_LAYER,
  SMALL_COUNTRIES_SOURCE,
  SMALL_COUNTRIES_CIRCLE_LAYER,
  SMALL_COUNTRIES_RING_LAYER,
  initialViewState,
  REGION_VIEWS,
} from '@/lib/mapConfig'
import {
  getFlagUrl,
  CONTINENT_DISPLAY,
  getCountriesNotOnContinent,
  getHint2Eliminations,
  getHint3Eliminations,
} from '@/lib/flagHints'
import type { GameMode, Question } from '@/types/game'
import FlagQuestionCard from '@/components/game/FlagQuestionCard'
import ScoreBoard from '@/components/game/ScoreBoard'
import FeedbackOverlay from '@/components/game/FeedbackOverlay'
import ResultScreen from '@/components/game/ResultScreen'
import { useGameRewards } from '@/hooks/useGameRewards'
import { calculateResults } from '@/lib/gameEngine'
import GameAdvisor from '@/components/game/GameAdvisor'
import MapBackground from '@/components/home/MapBackground'
import FloatingFlags from '@/components/home/FloatingFlags'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { playCorrect, playWrong, playGameStart, playGameOver, playLifeLost, playHintUsed, playSkip, playHintEarned, playTick, playClick, startMusic, stopMusic, startMenuMusic, warmUpAudio } from '@/lib/sounds'
import { mapBgColor, countryHoverColor, countryHoverLineColor, countryLineColor, circleStrokeColor, continentFillExpression } from '@/lib/theme'
import { buildSmallCountryPoints, createFeatureStateSetter, zoomScaledCircleRadius } from '@/lib/mapHelpers'
import { useMapThemeListener, countryMapThemeUpdates } from '@/hooks/useMapThemeListener'
import ThemeToggle from '@/components/ThemeToggle'
import ConfirmDialog from '@/components/game/ConfirmDialog'
import { useBasePath } from '@/lib/basePath'
import Countdown from '@/components/game/Countdown'
import HurryUp from '@/components/game/HurryUp'

// Initial hints and earning rate
const INITIAL_HINTS = 3
const HINTS_EARN_EVERY = 10

interface CountryContinent {
  name: string
  continent: string
}

export default function FlagGamePage() {
  const { t, tc } = useTranslation()
  const router = useRouter()
  const { prefixPath } = useBasePath()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hoveredIdRef = useRef<number | null>(null)
  const flashedIdsRef = useRef<Set<number>>(new Set())
  const nameToIdRef = useRef<Map<string, number>>(new Map())
  const smallNameToIdRef = useRef<Map<string, number>>(new Map())
  const countryListRef = useRef<CountryContinent[]>([])

  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy')
  const [selectedRegion, setSelectedRegion] = useState('World')
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [showCountdown, setShowCountdown] = useState(false)
  const [showHurryUp, setShowHurryUp] = useState(false)

  // Flag game-specific state
  const [hintsRemaining, setHintsRemaining] = useState(INITIAL_HINTS)
  const [hintLevel, setHintLevel] = useState(0) // 0-3 for current question
  const [showMobileHints, setShowMobileHints] = useState(false)
  const [eliminatedCountries, setEliminatedCountries] = useState<Set<string>>(new Set())
  const [correctStreak, setCorrectStreak] = useState(0) // separate from store streak for hint earning
  const [hintBonusShown, setHintBonusShown] = useState(false)
  const usedAnyHintsRef = useRef(false)

  // Skip tracking — skipped questions get re-queued at the end
  const skippedRef = useRef<Question[]>([])
  const [skippedCount, setSkippedCount] = useState(0)

  const {
    phase, mode, modeConfig, variant, questions, currentIndex, answers, score,
    timeRemaining, elapsed, lives, streak, correctCountries,
    feedbackCountry, feedbackCorrect,
    startGame, nextQuestion, reset,
  } = useGameStore()

  const q = questions[currentIndex]
  const maxTime = modeConfig.perQuestionTime ?? 0
  const correctCount = useMemo(() => answers.filter((a) => a.correct).length, [answers])

  // Toggle body class for hiding TopBar on mobile during gameplay
  useEffect(() => {
    const active = phase === 'playing' || phase === 'feedback'
    document.body.classList.toggle('game-active', active)
    return () => { document.body.classList.remove('game-active') }
  }, [phase])

  // Track if any hints were used during the game
  useEffect(() => {
    if (hintLevel > 0) usedAnyHintsRef.current = true
  }, [hintLevel])

  // Calculate rewards when game ends
  const flagGameResults = useMemo(() => {
    if (phase !== 'results' || answers.length === 0) return { correctCount: 0, totalQuestions: 0, accuracy: 0 }
    return calculateResults(answers)
  }, [phase, answers])

  const rewards = useGameRewards({
    phase,
    mode: 'flag',
    difficulty: selectedDifficulty,
    correctCount: flagGameResults.correctCount,
    totalQuestions: flagGameResults.totalQuestions,
    accuracy: flagGameResults.accuracy,
    usedHints: usedAnyHintsRef.current,
  })

  // Get current flag URL
  const currentFlagUrl = q ? getFlagUrl(q.country.name, q.country.iso_a3) : null

  // Get continent name for current question
  const currentContinent = q
    ? countryListRef.current.find((c) => c.name === q.country.name)?.continent ?? null
    : null
  const continentDisplay = currentContinent ? (CONTINENT_DISPLAY[currentContinent] ?? currentContinent) : null

  // Reset hint state when question changes
  useEffect(() => {
    if (phase === 'playing') {
      setHintLevel(0)
      setEliminatedCountries(new Set())
      setHintBonusShown(false)
    }
  }, [phase, currentIndex])

  // Track correct streak for hint earning
  useEffect(() => {
    if (phase !== 'feedback') return
    const last = answers[answers.length - 1]
    if (!last) return

    if (last.correct) {
      const newStreak = correctStreak + 1
      setCorrectStreak(newStreak)
      if (newStreak > 0 && newStreak % HINTS_EARN_EVERY === 0) {
        setHintsRemaining((h) => h + 1)
        setHintBonusShown(true)
        playHintEarned()
      }
    } else {
      setCorrectStreak(0)
    }
  }, [phase, answers.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply eliminations to map
  const applyEliminations = useCallback((eliminated: Set<string>) => {
    const map = mapRef.current as {
      setFeatureState: (t: { source: string; id: number }, s: Record<string, boolean>) => void
    } | null
    if (!map) return
    const lookup = nameToIdRef.current
    lookup.forEach((id, name) => {
      map.setFeatureState(
        { source: COUNTRIES_SOURCE, id },
        { eliminated: eliminated.has(name) },
      )
    })
  }, [])

  // Handle hint usage
  const handleUseHint = useCallback(() => {
    if (hintsRemaining <= 0 || hintLevel >= 3 || !q || !currentContinent) return

    playHintUsed()
    const newLevel = hintLevel + 1
    setHintLevel(newLevel)
    setHintsRemaining((h) => h - 1)

    let newEliminated: Set<string>

    if (newLevel === 1) {
      // Reveal continent + eliminate countries not on that continent
      const toEliminate = getCountriesNotOnContinent(countryListRef.current, currentContinent)
      newEliminated = new Set(toEliminate)
    } else if (newLevel === 2) {
      // Eliminate non-lookalike countries more aggressively
      const toEliminate = getHint2Eliminations(
        q.country.name,
        currentContinent,
        countryListRef.current,
      )
      newEliminated = new Set(toEliminate)
    } else {
      // Hint 3: very aggressive elimination
      const toEliminate = getHint3Eliminations(q.country.name, countryListRef.current)
      newEliminated = new Set(toEliminate)
    }

    // Never eliminate already-solved countries
    correctCountries.forEach((name) => newEliminated.delete(name))

    setEliminatedCountries(newEliminated)
    applyEliminations(newEliminated)
  }, [hintsRemaining, hintLevel, q, currentContinent, correctCountries, applyEliminations])

  // Handle skipping — defer question to end of queue
  const handleSkip = useCallback(() => {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') return

    playSkip()
    const currentQ = state.questions[state.currentIndex]
    skippedRef.current.push(currentQ)
    setSkippedCount(skippedRef.current.length)

    const hasNext = state.currentIndex + 1 < state.questions.length

    if (hasNext) {
      useGameStore.setState({
        currentIndex: state.currentIndex + 1,
        timeRemaining: state.modeConfig.perQuestionTime ?? state.timeRemaining,
      })
    } else if (skippedRef.current.length > 0) {
      // Re-queue all skipped questions
      const skipped = skippedRef.current.map((sq, i) => ({
        ...sq,
        index: state.questions.length + i,
      }))
      skippedRef.current = []
      setSkippedCount(0)
      useGameStore.setState({
        questions: [...state.questions, ...skipped],
        currentIndex: state.currentIndex + 1,
        timeRemaining: state.modeConfig.perQuestionTime ?? state.timeRemaining,
      })
    }
  }, [])

  // Wrap nextQuestion to re-queue skipped questions before the store checks end-of-game
  const handleNextQuestion = useCallback(() => {
    const state = useGameStore.getState()
    const isLast = state.currentIndex + 1 >= state.questions.length

    if (isLast && skippedRef.current.length > 0) {
      const skipped = skippedRef.current.map((sq, i) => ({
        ...sq,
        index: state.questions.length + i,
      }))
      skippedRef.current = []
      setSkippedCount(0)
      useGameStore.setState({
        questions: [...state.questions, ...skipped],
      })
    }

    nextQuestion()
  }, [nextQuestion])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      try {
        const maplibregl = (await import('maplibre-gl')).default
        const res = await fetch('/data/countries.geojson')
        if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`)
        const geojson: GeoJSON.FeatureCollection = await res.json()
        if (cancelled || !containerRef.current) return

        const nameToId = new Map<string, number>()
        const countryList: CountryContinent[] = []
        geojson.features.forEach((f, i) => {
          const name = f.properties?.ADMIN
          const continent = f.properties?.CONTINENT
          if (typeof name === 'string') {
            nameToId.set(name, i)
            countryList.push({ name, continent: continent as string })
          }
        })
        nameToIdRef.current = nameToId
        countryListRef.current = countryList

        // Build region lookup
        const regionMap = new Map<string, string>()
        geojson.features.forEach((f) => {
          const name = f.properties?.ADMIN
          const region = f.properties?.REGION_UN
          if (typeof name === 'string' && typeof region === 'string') {
            regionMap.set(name, region)
          }
        })

        useGameStore.getState().setCountries(getCountriesFromGeoJSON(geojson), regionMap)

        const map = new maplibregl.Map({
          container: containerRef.current!,
          style: { version: 8 as const, name: 'WoC', sources: {}, layers: [{ id: 'background', type: 'background' as const, paint: { 'background-color': mapBgColor() } }] },
          center: initialViewState.center,
          zoom: initialViewState.zoom,
          attributionControl: false,
          renderWorldCopies: true,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        })

        map.addControl(new maplibregl.NavigationControl(), 'bottom-left')
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
        map.getCanvas().style.cursor = 'crosshair'

        map.on('load', () => {
          try {
            map.addSource(COUNTRIES_SOURCE, {
              type: 'geojson',
              data: geojson,
              generateId: true,
            })

            // White fill by default, grey when eliminated, green when solved, feedback colors
            map.addLayer({
              id: COUNTRIES_FILL_LAYER,
              type: 'fill',
              source: COUNTRIES_SOURCE,
              paint: {
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'correct'], false], '#22c55e',
                  ['boolean', ['feature-state', 'wrong'], false], '#fdba74',
                  ['boolean', ['feature-state', 'target'], false], '#3b82f6',
                  ['boolean', ['feature-state', 'solved'], false], '#86efac',
                  ['boolean', ['feature-state', 'eliminated'], false], '#9CA3AF',
                  ['boolean', ['feature-state', 'hover'], false], countryHoverColor(),
                  '#FFFFFF',
                ],
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'eliminated'], false], 0.3,
                  0.85,
                ],
              },
            })

            map.addLayer({
              id: COUNTRIES_LINE_LAYER,
              type: 'line',
              source: COUNTRIES_SOURCE,
              paint: {
                'line-color': [
                  'case',
                  ['boolean', ['feature-state', 'correct'], false], '#16a34a',
                  ['boolean', ['feature-state', 'wrong'], false], '#ea580c',
                  ['boolean', ['feature-state', 'target'], false], '#2563eb',
                  ['boolean', ['feature-state', 'solved'], false], '#22c55e',
                  ['boolean', ['feature-state', 'eliminated'], false], '#334155',
                  ['boolean', ['feature-state', 'hover'], false], countryHoverLineColor(),
                  countryLineColor(),
                ],
                'line-width': [
                  'case',
                  ['boolean', ['feature-state', 'correct'], false], 3,
                  ['boolean', ['feature-state', 'wrong'], false], 3,
                  ['boolean', ['feature-state', 'target'], false], 3,
                  ['boolean', ['feature-state', 'hover'], false], 2.5,
                  1.5,
                ],
              },
            })

            const smallPoints = buildSmallCountryPoints(geojson.features)
            const smallLookup = new Map<string, number>()
            smallPoints.features.forEach((f, i) => {
              const name = f.properties?.ADMIN
              if (typeof name === 'string') smallLookup.set(name, i)
            })
            smallNameToIdRef.current = smallLookup

            map.addSource(SMALL_COUNTRIES_SOURCE, {
              type: 'geojson',
              data: smallPoints,
            })

            map.addLayer({
              id: SMALL_COUNTRIES_CIRCLE_LAYER,
              type: 'circle',
              source: SMALL_COUNTRIES_SOURCE,
              paint: {
                'circle-radius': zoomScaledCircleRadius(),
                'circle-color': circleStrokeColor(),
                'circle-opacity': 0.12,
              },
            })

            map.addLayer({
              id: SMALL_COUNTRIES_RING_LAYER,
              type: 'circle',
              source: SMALL_COUNTRIES_SOURCE,
              paint: {
                'circle-radius': zoomScaledCircleRadius(),
                'circle-color': 'transparent',
                'circle-stroke-width': [
                  'case',
                  ['boolean', ['feature-state', 'correct'], false], 3,
                  ['boolean', ['feature-state', 'solved'], false], 3,
                  2,
                ],
                'circle-stroke-color': [
                  'case',
                  ['boolean', ['feature-state', 'correct'], false], '#22c55e',
                  ['boolean', ['feature-state', 'wrong'], false], '#f97316',
                  ['boolean', ['feature-state', 'target'], false], '#3b82f6',
                  ['boolean', ['feature-state', 'solved'], false], '#22c55e',
                  ['boolean', ['feature-state', 'hover'], false], countryHoverLineColor(),
                  circleStrokeColor(),
                ],
                'circle-stroke-opacity': 0.8,
              },
            })

            const queryLayers = [COUNTRIES_FILL_LAYER, SMALL_COUNTRIES_CIRCLE_LAYER]

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

            map.on('click', (e) => {
              const state = useGameStore.getState()
              if (state.phase !== 'playing') return
              const features = map.queryRenderedFeatures(e.point, { layers: queryLayers })
              if (features.length > 0) {
                const name = features[0].properties?.ADMIN
                if (typeof name === 'string' && name) state.submitAnswer(name)
              }
            })

            map.on('dragstart', () => { map.getCanvas().style.cursor = 'grabbing' })
            map.on('dragend', () => {
              map.getCanvas().style.cursor = hoveredIdRef.current !== null ? 'pointer' : 'crosshair'
            })
          } catch (err) {
            console.error('Layer setup failed:', err)
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
  }, [])

  // Auto-start from URL params (when launched from main menu)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const diff = params.get('difficulty') as Difficulty | null
    const region = params.get('region')
    if (diff && region) {
      setSelectedDifficulty(diff)
      setSelectedRegion(region)
      const checkMap = setInterval(() => {
        if (mapRef.current) {
          clearInterval(checkMap)
          setHintsRemaining(INITIAL_HINTS)
          setHintLevel(0)
          setEliminatedCountries(new Set())
          setCorrectStreak(0)
          setHintBonusShown(false)
          skippedRef.current = []
          setSkippedCount(0)
          launchWithCountdown(() => { playGameStart(); startMusic(); startGame('flag', diff, region) })
        }
      }, 100)
      return () => clearInterval(checkMap)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const themeUpdates = useMemo(() => countryMapThemeUpdates(
    COUNTRIES_FILL_LAYER, COUNTRIES_LINE_LAYER,
    SMALL_COUNTRIES_CIRCLE_LAYER, SMALL_COUNTRIES_RING_LAYER,
    [['eliminated', '#334155']],
  ), [])
  useMapThemeListener(mapRef, themeUpdates)

  const sfState = createFeatureStateSetter(mapRef, COUNTRIES_SOURCE)
  const sfSmallState = createFeatureStateSetter(mapRef, SMALL_COUNTRIES_SOURCE)

  // Timer — paused during countdown
  useEffect(() => {
    if (showCountdown) return
    const cfg = useGameStore.getState().modeConfig
    const hasTimer = cfg.perQuestionTime
    if (phase === 'playing' && hasTimer) {
      timerRef.current = setInterval(() => {
        const s = useGameStore.getState()
        if (s.timeRemaining <= 0) s.timeOut()
        else {
          s.tick()
          if (s.timeRemaining <= 5 && s.timeRemaining > 0 && Math.floor(s.timeRemaining * 10) % 10 === 0) playTick()
        }
      }, 100)
    } else if (phase === 'playing' && !hasTimer) {
      timerRef.current = setInterval(() => {
        useGameStore.getState().tick()
      }, 100)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, showCountdown])

  // Flash feedback
  useEffect(() => {
    if (phase !== 'feedback' || !feedbackCountry) return
    const lookup = nameToIdRef.current
    const last = answers[answers.length - 1]

    if (last?.correct) playCorrect()
    else { playWrong(); playLifeLost() }

    if (last?.correct) {
      const id = lookup.get(feedbackCountry)
      if (id !== undefined) { sfState(id, { correct: true }); flashedIdsRef.current.add(id) }
      const sId = smallNameToIdRef.current.get(feedbackCountry)
      if (sId !== undefined) sfSmallState(sId, { correct: true })
    } else {
      if (last?.selectedCountry) {
        const wId = lookup.get(last.selectedCountry)
        if (wId !== undefined) { sfState(wId, { wrong: true }); flashedIdsRef.current.add(wId) }
        const swId = smallNameToIdRef.current.get(last.selectedCountry)
        if (swId !== undefined) sfSmallState(swId, { wrong: true })
      }
      const tId = lookup.get(feedbackCountry)
      if (tId !== undefined) { sfState(tId, { target: true }); flashedIdsRef.current.add(tId) }
      const stId = smallNameToIdRef.current.get(feedbackCountry)
      if (stId !== undefined) sfSmallState(stId, { target: true })
    }
  }, [phase, feedbackCountry, answers])

  // Clear flash + mark solved on next question + clear eliminations
  useEffect(() => {
    if (phase !== 'playing') return
    const lookup = nameToIdRef.current

    if (currentIndex === 0) {
      lookup.forEach((id) => {
        sfState(id, { solved: false, correct: false, wrong: false, target: false, eliminated: false })
      })
      smallNameToIdRef.current.forEach((id) => {
        sfSmallState(id, { solved: false, correct: false, wrong: false, target: false })
      })
      flashedIdsRef.current.clear()
      return
    }

    flashedIdsRef.current.forEach((id) => {
      sfState(id, { correct: false, wrong: false, target: false })
    })
    flashedIdsRef.current.clear()
    // Also clear small-country flash states
    smallNameToIdRef.current.forEach((id) => {
      sfSmallState(id, { correct: false, wrong: false, target: false })
    })

    // Clear all eliminations for new question
    lookup.forEach((id) => {
      sfState(id, { eliminated: false })
    })

    correctCountries.forEach((name) => {
      const id = lookup.get(name)
      if (id !== undefined) {
        sfState(id, { solved: true })
      }
      const sId = smallNameToIdRef.current.get(name)
      if (sId !== undefined) {
        sfSmallState(sId, { solved: true })
      }
    })
  }, [phase, currentIndex, correctCountries])

  // Game over sound
  useEffect(() => {
    if (phase === 'results') { playGameOver(); stopMusic() }
  }, [phase])

  // Reset view on idle
  useEffect(() => {
    if (phase === 'idle') {
      nameToIdRef.current.forEach((id) => {
        sfState(id, { solved: false, correct: false, wrong: false, target: false, eliminated: false })
      })
      smallNameToIdRef.current.forEach((id) => {
        sfSmallState(id, { solved: false, correct: false, wrong: false, target: false })
      })
      const map = mapRef.current as { flyTo?: (opts: { center: [number, number]; zoom: number; duration: number }) => void } | null
      map?.flyTo?.({ center: initialViewState.center, zoom: initialViewState.zoom, duration: 1000 })
      startMenuMusic()
    }
  }, [phase])

  // Fly to region view when game starts
  useEffect(() => {
    if (phase !== 'playing' || currentIndex !== 0) return
    const map = mapRef.current as { flyTo?: (opts: { center: [number, number]; zoom: number; duration: number }) => void } | null
    const view = REGION_VIEWS[selectedRegion] ?? REGION_VIEWS.World
    map?.flyTo?.({ center: view.center, zoom: view.zoom, duration: 1000 })
  }, [phase, currentIndex, selectedRegion])

  function handleStartGame() {
    setHintsRemaining(INITIAL_HINTS)
    setHintLevel(0)
    setEliminatedCountries(new Set())
    setCorrectStreak(0)
    skippedRef.current = []
    setSkippedCount(0)
    playGameStart()
    startMusic()
    startGame('flag', selectedDifficulty, selectedRegion)
  }

  const pendingStartRef = useRef<(() => void) | null>(null)

  function launchWithCountdown(startFn: () => void) {
    warmUpAudio()
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
      {/* Decorative background for selection/results */}
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

      {/* Quit/Restart buttons — top left on all screen sizes */}
      {(phase === 'playing' || phase === 'feedback') && !showCountdown && (
        <div className="fixed top-12 left-2 sm:top-4 sm:left-4 z-[60] flex gap-1.5 sm:gap-2">
          {/* Mobile: small icon buttons */}
          <button
            onClick={() => { playClick(); setShowQuitConfirm(true) }}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-5 sm:py-3 flex items-center justify-center rounded-full glass-panel border-geo-on-surface/30 text-geo-on-surface sm:text-sm font-headline font-bold uppercase tracking-wider hover:text-geo-error hover:border-geo-error/30 transition-colors"
            aria-label={t('quit')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:hidden" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            <span className="hidden sm:inline">{t('quit')}</span>
          </button>
          <button
            onClick={() => { playClick(); setShowRestartConfirm(true) }}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-5 sm:py-3 flex items-center justify-center rounded-full glass-panel border-geo-on-surface/30 text-geo-on-surface sm:text-sm font-headline font-bold uppercase tracking-wider hover:text-geo-on-surface hover:border-geo-on-surface/30 transition-colors"
            aria-label={t('restart')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:hidden" aria-hidden="true">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.535a.75.75 0 00-1.5 0v2.033l-.312-.311A7 7 0 002.63 8.395a.75.75 0 001.45.39l-.001.001z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">{t('restart')}</span>
          </button>
        </div>
      )}

      {/* Lives + Score — bottom center */}
      {(phase === 'playing' || phase === 'feedback') && !showCountdown && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[55]">
          <div className="glass-panel px-4 py-2 sm:px-5 flex items-center gap-3">
            <span className="text-sm sm:text-base font-headline font-extrabold text-geo-error tabular-nums">
              {'♥'.repeat(lives)}
              <span className="text-geo-outline">{'♡'.repeat(Math.max(0, 3 - lives))}</span>
            </span>
            <span className="text-sm sm:text-base font-headline font-extrabold text-geo-primary tabular-nums text-glow-primary">
              {score}
            </span>
          </div>
        </div>
      )}

      {showRestartConfirm && (
        <ConfirmDialog
          title={`${t('restart')}?`}
          message={t('progressLost')}
          confirmLabel={t('restart')}
          onCancel={() => setShowRestartConfirm(false)}
          onConfirm={() => { setShowRestartConfirm(false); reset(); launchWithCountdown(handleStartGame) }}
        />
      )}
      {showQuitConfirm && (
        <ConfirmDialog
          title={t('quitGame')}
          message={t('progressLost')}
          confirmLabel={t('quit')}
          confirmVariant="danger"
          onCancel={() => setShowQuitConfirm(false)}
          onConfirm={() => { setShowQuitConfirm(false); stopMusic(); reset(); router.push(prefixPath('/?cat=mapGames&game=/game/flag')) }}
        />
      )}

      {/* Flag question card — top center (pushed down on mobile below compact HUD) */}
      {phase === 'playing' && q && currentFlagUrl && !showCountdown && (
        <>
          <div className="fixed top-12 sm:top-4 left-1/2 -translate-x-1/2 z-[55]">
            <FlagQuestionCard
              flagUrl={currentFlagUrl}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
            />
          </div>

          {/* Desktop: Hint/Skip controls — right edge, vertically centered */}
          <div className="hidden sm:block fixed right-4 top-1/2 -translate-y-1/2 z-[55]">
            <div className="glass-panel px-4 py-3 space-y-2 min-w-[160px]">
              {hintLevel >= 1 && continentDisplay && (
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-geo-secondary/20 border-2 border-geo-secondary/40 text-geo-secondary text-xs font-headline font-bold uppercase">
                    {t(`continent.${continentDisplay}` as keyof Translations)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {hintsRemaining > 0 && hintLevel < 3 && (
                  <button
                    onClick={handleUseHint}
                    className="px-3 py-1.5 rounded-full text-xs font-headline font-bold uppercase tracking-wider transition-all border-2 bg-geo-tertiary/10 border-geo-tertiary/40 text-geo-on-surface hover:bg-geo-tertiary/20"
                  >
                    {t((['hint.revealContinent', 'hint.eliminateLookalikes', 'hint.narrowDown'] as const)[hintLevel])}
                  </button>
                )}
                <span className={`text-[10px] font-headline font-bold uppercase ${hintsRemaining > 0 ? 'text-geo-tertiary' : 'text-geo-on-surface-dim'}`}>
                  {hintsRemaining} {hintsRemaining !== 1 ? t('hints') : t('hint')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkip}
                  className="px-3 py-1 rounded-full text-xs font-headline font-bold uppercase tracking-wider border-2 border-geo-outline/30 text-geo-on-surface-dim hover:text-geo-primary hover:border-geo-primary/40 transition-colors"
                >
                  {t('skip')}
                </button>
                {skippedCount > 0 && (
                  <span className="text-[10px] font-headline font-bold text-geo-on-surface-dim">
                    {skippedCount} {t('skipped')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: Small hint icon button — bottom right */}
          <div className="sm:hidden fixed right-2 bottom-20 z-[55]">
            <button
              onClick={() => setShowMobileHints(!showMobileHints)}
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center border-2 border-geo-tertiary/40"
              aria-label="Hints"
            >
              <span className="text-lg">💡</span>
            </button>
            {showMobileHints && (
              <div className="absolute bottom-12 right-0 glass-panel px-3 py-2 space-y-2 min-w-[160px]">
                {hintLevel >= 1 && continentDisplay && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-geo-secondary/20 border border-geo-secondary/40 text-geo-secondary text-[10px] font-headline font-bold uppercase">
                    {t(`continent.${continentDisplay}` as keyof Translations)}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {hintsRemaining > 0 && hintLevel < 3 && (
                    <button
                      onClick={() => { handleUseHint(); setShowMobileHints(false) }}
                      className="px-2 py-1 rounded-full text-[10px] font-headline font-bold uppercase tracking-wider transition-all border-2 bg-geo-tertiary/10 border-geo-tertiary/40 text-geo-on-surface hover:bg-geo-tertiary/20"
                    >
                      {t((['hint.revealContinent', 'hint.eliminateLookalikes', 'hint.narrowDown'] as const)[hintLevel])}
                    </button>
                  )}
                  <span className={`text-[10px] font-headline font-bold uppercase ${hintsRemaining > 0 ? 'text-geo-tertiary' : 'text-geo-on-surface-dim'}`}>
                    {hintsRemaining}
                  </span>
                </div>
                <button
                  onClick={() => { handleSkip(); setShowMobileHints(false) }}
                  className="px-2 py-1 rounded-full text-[10px] font-headline font-bold uppercase tracking-wider border-2 border-geo-outline/30 text-geo-on-surface-dim hover:text-geo-primary hover:border-geo-primary/40 transition-colors"
                >
                  {t('skip')}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Feedback overlay (pushed down on mobile below compact HUD) */}
      {phase === 'feedback' && feedbackCountry && feedbackCorrect !== null && !showCountdown && (
        <div className="fixed top-12 sm:top-4 left-1/2 -translate-x-1/2 z-[55]">
          <FeedbackOverlay
            correct={feedbackCorrect}
            countryName={feedbackCountry}
            isoA3={answers[answers.length - 1]?.question.country.iso_a3 ?? ''}
            selectedCountry={answers[answers.length - 1]?.selectedCountry ?? null}
            score={answers[answers.length - 1]?.score ?? 0}
            delay={modeConfig.feedbackDelay}
            onContinue={handleNextQuestion}
          />
          {/* Hint bonus notification */}
          {hintBonusShown && (
            <div className="mt-2 text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-geo-tertiary/20 border border-geo-tertiary/40 text-geo-tertiary text-xs font-headline font-bold uppercase tracking-wider animate-pulse">
                {t('hintEarned')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Desktop: Scoreboard (hidden on mobile) */}
      {(phase === 'playing' || phase === 'feedback') && !showCountdown && (
        <div className="hidden sm:block fixed top-4 right-4 z-[55]">
          <ScoreBoard
            mode="flag"
            score={score}
            timeRemaining={timeRemaining}
            maxTime={maxTime}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            lives={lives}
            streak={streak}
            elapsed={elapsed}
            correctCount={correctCount}
          />
        </div>
      )}

      {/* Mode selection */}
      {phase === 'idle' && !showCountdown && (
        <div className="absolute inset-0 z-20 flex flex-col items-center px-4 pt-4 pb-4">
          <div className="absolute top-4 left-4 flex gap-2 z-30">
            <button
              onClick={() => { playClick(); router.push(prefixPath('/?cat=mapGames&game=/game/flag')) }}
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
              {(() => { const w = t('guessTheFlag').split(' '); const last = w.pop()!; return w.length ? <>{w.join(' ')} <span className="text-geo-primary text-glow-primary">{last}</span></> : <span className="text-geo-primary text-glow-primary">{last}</span>; })()}
            </h2>
            <p className="text-geo-on-surface-dim text-center mb-6 font-body text-sm">
              {t('flagSubtitle')}
            </p>

            {/* How it works */}
            <div className="glass-panel p-5 mb-5">
              <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-3">{t('howItWorks')}</p>
              <div className="space-y-2 text-sm font-body text-geo-on-surface-dim">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-geo-tertiary/20 text-geo-tertiary text-[10px] font-headline font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>{t('flag.hintsExplain')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-geo-error/20 text-geo-error text-[10px] font-headline font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>{t('flag.livesExplain')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-geo-secondary/20 text-geo-secondary text-[10px] font-headline font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">?</span>
                  <span>{t('flag.hintOrder')}</span>
                </div>
              </div>
            </div>

            {/* Region */}
            <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectRegion')}</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['World', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].map((r) => (
                <button
                  key={r}
                  onClick={() => { playClick(); setSelectedRegion(r) }}
                  className={`glass-panel p-3 flex items-center justify-center text-center transition-all cursor-pointer ${
                    selectedRegion === r
                      ? 'border-orange-500 bg-orange-500 shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]'
                      : 'hover:border-geo-secondary/40 hover:shadow-[0_0_20px_-5px_rgba(100,168,254,0.15)]'
                  }`}
                >
                  <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                    selectedRegion === r ? 'text-white' : 'text-geo-on-surface-dim'
                  }`}>{t(`region.${r}` as keyof Translations)}</p>
                </button>
              ))}
            </div>

            {/* Difficulty */}
            <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectDifficulty')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {DIFFICULTIES.map((d) => {
                const icons: Record<string, string> = { easy: '🟢', medium: '🟡', hard: '🟠', expert: '🔴' }
                return (
                  <button
                    key={d.value}
                    onClick={() => { playClick(); setSelectedDifficulty(d.value) }}
                    className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                      selectedDifficulty === d.value
                        ? 'border-orange-500 bg-orange-500 shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]'
                        : 'hover:border-geo-primary/40 hover:shadow-[0_0_20px_-5px_rgba(107,255,193,0.15)]'
                    }`}
                  >
                    <div className="text-xl mb-1">{icons[d.value]}</div>
                    <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                      selectedDifficulty === d.value ? 'text-white' : 'text-geo-on-surface-dim'
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

          {/* Game advisor — floating carrot character */}
          <div className="hidden xl:block absolute left-[calc(50%+17rem)] top-1/2 -translate-y-1/2">
            <GameAdvisor
              text={t('speech.flag' as keyof Translations).replace('{pool}', t(`diff.${selectedDifficulty}.desc` as keyof Translations))}
            />
          </div>

          {/* High scores — fixed bottom panel */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="max-w-lg mx-auto">
              <HighScorePreview
                difficulty={selectedDifficulty}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'results' && (
        <ResultScreen
          mode="flag"
          difficulty={selectedDifficulty}
          variant={variant}
          answers={answers}
          elapsed={elapsed}
          rewards={rewards}
          onPlayAgain={() => { reset(); usedAnyHintsRef.current = false; launchWithCountdown(handleStartGame) }}
          onHome={() => { reset(); usedAnyHintsRef.current = false; stopMusic(); router.push(prefixPath('/')) }}
        />
      )}

      {showCountdown && <Countdown onComplete={onCountdownComplete} />}
      {showHurryUp && <HurryUp />}
    </div>
  )
}

function HighScorePreview({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useTranslation()
  const scores = getHighScores('flag', difficulty)
  const diffLabel = t(`diff.${difficulty}` as keyof Translations)

  return (
    <div className="glass-panel p-4 min-h-[110px]">
      <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-2.5">
        {t('highScores')} — {t('guessTheFlag')} / {diffLabel}
      </p>
      {scores.length === 0 ? (
        <p className="text-geo-outline text-sm font-body">{t('noScoresYet')}</p>
      ) : (
        <div className="space-y-1.5">
          {scores.slice(0, 5).map((entry, i) => (
            <div
              key={`${entry.date}-${i}`}
              className="flex items-center gap-2 text-sm"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-headline font-extrabold ${
                i === 0 ? 'bg-geo-tertiary-bright/20 text-geo-tertiary-bright border border-geo-tertiary-bright/40' : 'bg-geo-surface-highest text-geo-on-surface-dim border border-geo-outline-dim/30'
              }`}>{i + 1}</span>
              <span className="flex-1 truncate text-geo-on-surface font-body font-medium">{entry.name}</span>
              <span className={`font-headline font-extrabold text-xs ${i === 0 ? 'text-geo-primary' : 'text-geo-on-surface-dim'}`}>
                {entry.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
