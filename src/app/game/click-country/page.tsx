'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useGameStore } from '@/store/gameStore'
import { getCountriesFromGeoJSON, GAME_MODES } from '@/lib/gameEngine'
import { DIFFICULTIES, type Difficulty } from '@/lib/countryDifficulty'
import { getHighScores, type HighScoreEntry } from '@/lib/highScores'
import { getMapStyle, COUNTRIES_SOURCE, COUNTRIES_FILL_LAYER, COUNTRIES_LINE_LAYER, SMALL_COUNTRIES_SOURCE, SMALL_COUNTRIES_CIRCLE_LAYER, SMALL_COUNTRIES_RING_LAYER, initialViewState, REGION_VIEWS } from '@/lib/mapConfig'
import type { GameMode } from '@/types/game'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { playCorrect, playWrong, playGameStart, playGameOver, playLifeLost, playTick, playClick, startMusic, stopMusic, startMenuMusic } from '@/lib/sounds'
import { getTheme, mapBgColor, countryFillColor, countryHoverColor, countryHoverLineColor, countryLineColor, circleStrokeColor } from '@/lib/theme'
import { buildSmallCountryPoints, createFeatureStateSetter } from '@/lib/mapHelpers'
import { useMapThemeListener, countryMapThemeUpdates } from '@/hooks/useMapThemeListener'
import MapBackground from '@/components/home/MapBackground'
import FloatingFlags from '@/components/home/FloatingFlags'
import QuestionCard from '@/components/game/QuestionCard'
import ScoreBoard from '@/components/game/ScoreBoard'
import FeedbackOverlay from '@/components/game/FeedbackOverlay'
import ResultScreen from '@/components/game/ResultScreen'
import { useGameRewards } from '@/hooks/useGameRewards'
import { calculateResults } from '@/lib/gameEngine'
import GameAdvisor from '@/components/game/GameAdvisor'
import ThemeToggle from '@/components/ThemeToggle'
import ConfirmDialog from '@/components/game/ConfirmDialog'
import Countdown from '@/components/game/Countdown'
import HurryUp from '@/components/game/HurryUp'

