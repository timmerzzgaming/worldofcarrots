'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  COUNTRIES_SOURCE,
  COUNTRIES_FILL_LAYER,
  COUNTRIES_LINE_LAYER,
  initialViewState,
  REGION_VIEWS,
} from '@/lib/mapConfig'
import { CAPITALS, haversineDistance, formatDistance, type Capital } from '@/lib/capitals'
import { normalizeDistance, distanceToScore, filterCapitalsByDifficulty, getCapitalTier, type DistanceDifficulty } from '@/lib/distanceScoring'
import CityQuestionCard from '@/components/game/CityQuestionCard'
import DistanceFeedback from '@/components/game/DistanceFeedback'
import GameAdvisor from '@/components/game/GameAdvisor'
import ThemeToggle from '@/components/ThemeToggle'
import ConfirmDialog from '@/components/game/ConfirmDialog'
import Countdown from '@/components/game/Countdown'
import MapBackground from '@/components/home/MapBackground'
import FloatingFlags from '@/components/home/FloatingFlags'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { playCorrect, playWrong, playGameStart, playGameOver, playClick, startMusic, stopMusic, startMenuMusic, playHighScore, warmUpAudio } from '@/lib/sounds'
import { mapBgColor, countryLineColor } from '@/lib/theme'
import { useMapThemeListener } from '@/hooks/useMapThemeListener'
import { useGameRewards } from '@/hooks/useGameRewards'
import StarRating from '@/components/credits/StarRating'
import CreditBreakdown from '@/components/credits/CreditBreakdown'
import XpProgressBar from '@/components/xp/XpProgressBar'
import { useAuth } from '@/lib/auth/context'
import { useBasePath } from '@/lib/basePath'

type DistanceUnit = 'km' | 'mi'
type Phase = 'idle' | 'playing' | 'feedback' | 'review' | 'results'

const UNIT_STORAGE_KEY = 'woc-distance-unit'
const SCORES_KEY = 'woc-distance-scores'
const QUESTIONS_PER_DIFFICULTY: Record<DistanceDifficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
  expert: 40,
}

interface DistanceAnswer {
  capital: Capital
  guessLat: number
  guessLng: number
  distanceKm: number
  normalizedKm: number
  score: number
}

function getStoredUnit(): DistanceUnit {
  if (typeof window === 'undefined') return 'km'
  return (localStorage.getItem(UNIT_STORAGE_KEY) as DistanceUnit) ?? 'km'
}

function saveUnit(unit: DistanceUnit) {
  localStorage.setItem(UNIT_STORAGE_KEY, unit)
}

interface ScoreEntry {
  totalScore: number
  questions: number
  date: string
  name: string
}

function scoreKey(difficulty: DistanceDifficulty): string {
  return `${SCORES_KEY}:${difficulty}`
}

function getScores(difficulty: DistanceDifficulty): ScoreEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(scoreKey(difficulty)) ?? '[]')
  } catch { return [] }
}

function addScore(difficulty: DistanceDifficulty, entry: ScoreEntry): ScoreEntry[] {
  const scores = getScores(difficulty)
  scores.push(entry)
  scores.sort((a, b) => b.totalScore - a.totalScore)
  const top = scores.slice(0, 10)
  localStorage.setItem(scoreKey(difficulty), JSON.stringify(top))
  return top
}

function isHighScore(difficulty: DistanceDifficulty, total: number): boolean {
  const scores = getScores(difficulty)
  if (scores.length < 10) return true
  return total > scores[scores.length - 1].totalScore
}