export default function ClickCountryPage() {
  const router = useRouter()
  const { t, tc } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hoveredIdRef = useRef<number | null>(null)
  const flashedIdsRef = useRef<Set<number>>(new Set())
  const nameToIdRef = useRef<Map<string, number>>(new Map())
  const smallNameToIdRef = useRef<Map<string, number>>(new Map())
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic')
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy')
  const [selectedRegion, setSelectedRegion] = useState('World')
  const [previewMode, setPreviewMode] = useState<GameMode | null>(null)
  const [previewDifficulty, setPreviewDifficulty] = useState<Difficulty | null>(null)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [borderlessTimed, setBorderlessTimed] = useState(true)
  const [showCountdown, setShowCountdown] = useState(false)
  const [showHurryUp, setShowHurryUp] = useState(false)

  const {
    phase, mode, modeConfig, variant, questions, currentIndex, answers, score,
    timeRemaining, elapsed, lives, streak, correctCountries,
    feedbackCountry, feedbackCorrect,
    startGame, nextQuestion, reset,
  } = useGameStore()

  // Calculate rewards when game ends
  const gameResults = useMemo(() => {
    if (phase !== 'results' || answers.length === 0) return { correctCount: 0, totalQuestions: 0, accuracy: 0 }
    return calculateResults(answers)
  }, [phase, answers])

  const rewards = useGameRewards({
    phase,
    mode,
    difficulty: selectedDifficulty,
    correctCount: gameResults.correctCount,
    totalQuestions: gameResults.totalQuestions,
    accuracy: gameResults.accuracy,
    maxStreak: streak,
  })

  // Initialize map (runs once)
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
        geojson.features.forEach((f, i) => {
          const name = f.properties?.ADMIN
          if (typeof name === 'string') nameToId.set(name, i)
        })
        nameToIdRef.current = nameToId

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
          renderWorldCopies: false,

        })

        map.addControl(new maplibregl.NavigationControl(), 'top-right')
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
        map.getCanvas().style.cursor = 'crosshair'

        map.on('load', () => {
          try {
            map.addSource(COUNTRIES_SOURCE, {
              type: 'geojson',
              data: geojson,
              generateId: true,
            })

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
                'circle-radius': ['get', 'radius'],
                'circle-color': circleStrokeColor(),
                'circle-opacity': 0.12,
              },
            })

            map.addLayer({
              id: SMALL_COUNTRIES_RING_LAYER,
              type: 'circle',
              source: SMALL_COUNTRIES_SOURCE,
              paint: {
                'circle-radius': ['get', 'radius'],
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
              const gameState = useGameStore.getState()
              const isBorderless = gameState.mode === 'borderless' && gameState.phase === 'playing'

              const features = map.queryRenderedFeatures(e.point, { layers: queryLayers })
              if (hoveredIdRef.current !== null) {
                map.setFeatureState({ source: COUNTRIES_SOURCE, id: hoveredIdRef.current }, { hover: false })
                hoveredIdRef.current = null
              }
              if (features.length > 0 && !isBorderless) {
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
              // In borderless, only query the fill layer (no circles)
              const layers = state.mode === 'borderless' ? [COUNTRIES_FILL_LAYER] : queryLayers
              const features = map.queryRenderedFeatures(e.point, { layers })
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
    const mode = params.get('mode') as GameMode | null
    const diff = params.get('difficulty') as Difficulty | null
    const region = params.get('region')
    const variant = params.get('variant') || undefined
    if (mode && diff && region) {
      setSelectedMode(mode)
      setSelectedDifficulty(diff)
      setSelectedRegion(region)
      // Wait for map to be ready before starting
      const checkMap = setInterval(() => {
        if (mapRef.current) {
          clearInterval(checkMap)
          launchWithCountdown(() => { playGameStart(); startMusic(); startGame(mode, diff, region, variant) })
        }
      }, 100)
      return () => clearInterval(checkMap)
    }
  }, [])

  const themeUpdates = useMemo(() => countryMapThemeUpdates(
    COUNTRIES_FILL_LAYER, COUNTRIES_LINE_LAYER,
    SMALL_COUNTRIES_CIRCLE_LAYER, SMALL_COUNTRIES_RING_LAYER,
  ), [])
  useMapThemeListener(mapRef, themeUpdates)

  const sfState = createFeatureStateSetter(mapRef, COUNTRIES_SOURCE)
  const sfSmallState = createFeatureStateSetter(mapRef, SMALL_COUNTRIES_SOURCE)

  // Timer (only for modes with a timer) — paused during countdown
  useEffect(() => {
    if (showCountdown) return
    const cfg = useGameStore.getState().modeConfig
    const hasTimer = cfg.globalTimeLimit || cfg.perQuestionTime
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

    if (last?.correct) {
      playCorrect()
    } else {
      playWrong()
      const state = useGameStore.getState()
      if (state.mode === 'survival' || state.mode === 'borderless') playLifeLost()
    }

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

  // Clear flash + mark solved countries on next question
  useEffect(() => {
    if (phase !== 'playing') return
    const lookup = nameToIdRef.current

    // On first question (new game): clear ALL solved states from previous game
    if (currentIndex === 0) {
      lookup.forEach((id) => {
        sfState(id, { solved: false, correct: false, wrong: false, target: false })
      })
      smallNameToIdRef.current.forEach((id) => {
        sfSmallState(id, { solved: false, correct: false, wrong: false, target: false })
      })
      flashedIdsRef.current.clear()
      return
    }

    // Clear flash states from previous question
    flashedIdsRef.current.forEach((id) => {
      sfState(id, { correct: false, wrong: false, target: false })
    })
    flashedIdsRef.current.clear()
    // Also clear small-country flash states
    smallNameToIdRef.current.forEach((id) => {
      sfSmallState(id, { correct: false, wrong: false, target: false })
    })

    // Keep solved countries highlighted (marathon/survival/practice)
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

  // Clear all solved states on reset + fly to world view + restore borders
  useEffect(() => {
    if (phase === 'idle') {
      nameToIdRef.current.forEach((id) => {
        sfState(id, { solved: false, correct: false, wrong: false, target: false })
      })
      smallNameToIdRef.current.forEach((id) => {
        sfSmallState(id, { solved: false, correct: false, wrong: false, target: false })
      })
      const map = mapRef.current as { flyTo?: (opts: { center: [number, number]; zoom: number; duration: number }) => void; setLayoutProperty?: (layer: string, prop: string, value: string) => void } | null
      map?.flyTo?.({ center: initialViewState.center, zoom: initialViewState.zoom, duration: 1000 })
      // Restore borders
      map?.setLayoutProperty?.(COUNTRIES_LINE_LAYER, 'visibility', 'visible')
      map?.setLayoutProperty?.(SMALL_COUNTRIES_RING_LAYER, 'visibility', 'visible')
      map?.setLayoutProperty?.(SMALL_COUNTRIES_CIRCLE_LAYER, 'visibility', 'visible')
      startMenuMusic()
    }
  }, [phase])

  // Fly to region when game starts + toggle borders for borderless mode
  useEffect(() => {
    if (phase !== 'playing' || currentIndex !== 0) return
    type MapMethods = {
      flyTo?: (opts: { center: [number, number]; zoom: number; duration: number }) => void
      setLayoutProperty?: (layer: string, prop: string, value: unknown) => void
      setPaintProperty?: (layer: string, prop: string, value: unknown) => void
    }
    const map = mapRef.current as MapMethods | null
    if (!map) return

    const state = useGameStore.getState()

    // Borderless: hide borders, circles, flatten fill to seamless landmass
    if (state.mode === 'borderless') {
      map.setLayoutProperty?.(COUNTRIES_LINE_LAYER, 'visibility', 'none')
      map.setLayoutProperty?.(SMALL_COUNTRIES_RING_LAYER, 'visibility', 'none')
      map.setLayoutProperty?.(SMALL_COUNTRIES_CIRCLE_LAYER, 'visibility', 'none')
      // Fully opaque single color — no seams between adjacent polygons
      map.setPaintProperty?.(COUNTRIES_FILL_LAYER, 'fill-color', [
        'case',
        ['boolean', ['feature-state', 'correct'], false], '#22c55e',
        ['boolean', ['feature-state', 'wrong'], false], '#fdba74',
        ['boolean', ['feature-state', 'target'], false], '#3b82f6',
        ['boolean', ['feature-state', 'solved'], false], '#22c55e',
        '#1e3a5f',
      ])
      map.setPaintProperty?.(COUNTRIES_FILL_LAYER, 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'correct'], false], 1,
        ['boolean', ['feature-state', 'wrong'], false], 1,
        ['boolean', ['feature-state', 'target'], false], 1,
        ['boolean', ['feature-state', 'solved'], false], 1,
        1,
      ])
      // Also set the line layer to match landmass color so any anti-alias artifacts blend in
      map.setPaintProperty?.(COUNTRIES_LINE_LAYER, 'line-color', '#1e3a5f')
      map.setPaintProperty?.(COUNTRIES_LINE_LAYER, 'line-width', 0.5)
      map.setLayoutProperty?.(COUNTRIES_LINE_LAYER, 'visibility', 'visible')
    } else {
      map.setLayoutProperty?.(COUNTRIES_LINE_LAYER, 'visibility', 'visible')
      map.setLayoutProperty?.(SMALL_COUNTRIES_RING_LAYER, 'visibility', 'visible')
      map.setLayoutProperty?.(SMALL_COUNTRIES_CIRCLE_LAYER, 'visibility', 'visible')
      // Restore normal line style
      map.setPaintProperty?.(COUNTRIES_LINE_LAYER, 'line-color', [
        'case',
        ['boolean', ['feature-state', 'correct'], false], '#16a34a',
        ['boolean', ['feature-state', 'wrong'], false], '#ea580c',
        ['boolean', ['feature-state', 'target'], false], '#2563eb',
        ['boolean', ['feature-state', 'solved'], false], '#22c55e',
        ['boolean', ['feature-state', 'hover'], false], countryHoverLineColor(),
        countryLineColor(),
      ])
      map.setPaintProperty?.(COUNTRIES_LINE_LAYER, 'line-width', [
        'case',
        ['boolean', ['feature-state', 'correct'], false], 3,
        ['boolean', ['feature-state', 'wrong'], false], 3,
        ['boolean', ['feature-state', 'target'], false], 3,
        ['boolean', ['feature-state', 'hover'], false], 2,
        1.2,
      ])
      // Restore normal interactive fill
      map.setPaintProperty?.(COUNTRIES_FILL_LAYER, 'fill-color', [
        'case',
        ['boolean', ['feature-state', 'correct'], false], '#22c55e',
        ['boolean', ['feature-state', 'wrong'], false], '#fdba74',
        ['boolean', ['feature-state', 'target'], false], '#3b82f6',
        ['boolean', ['feature-state', 'solved'], false], '#86efac',
        ['boolean', ['feature-state', 'hover'], false], countryHoverColor(),
        countryFillColor(),
      ])
      map.setPaintProperty?.(COUNTRIES_FILL_LAYER, 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'correct'], false], 0.8,
        ['boolean', ['feature-state', 'wrong'], false], 0.8,
        ['boolean', ['feature-state', 'target'], false], 0.8,
        ['boolean', ['feature-state', 'solved'], false], 0.6,
        ['boolean', ['feature-state', 'hover'], false], 0.9,
        0.95,
      ])
    }

    const view = REGION_VIEWS[selectedRegion] ?? REGION_VIEWS.World
    map.flyTo?.({ center: view.center, zoom: view.zoom, duration: 1500 })
  }, [phase, currentIndex, selectedRegion])

  // Game over sound
  useEffect(() => {
    if (phase === 'results') { playGameOver(); stopMusic() }
  }, [phase])

  const q = questions[currentIndex]
  const maxTime = modeConfig.globalTimeLimit ?? modeConfig.perQuestionTime ?? 0
  const correctCount = useMemo(() => answers.filter((a) => a.correct).length, [answers])

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
      {/* Decorative background for mode selection — same as home page */}
      {(phase === 'idle' || phase === 'results') && !showCountdown && (
        <>
          <MapBackground />
          <FloatingFlags />
        </>
      )}

      {/* Gameplay map — hidden during idle/results, visible during play */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ visibility: (phase === 'idle' || phase === 'results') && !showCountdown ? 'hidden' : 'visible' }}
      />

      {/* Quit button — top left */}
      {(phase === 'playing' || phase === 'feedback') && (
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
      )}

      {showRestartConfirm && (
        <ConfirmDialog
          title={`${t('restart')}?`}
          message={t('progressLost')}
          confirmLabel={t('restart')}
          onCancel={() => setShowRestartConfirm(false)}
          onConfirm={() => { setShowRestartConfirm(false); reset(); launchWithCountdown(() => { playGameStart(); startMusic(); startGame(selectedMode, selectedDifficulty, selectedRegion, selectedMode === 'borderless' && !borderlessTimed ? 'untimed' : undefined) }) }}
        />
      )}
      {showQuitConfirm && (
        <ConfirmDialog
          title={t('quitGame')}
          message={t('progressLost')}
          confirmLabel={t('quit')}
          confirmVariant="danger"
          onCancel={() => setShowQuitConfirm(false)}
          onConfirm={() => { setShowQuitConfirm(false); stopMusic(); reset(); router.push('/?cat=mapGames&game=/game/click-country') }}
        />
      )}

      {/* Question card — top center */}
      {phase === 'playing' && q && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <QuestionCard countryName={q.country.name} questionNumber={currentIndex + 1} totalQuestions={questions.length} />
        </div>
      )}

      {/* Feedback — top center */}
      {phase === 'feedback' && feedbackCountry && feedbackCorrect !== null && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <FeedbackOverlay
            correct={feedbackCorrect}
            countryName={feedbackCountry}
            isoA3={answers[answers.length - 1]?.question.country.iso_a3 ?? ''}
            selectedCountry={answers[answers.length - 1]?.selectedCountry ?? null}
            score={answers[answers.length - 1]?.score ?? 0}
            delay={modeConfig.feedbackDelay}
            onContinue={nextQuestion}
          />
        </div>
      )}

      {/* Scoreboard — top right */}
      {(phase === 'playing' || phase === 'feedback') && (
        <div className="absolute top-4 right-4 z-10">
          <ScoreBoard
            mode={mode}
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

      {/* Mode + Difficulty selection */}
      {phase === 'idle' && !showCountdown && (
        <div className="absolute inset-0 z-20 flex flex-col items-center px-4 pt-4 pb-4">
          <div className="absolute top-4 left-4 flex gap-2 z-30">
            <button
              onClick={() => { playClick(); router.push('/?cat=mapGames&game=/game/click-country') }}
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
            Geo<span className="text-geo-primary text-glow-primary">Master</span>
          </h1>
          <div className="max-w-xl w-full flex-1 min-h-0 overflow-y-auto">
            <h2 className="text-2xl sm:text-3xl font-headline font-extrabold text-geo-on-surface italic uppercase tracking-tighter drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] text-center mb-1">
              {(() => { const w = t('selectMode').split(' '); const last = w.pop()!; return w.length ? <>{w.join(' ')} <span className="text-geo-primary text-glow-primary">{last}</span></> : <span className="text-geo-primary text-glow-primary">{last}</span>; })()}
            </h2>
            <p className="text-geo-on-surface-dim text-center mb-6 font-body text-sm">
              {t('chooseChallenge')}
            </p>

            {/* Game modes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
              {(Object.values(GAME_MODES) as { mode: GameMode; label: string; description: string }[]).filter((m) => m.mode !== 'flag' && m.mode !== 'distance').map((m) => {
                const icons: Record<string, string> = { classic: '🎯', timed: '⏱️', marathon: '🏃', survival: '❤️', practice: '📝', borderless: '🌐' }
                return (
                  <button
                    key={m.mode}
                    onClick={() => { playClick(); setSelectedMode(m.mode) }}
                    onMouseEnter={() => setPreviewMode(m.mode)}
                    onMouseLeave={() => setPreviewMode(null)}
                    className={`group glass-panel p-3 sm:p-4 flex flex-col items-center text-center transition-all cursor-pointer ${
                      selectedMode === m.mode
                        ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_20px_-5px_rgba(107,255,193,0.2)]'
                        : 'hover:border-geo-primary/40 hover:shadow-[0_0_30px_-10px_rgba(107,255,193,0.2)]'
                    }`}
                  >
                    <div className="text-2xl mb-2">{icons[m.mode]}</div>
                    <p className={`text-sm font-headline font-extrabold uppercase tracking-wide ${
                      selectedMode === m.mode ? 'text-geo-primary' : 'text-geo-on-surface group-hover:text-geo-primary transition-colors'
                    }`}>{t(`mode.${m.mode}` as keyof Translations)}</p>
                    <p className="text-xs mt-1 text-geo-on-surface-dim leading-relaxed">{t(`mode.${m.mode}.desc` as keyof Translations)}</p>
                  </button>
                )
              })}
            </div>

            {/* Region */}
            <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectRegion')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 mb-4">
              {['World', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].map((r) => (
                <button
                  key={r}
                  onClick={() => { playClick(); setSelectedRegion(r) }}
                  className={`glass-panel p-3 flex items-center justify-center text-center transition-all cursor-pointer ${
                    selectedRegion === r
                      ? 'border-geo-secondary/50 bg-geo-secondary/10 shadow-[0_0_15px_-5px_rgba(100,168,254,0.2)]'
                      : 'hover:border-geo-secondary/40 hover:shadow-[0_0_20px_-5px_rgba(100,168,254,0.15)]'
                  }`}
                >
                  <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                    selectedRegion === r ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
                  }`}>{t(`region.${r}` as keyof Translations)}</p>
                </button>
              ))}
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
                    onMouseEnter={() => { if (!isMarathon) setPreviewDifficulty(d.value) }}
                    onMouseLeave={() => setPreviewDifficulty(null)}
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
                    }`}>{d.label}</p>
                  </button>
                )
              })}
            </div>

            {/* Borderless timer option */}
            {selectedMode === 'borderless' && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => { playClick(); setBorderlessTimed(true) }}
                  className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                    borderlessTimed
                      ? 'border-geo-secondary/50 bg-geo-secondary/10'
                      : 'hover:border-geo-secondary/40'
                  }`}
                >
                  <div className="text-xl mb-1">⏱️</div>
                  <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                    borderlessTimed ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
                  }`}>{t('timer20s')}</p>
                </button>
                <button
                  onClick={() => { playClick(); setBorderlessTimed(false) }}
                  className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                    !borderlessTimed
                      ? 'border-geo-secondary/50 bg-geo-secondary/10'
                      : 'hover:border-geo-secondary/40'
                  }`}
                >
                  <div className="text-xl mb-1">♾️</div>
                  <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                    !borderlessTimed ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
                  }`}>{t('noTimer')}</p>
                </button>
              </div>
            )}

            <button
              onClick={() => launchWithCountdown(() => { playGameStart(); startMusic(); startGame(selectedMode, selectedDifficulty, selectedRegion, selectedMode === 'borderless' && !borderlessTimed ? 'untimed' : undefined) })}
              className="btn-primary w-full py-4 text-lg"
            >
              {t('startGame')}
            </button>
          </div>

          {/* Game advisor — floating carrot character */}
          <div className="hidden xl:block absolute left-[calc(50%+17rem)] top-1/2 -translate-y-1/2">
            <GameAdvisor
              text={t(`speech.${selectedMode}` as keyof Translations).replace('{pool}', t(`diff.${selectedDifficulty}.desc` as keyof Translations))}
            />
          </div>

          {/* High scores — fixed bottom panel */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="max-w-lg mx-auto">
              <HighScorePreview
                mode={previewMode ?? selectedMode}
                difficulty={selectedMode === 'marathon' ? 'expert' : (previewDifficulty ?? selectedDifficulty)}
                variant={selectedMode === 'borderless' && !borderlessTimed ? 'untimed' : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'results' && (
        <ResultScreen
          mode={mode}
          difficulty={selectedDifficulty}
          variant={variant}
          answers={answers}
          elapsed={elapsed}
          rewards={rewards}
          onPlayAgain={() => launchWithCountdown(() => { reset(); startGame(selectedMode, selectedDifficulty, selectedRegion, selectedMode === 'borderless' && !borderlessTimed ? 'untimed' : undefined) })}
          onHome={() => { reset(); stopMusic(); startMenuMusic() }}
        />
      )}

      {showCountdown && <Countdown onComplete={onCountdownComplete} />}
      {showHurryUp && <HurryUp />}
    </div>
  )
}

function HighScorePreview({ mode, difficulty, variant }: { mode: GameMode; difficulty: Difficulty; variant?: string }) {
  const { t } = useTranslation()
  const scores = getHighScores(mode, difficulty, variant)
  const modeLabel = t(`mode.${mode}` as keyof Translations)
  const diffLabel = DIFFICULTIES.find((d) => d.value === difficulty)?.label ?? difficulty
  const variantLabel = variant === 'untimed' ? ' (No Timer)' : ''

  return (
    <div className="glass-panel p-4 min-h-[110px]">
      <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-2.5">
        {t('highScores')} — {modeLabel} / {diffLabel}{variantLabel}
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
                {mode === 'timed' ? `${entry.correctCount} ${t('found.suffix')}` : entry.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