export default function DistanceGamePage() {
  const router = useRouter()
  const { prefixPath } = useBasePath()
  const { t, tc } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  // eslint-disable-next-line
  const maplibreRef = useRef<any>(null)
  const guessMarkerRef = useRef<unknown>(null)
  const targetMarkerRef = useRef<unknown>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')

  // Toggle body class for hiding TopBar on mobile during gameplay
  useEffect(() => {
    const active = phase === 'playing' || phase === 'feedback'
    document.body.classList.toggle('game-active', active)
    return () => { document.body.classList.remove('game-active') }
  }, [phase])

  const autoStartRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const questionsRef = useRef<Capital[]>([])
  const currentIndexRef = useRef(0)
  const countryRegionsRef = useRef<Map<string, string>>(new Map())
  const [unit, setUnit] = useState<DistanceUnit>('km')
  const [difficulty, setDifficulty] = useState<DistanceDifficulty>('easy')
  const [selectedRegion, setSelectedRegion] = useState('World')
  const [questions, setQuestions] = useState<Capital[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<DistanceAnswer[]>([])
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [showCountdown, setShowCountdown] = useState(false)
  const [lastDistance, setLastDistance] = useState<number | null>(null)
  const [lastRawDistance, setLastRawDistance] = useState<number | null>(null)
  const [lastMultiplier, setLastMultiplier] = useState(1)

  // Results state
  const [playerName, setPlayerName] = useState('')
  const [saved, setSaved] = useState(false)
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [newIdx, setNewIdx] = useState<number | null>(null)

  const q = questions[currentIndex]
  const showCountry = difficulty === 'easy' || difficulty === 'medium'
  const totalScore = useMemo(() => answers.reduce((sum, a) => sum + a.score, 0), [answers])

  useEffect(() => {
    setUnit(getStoredUnit())
  }, [])

  // Read URL params for auto-start (e.g. /game/distance?difficulty=easy&region=World&unit=km)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const diff = params.get('difficulty') as DistanceDifficulty | null
    const region = params.get('region')
    const u = params.get('unit') as DistanceUnit | null
    if (diff && region) {
      setDifficulty(diff)
      setSelectedRegion(region)
      if (u) {
        setUnit(u)
        localStorage.setItem(UNIT_STORAGE_KEY, u)
      }
      autoStartRef.current = true
    }
  }, [])

  // Auto-start game when map is ready and URL params requested it
  useEffect(() => {
    if (autoStartRef.current && mapReady) {
      autoStartRef.current = false
      launchWithCountdown(handleStartGame)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  function handleUnitToggle() {
    const next = unit === 'km' ? 'mi' : 'km'
    setUnit(next)
    saveUnit(next)
    playClick()
  }

  // Map overlay tracking
  const overlayCountRef = useRef(0)
  const markersRef = useRef<{ remove: () => void }[]>([])

  function createPinElement(color: string): HTMLElement {
    const el = document.createElement('div')
    el.innerHTML = `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`
    el.style.cursor = 'pointer'
    return el
  }

  function clearAllOverlays() {
    const map = mapRef.current as {
      getSource: (id: string) => unknown
      removeLayer: (id: string) => void
      removeSource: (id: string) => void
      getLayer: (id: string) => unknown
    } | null
    if (!map) return
    for (let i = 0; i < overlayCountRef.current; i++) {
      const suffix = `line-${i}`
      if (map.getLayer(suffix)) map.removeLayer(suffix)
      if (map.getSource(suffix)) map.removeSource(suffix)
    }
    overlayCountRef.current = 0
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
  }

  function drawLine(idx: number, guessLng: number, guessLat: number, targetLng: number, targetLat: number, score: number, cityName: string, rawKm: number) {
    const map = mapRef.current as {
      addSource: (id: string, source: unknown) => void
      addLayer: (layer: unknown) => void
    } | null
    if (!map) return

    const lineColor = score >= 50 ? '#22c55e' : score >= 15 ? '#fbbf24' : '#ef4444'

    map.addSource(`line-${idx}`, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [[guessLng, guessLat], [targetLng, targetLat]],
        },
      },
    })
    map.addLayer({
      id: `line-${idx}`,
      type: 'line',
      source: `line-${idx}`,
      paint: {
        'line-color': lineColor,
        'line-width': 2.5,
        'line-dasharray': [2, 2],
        'line-opacity': 0.8,
      },
    })

    // Pin markers using maplibregl Marker
    const maplibregl = maplibreRef.current
    if (maplibregl) {
      const guessPin = new maplibregl.Marker({ element: createPinElement('#ef4444'), anchor: 'bottom' })
        .setLngLat([guessLng, guessLat])
        .addTo(map as unknown as InstanceType<typeof maplibregl.Map>)
      const targetPin = new maplibregl.Marker({ element: createPinElement('#22c55e'), anchor: 'bottom' })
        .setLngLat([targetLng, targetLat])
        .addTo(map as unknown as InstanceType<typeof maplibregl.Map>)
      markersRef.current.push(guessPin, targetPin)
    }

    overlayCountRef.current = Math.max(overlayCountRef.current, idx + 1)
  }

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      try {
        const maplibregl = (await import('maplibre-gl')).default
        maplibreRef.current = maplibregl
        const res = await fetch('/data/countries.geojson')
        if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`)
        const geojson: GeoJSON.FeatureCollection = await res.json()
        if (cancelled || !containerRef.current) return

        // Build country→region lookup for region filtering
        const regionMap = new Map<string, string>()
        geojson.features.forEach((f) => {
          const name = f.properties?.ADMIN
          const region = f.properties?.REGION_UN
          if (typeof name === 'string' && typeof region === 'string') {
            regionMap.set(name, region)
          }
        })
        countryRegionsRef.current = regionMap

        const map = new maplibregl.Map({
          container: containerRef.current!,
          style: { version: 8 as const, name: 'WoC', sources: {}, layers: [{ id: 'background', type: 'background' as const, paint: { 'background-color': mapBgColor() } }] },
          center: initialViewState.center,
          zoom: initialViewState.zoom,
          attributionControl: false,
          renderWorldCopies: true,

        })

        map.addControl(new maplibregl.NavigationControl(), 'bottom-left')
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
        map.getCanvas().style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'36\' viewBox=\'0 0 24 36\'%3E%3Cpath d=\'M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z\' fill=\'%23ef4444\'/%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'5\' fill=\'white\'/%3E%3C/svg%3E") 12 36, crosshair'

        map.on('load', () => {
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
              'fill-color': ['match', ['get', 'REGION_UN'],
                'Africa', '#FFD93D', 'Americas', '#4ECDC4', 'Asia', '#FF6B6B',
                'Europe', '#A855F7', 'Oceania', '#4ADE80', '#FFCC66'],
              'fill-opacity': 0.85,
            },
          })

          map.addLayer({
            id: COUNTRIES_LINE_LAYER,
            type: 'line',
            source: COUNTRIES_SOURCE,
            paint: {
              'line-color': countryLineColor(),
              'line-width': 1.2,
            },
          })

          // Signal that map layers are ready (used by auto-start)
          setMapReady(true)
        })

        map.on('click', (e) => {
          if (phaseRef.current !== 'playing') return
          const currentQ = questionsRef.current[currentIndexRef.current]
          if (!currentQ) return

          const { lng, lat } = e.lngLat
          const rawDist = haversineDistance(lat, lng, currentQ.lat, currentQ.lng)
          const normDist = normalizeDistance(rawDist, currentQ.country)

          if (rawDist < 200) playCorrect()
          else playWrong()

          const pts = distanceToScore(normDist)
          const mult = rawDist > 0 ? normDist / rawDist : 1

          const answer: DistanceAnswer = {
            capital: currentQ,
            guessLat: lat,
            guessLng: lng,
            distanceKm: rawDist,
            normalizedKm: normDist,
            score: pts,
          }

          setAnswers((prev) => [...prev, answer])
          setLastDistance(pts)
          setLastRawDistance(rawDist)
          setLastMultiplier(mult)
          phaseRef.current = 'feedback'
          setPhase('feedback')

          drawLine(currentIndexRef.current, lng, lat, currentQ.lng, currentQ.lat, pts, currentQ.city, rawDist)

          // Fit bounds to show both points
          const sw: [number, number] = [Math.min(lng, currentQ.lng) - 5, Math.min(lat, currentQ.lat) - 5]
          const ne: [number, number] = [Math.max(lng, currentQ.lng) + 5, Math.max(lat, currentQ.lat) + 5]
          map.fitBounds([sw, ne], { padding: 80, duration: 800 })
        })

        // Popup for hovering over guess/target dots during review/results
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: 'distance-popup',
        })

        map.on('mousemove', (e) => {
          const currentPhase = phaseRef.current
          if (currentPhase !== 'review' && currentPhase !== 'results') {
            popup.remove()
            if (currentPhase === 'playing') {
              map.getCanvas().style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'36\' viewBox=\'0 0 24 36\'%3E%3Cpath d=\'M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z\' fill=\'%23ef4444\'/%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'5\' fill=\'white\'/%3E%3C/svg%3E") 12 36, crosshair'
            }
            return
          }

          // Build list of point layers to query
          const layers: string[] = []
          for (let i = 0; i < overlayCountRef.current; i++) {
            layers.push(`guess-${i}`, `target-${i}`)
          }
          if (layers.length === 0) return

          const features = map.queryRenderedFeatures(e.point, { layers })
          if (features.length > 0) {
            const f = features[0]
            const p = f.properties
            if (p?.city) {
              const label = p.type === 'guess' ? 'Your guess' : p.city
              const html = `<div style="font-family:sans-serif;font-size:13px;line-height:1.4;padding:2px 0">
                <strong>${p.city}</strong><br/>
                <span style="color:#94a3b8">${p.rawKm.toLocaleString()} km off</span><br/>
                <span style="font-weight:700;color:${p.score >= 50 ? '#22c55e' : p.score >= 15 ? '#fbbf24' : '#ef4444'}">${p.score}/100</span>
                ${p.type === 'guess' ? '<br/><span style="color:#ef4444;font-size:11px">Your guess</span>' : ''}
              </div>`
              popup.setLngLat(e.lngLat).setHTML(html).addTo(map)
              map.getCanvas().style.cursor = 'pointer'
            }
          } else {
            popup.remove()
            map.getCanvas().style.cursor = 'default'
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const distanceThemeUpdates = useMemo(() => [
    { layer: 'background', property: 'background-color', value: () => mapBgColor() },
    { layer: COUNTRIES_LINE_LAYER, property: 'line-color', value: () => countryLineColor() },
  ], [])
  useMapThemeListener(mapRef, distanceThemeUpdates)

  function handleNextQuestion() {
    if (currentIndex + 1 >= questions.length) {
      // Go to review phase — show all guesses on map
      phaseRef.current = 'review'
      setPhase('review')
      stopMusic()

      // Fly to region view to see all pins
      const regionView = REGION_VIEWS[selectedRegion] ?? REGION_VIEWS.World
      const map = mapRef.current as { flyTo?: (opts: { center: [number, number]; zoom: number; duration: number }) => void } | null
      map?.flyTo?.({ center: regionView.center, zoom: regionView.zoom, duration: 1200 })
      return
    }

    const nextIdx = currentIndex + 1
    currentIndexRef.current = nextIdx
    setCurrentIndex(nextIdx)
    setLastDistance(null)
    phaseRef.current = 'playing'
    setPhase('playing')

    // Fly back to region view
    const regionView = REGION_VIEWS[selectedRegion] ?? REGION_VIEWS.World
    const map = mapRef.current as { flyTo?: (opts: { center: [number, number]; zoom: number; duration: number }) => void } | null
    map?.flyTo?.({ center: regionView.center, zoom: regionView.zoom, duration: 800 })
  }

  function handleShowResults() {
    phaseRef.current = 'results'
    setPhase('results')
    playGameOver()
  }

  function handleStartGame() {
    const count = QUESTIONS_PER_DIFFICULTY[difficulty]
    const maxTier = { easy: 1, medium: 2, hard: 3, expert: 4 }[difficulty] as 1 | 2 | 3 | 4

    // Filter capitals by region
    const regionMap = countryRegionsRef.current
    const regionPool = selectedRegion === 'World'
      ? CAPITALS
      : CAPITALS.filter((c) => regionMap.get(c.country) === selectedRegion)

    // Build a progressive question list: start easy, ramp up difficulty
    // Split questions into segments — each segment pulls from increasingly harder tiers
    const segments = maxTier
    const actualCount = Math.min(count, regionPool.length)
    const perSegment = Math.ceil(actualCount / segments)
    const used = new Set<string>()
    const selected: Capital[] = []

    for (let tier = 1; tier <= maxTier; tier++) {
      const tierPool = regionPool.filter(
        (c) => getCapitalTier(c.country) <= tier && !used.has(c.country),
      )
      const shuffled = [...tierPool].sort(() => Math.random() - 0.5)
      const pick = shuffled.slice(0, perSegment)
      pick.forEach((c) => used.add(c.country))
      selected.push(...pick)
    }

    // Trim to exact count (may have extras from rounding)
    const final = selected.slice(0, actualCount)
    questionsRef.current = final
    currentIndexRef.current = 0
    phaseRef.current = 'playing'
    setQuestions(final)
    setCurrentIndex(0)
    setAnswers([])
    setLastDistance(null)
    setSaved(false)
    setNewIdx(null)
    setPhase('playing')
    playGameStart()
    startMusic()

    clearAllOverlays()
    const map = mapRef.current as { flyTo?: (opts: { center: [number, number]; zoom: number; duration: number }) => void } | null
    const view = REGION_VIEWS[selectedRegion] ?? REGION_VIEWS.World
    map?.flyTo?.({ center: view.center, zoom: view.zoom, duration: 800 })
  }

  // Menu music on idle
  useEffect(() => {
    if (phase === 'idle') startMenuMusic()
  }, [phase])

  // Load scores on results
  useEffect(() => {
    if (phase === 'results') {
      setScores(getScores(difficulty))
      setPlayerName(localStorage.getItem('woc-player-name') ?? '')
    }
  }, [phase, difficulty])

  function handleSaveScore() {
    if (!playerName.trim()) return
    localStorage.setItem('woc-player-name', playerName.trim())
    const entry: ScoreEntry = {
      totalScore,
      questions: questions.length,
      date: new Date().toISOString(),
      name: playerName.trim(),
    }
    const updated = addScore(difficulty, entry)
    setScores(updated)
    const idx = updated.findIndex((e) => e.totalScore === entry.totalScore && e.name === entry.name && e.date === entry.date)
    setNewIdx(idx)
    setSaved(true)
    playHighScore()
  }

  const qualifies = phase === 'results' && isHighScore(difficulty, totalScore)
  const { user } = useAuth()

  // Stats
  const bestGuess = answers.length > 0 ? Math.max(...answers.map((a) => a.score)) : 0
  const worstGuess = answers.length > 0 ? Math.min(...answers.map((a) => a.score)) : 0
  const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0

  // Calculate rewards
  const rewards = useGameRewards({
    phase,
    mode: 'distance',
    difficulty,
    correctCount: answers.length,
    totalQuestions: answers.length,
    accuracy: answers.length > 0 ? avgScore / 100 : 0,
    avgDistanceScore: avgScore,
  })

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

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Background for idle */}
      {phase === 'idle' && !showCountdown && (
        <>
          <MapBackground />
          <FloatingFlags />
        </>
      )}

      {/* Game map */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ visibility: phase === 'idle' && !showCountdown ? 'hidden' : 'visible' }}
      />

      {/* Desktop: Quit/Restart (hidden on mobile) */}
      {(phase === 'playing' || phase === 'feedback' || phase === 'review') && !showCountdown && (
        <div className="hidden sm:flex fixed top-4 right-4 z-10 gap-2">
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

      {/* Mobile: Compact unified game HUD */}
      {(phase === 'playing' || phase === 'feedback') && !showCountdown && (
        <div className="sm:hidden fixed top-0 left-0 right-0 z-10 px-2 pt-2">
          <div className="glass-panel px-2 py-1.5 flex items-center gap-1.5">
            {/* Quit & Restart icon buttons */}
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => { playClick(); setShowQuitConfirm(true) }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-geo-surface-high/50 border border-geo-outline-dim/20 text-geo-on-surface-dim hover:text-geo-error transition-colors"
                aria-label={t('quit')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
              <button
                onClick={() => { playClick(); setShowRestartConfirm(true) }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-geo-surface-high/50 border border-geo-outline-dim/20 text-geo-on-surface-dim hover:text-geo-primary transition-colors"
                aria-label={t('restart')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.625-3.85a5.5 5.5 0 019.201-2.465l.312.31H11.767a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V2.535a.75.75 0 00-1.5 0v2.033l-.312-.31A7 7 0 002.627 7.394a.75.75 0 001.449.39z" clipRule="evenodd" />
                </svg>
              </button>
              <ThemeToggle />
            </div>

            {/* Center: City/Country question */}
            {phase === 'playing' && q && (
              <div className="flex-1 min-w-0 text-center truncate">
                <span className="text-[10px] text-geo-on-surface-dim font-headline font-bold uppercase">
                  {currentIndex + 1}/{questions.length}
                </span>
                <span className="mx-1 text-geo-outline-dim">·</span>
                <span className="text-xs font-headline font-extrabold text-geo-primary uppercase">{q.city}</span>
              </div>
            )}
            {phase === 'feedback' && (
              <div className="flex-1 min-w-0 text-center">
                <span className="text-[10px] text-geo-on-surface-dim font-headline font-bold uppercase">
                  {currentIndex + 1}/{questions.length}
                </span>
              </div>
            )}

            {/* Right: Score */}
            <div className="shrink-0">
              <span className="text-sm font-headline font-extrabold text-geo-primary tabular-nums text-glow-primary">
                {totalScore}
              </span>
            </div>
          </div>
        </div>
      )}

      {showRestartConfirm && (
        <ConfirmDialog
          title={`${t('restart')}?`}
          message={t('progressLost')}
          confirmLabel={t('restart')}
          onCancel={() => setShowRestartConfirm(false)}
          onConfirm={() => { setShowRestartConfirm(false); launchWithCountdown(handleStartGame) }}
        />
      )}
      {showQuitConfirm && (
        <ConfirmDialog
          title={t('quitGame')}
          message={t('progressLost')}
          confirmLabel={t('quit')}
          confirmVariant="danger"
          onCancel={() => setShowQuitConfirm(false)}
          onConfirm={() => { setShowQuitConfirm(false); stopMusic(); clearAllOverlays(); phaseRef.current = 'idle'; setPhase('idle'); router.push(prefixPath('/?cat=mapGames&game=/game/distance')) }}
        />
      )}

      {/* Desktop: Question card — top center (hidden on mobile) */}
      {phase === 'playing' && q && !showCountdown && (
        <div className="hidden sm:block fixed top-4 left-1/2 -translate-x-1/2 z-10">
          <CityQuestionCard
            cityName={q.city}
            countryName={q.country}
            showCountry={showCountry}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            history={answers.map((a) => ({ score: a.score }))}
          />
        </div>
      )}

      {/* Distance feedback */}
      {phase === 'feedback' && q && lastDistance !== null && !showCountdown && (
        <div className="fixed top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <DistanceFeedback
            rawDistanceKm={lastRawDistance ?? 0}
            score={lastDistance ?? 0}
            unit={unit}
            cityName={q.city}
            countryName={q.country}
            multiplier={lastMultiplier}
            delay={1000}
            onContinue={handleNextQuestion}
          />
        </div>
      )}

      {/* Desktop: Scoreboard during game (hidden on mobile) */}
      {(phase === 'playing' || phase === 'feedback') && !showCountdown && (
        <div className="hidden sm:block fixed top-4 right-4 z-10">
          <div className="glass-panel px-3 py-2 sm:px-5 sm:py-3 flex items-center gap-3 sm:gap-5">
            <div>
              <p className="text-geo-on-surface-dim text-[10px] sm:text-xs font-headline font-bold uppercase tracking-widest">{t('score')}</p>
              <p className="text-geo-primary text-lg sm:text-2xl font-headline font-extrabold tabular-nums text-glow-primary">
                {totalScore}
              </p>
            </div>
            <div>
              <p className="text-geo-on-surface-dim text-[10px] sm:text-xs font-headline font-bold uppercase tracking-widest">{t('progress')}</p>
              <p className="text-geo-secondary text-base sm:text-lg font-headline font-extrabold tabular-nums">
                {currentIndex + 1}/{questions.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Quit button during review phase */}
      {phase === 'review' && (
        <div className="sm:hidden fixed top-2 left-2 z-10">
          <button
            onClick={() => { playClick(); setShowQuitConfirm(true) }}
            className="w-8 h-8 flex items-center justify-center rounded-full glass-panel text-geo-on-surface-dim hover:text-geo-error transition-colors"
            aria-label={t('quit')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {/* Review phase — show all guesses, then click to see results */}
      {phase === 'review' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-center">
          <div className="bg-geo-bg/90 backdrop-blur-md border-2 border-geo-outline-dim/40 rounded-3xl px-8 py-5 shadow-xl">
            <p className="text-white text-lg font-headline font-extrabold uppercase mb-1">
              {t('score')}: {totalScore}
            </p>
            <p className="text-geo-on-surface-dim text-sm font-body mb-4">
              {answers.length} {t('of')} {questions.length} — {t('pinOnMap')}
            </p>

            {/* Mini dot summary */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {answers.map((a, i) => {
                const s = Math.max(0, Math.min(100, a.score))
                let r: number, g: number, b: number
                if (s <= 50) { r = 239; g = Math.round(68 + (187 * s) / 50); b = 68 }
                else { r = Math.round(255 - (221 * (s - 50)) / 50); g = Math.round(197 + (58 * (s - 50)) / 50); b = Math.round(68 + (125 * (s - 50)) / 50) }
                return <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${r},${g},${b})` }} title={`${a.capital.city}: ${a.score}/100`} />
              })}
            </div>

            <button
              onClick={handleShowResults}
              className="btn-primary px-10 py-3 text-lg"
            >
              Show Score
            </button>
          </div>
        </div>
      )}

      {/* Idle / Menu */}
      {phase === 'idle' && !showCountdown && (
        <div className="absolute inset-0 z-20 flex flex-col items-center px-4 pt-4 pb-4">
          <div className="absolute top-4 left-4 flex gap-2 z-30">
            <button
              onClick={() => { playClick(); router.push(prefixPath('/?cat=mapGames&game=/game/distance')) }}
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
              {(() => { const w = t('distanceMode').split(' '); const last = w.pop()!; return w.length ? <>{w.join(' ')} <span className="text-geo-primary text-glow-primary">{last}</span></> : <span className="text-geo-primary text-glow-primary">{last}</span>; })()}
            </h2>
            <p className="text-geo-on-surface-dim text-center mb-6 font-body text-sm">
              {t('distanceSubtitle')}
            </p>

            {/* Region */}
            <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectRegion')}</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
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
              {(['easy', 'medium', 'hard', 'expert'] as DistanceDifficulty[]).map((d) => {
                const icons: Record<string, string> = { easy: '🟢', medium: '🟡', hard: '🟠', expert: '🔴' }
                return (
                  <button
                    key={d}
                    onClick={() => { playClick(); setDifficulty(d) }}
                    className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                      difficulty === d
                        ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_15px_-5px_rgba(107,255,193,0.2)]'
                        : 'hover:border-geo-primary/40 hover:shadow-[0_0_20px_-5px_rgba(107,255,193,0.15)]'
                    }`}
                  >
                    <div className="text-xl mb-1">{icons[d]}</div>
                    <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                      difficulty === d ? 'text-geo-primary' : 'text-geo-on-surface-dim'
                    }`}>{t(`diff.${d}` as keyof Translations)}</p>
                  </button>
                )
              })}
            </div>

            {/* Unit */}
            <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectUnit' as keyof Translations) || 'Unit'}</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={handleUnitToggle}
                className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                  unit === 'km'
                    ? 'border-geo-secondary/50 bg-geo-secondary/10 shadow-[0_0_15px_-5px_rgba(100,168,254,0.2)]'
                    : 'hover:border-geo-secondary/40 hover:shadow-[0_0_20px_-5px_rgba(100,168,254,0.15)]'
                }`}
              >
                <div className="text-xl mb-1">🌐</div>
                <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                  unit === 'km' ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
                }`}>{t('km')}</p>
              </button>
              <button
                onClick={handleUnitToggle}
                className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                  unit === 'mi'
                    ? 'border-geo-secondary/50 bg-geo-secondary/10 shadow-[0_0_15px_-5px_rgba(100,168,254,0.2)]'
                    : 'hover:border-geo-secondary/40 hover:shadow-[0_0_20px_-5px_rgba(100,168,254,0.15)]'
                }`}
              >
                <div className="text-xl mb-1">🇺🇸</div>
                <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                  unit === 'mi' ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
                }`}>{t('mi')}</p>
              </button>
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
              text={t(`speech.distance.${difficulty}` as keyof Translations)}
            />
          </div>

          {/* High scores */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="max-w-lg mx-auto glass-panel p-4 min-h-[110px]">
              <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-2.5">
                {t('highScores')} &mdash; {t('distanceMode')}
              </p>
              {getScores(difficulty).length === 0 ? (
                <p className="text-geo-outline text-sm font-body">{t('noScoresYet')}</p>
              ) : (
                <div className="space-y-1.5">
                  {getScores(difficulty).slice(0, 5).map((entry, i) => (
                    <div key={`${entry.date}-${i}`} className="flex items-center gap-2 text-sm">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-headline font-extrabold ${
                        i === 0 ? 'bg-geo-tertiary-bright/20 text-geo-tertiary-bright border border-geo-tertiary-bright/40' : 'bg-geo-surface-highest text-geo-on-surface-dim border border-geo-outline-dim/30'
                      }`}>{i + 1}</span>
                      <span className="flex-1 truncate text-geo-on-surface font-body font-medium">{entry.name}</span>
                      <span className={`font-headline font-extrabold text-xs ${i === 0 ? 'text-geo-primary' : 'text-geo-on-surface-dim'}`}>
                        {entry.totalScore} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'results' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-geo-bg/80 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Stars */}
            {rewards && rewards.stars > 0 && <div className="mb-4"><StarRating stars={rewards.stars} /></div>}

            <h2 className="text-4xl font-headline font-extrabold text-geo-on-surface italic uppercase tracking-tighter drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] text-center mb-6">
              {avgScore >= 60 ? t('distanceMaster') : t('gameOver')}
            </h2>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: t('stat.score'), value: `${totalScore}`, color: 'text-geo-primary text-glow-primary' },
                { label: t('stat.avgDist'), value: `${avgScore}/100`, color: 'text-geo-secondary text-glow-secondary' },
                { label: t('stat.bestGuess'), value: `${bestGuess}/100`, color: 'text-geo-tertiary text-glow-tertiary' },
                { label: t('stat.worstGuess'), value: `${worstGuess}/100`, color: 'text-geo-error text-glow-error' },
              ].map((stat) => (
                <div key={stat.label} className="bg-geo-surface-high/50 rounded-2xl p-3 text-center border border-geo-outline-dim/20">
                  <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-0.5">{stat.label}</p>
                  <p className={`text-2xl font-headline font-extrabold ${stat.color} drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* XP Progress */}
            {rewards && rewards.xp.total > 0 && user && (
              <div className="mb-4">
                <XpProgressBar
                  totalXp={user.xp}
                  level={user.level}
                  xpEarned={rewards.xp.total}
                  leveledUp={rewards.leveledUp}
                  newLevel={rewards.newLevel}
                />
              </div>
            )}

            {/* Credits Earned */}
            {rewards && rewards.breakdown.total > 0 && (
              <div className="mb-5">
                <CreditBreakdown breakdown={rewards.breakdown} />
              </div>
            )}

            {/* Name entry */}
            {qualifies && !saved && (
              <div className="mb-5 p-4 rounded-2xl bg-geo-tertiary-bright/10 border-2 border-geo-tertiary/40">
                <p className="text-geo-tertiary-bright text-sm font-headline font-extrabold uppercase tracking-wide mb-2">{t('newHighScore')}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveScore()}
                    placeholder={t('enterName')}
                    maxLength={20}
                    className="flex-1 px-4 py-2 rounded-full bg-geo-bg border-2 border-geo-outline-dim text-geo-on-surface text-sm font-body placeholder-geo-outline focus:outline-none focus:border-geo-primary focus:ring-4 focus:ring-geo-primary/20"
                  />
                  <button onClick={handleSaveScore} className="btn-primary px-5 py-2 text-sm">
                    {t('save')}
                  </button>
                </div>
              </div>
            )}

            {/* High scores */}
            {scores.length > 0 && (
              <div className="mb-5">
                <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-2">{t('highScores')}</p>
                <div className="space-y-1.5">
                  {scores.map((entry, i) => (
                    <div
                      key={`${entry.date}-${i}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                        i === newIdx ? 'bg-geo-primary/10 border border-geo-primary/30' : 'bg-geo-surface-high/30'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-headline font-extrabold ${
                        i === 0 ? 'bg-geo-tertiary-bright/20 text-geo-tertiary-bright border border-geo-tertiary-bright/40' : 'bg-geo-surface-highest text-geo-on-surface-dim border border-geo-outline-dim/30'
                      }`}>{i + 1}</span>
                      <span className="flex-1 truncate text-geo-on-surface font-body font-medium">{entry.name}</span>
                      <span className={`font-headline font-extrabold text-xs ${i === 0 ? 'text-geo-primary' : 'text-geo-on-surface-dim'}`}>
                        {entry.totalScore} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answer breakdown */}
            <details className="mb-5" open={scores.length === 0}>
              <summary className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest cursor-pointer hover:text-geo-on-surface mb-2">
                {t('answerDetails')}
              </summary>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {answers.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-sm ${
                      a.score >= 35 ? 'bg-geo-primary/10 text-geo-primary-dim' : 'bg-geo-error/10 text-geo-error'
                    }`}
                  >
                    <span className="font-body">{a.capital.city}, {tc(a.capital.country)}</span>
                    <span className="font-headline font-bold">{a.score}/100</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={() => { phaseRef.current = 'idle'; setPhase('idle'); clearAllOverlays(); stopMusic(); startMenuMusic() }} className="btn-ghost flex-1 py-3 text-sm">
                {t('backToMenu')}
              </button>
              <button onClick={() => { setPhase('idle'); launchWithCountdown(handleStartGame) }} className="btn-primary flex-1 py-3 text-sm">
                {t('playAgain')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCountdown && <Countdown onComplete={onCountdownComplete} />}
    </div>
  )
}
