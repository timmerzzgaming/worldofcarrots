'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/context'
import { useBasePath } from '@/lib/basePath'
import { playClick, playCorrect, playWrong, playGameStart, playGameOver, startMultiplayerMusic, stopMultiplayerMusic, startMenuMusic, playVictoryFanfare } from '@/lib/sounds'
import {
  getLobby,
  getLobbyPlayers,
  joinLobby,
  leaveLobby,
  setReady,
  updateLobbySettings,
  updateLobbyStatus,
  deleteLobby,
  kickPlayer,
  sendChatMessage,
  getChatMessages,
  submitAnswer,
  updatePlayerScore,
  subscribeToLobby,
  broadcastToLobby,
  unsubscribeFromLobby,
  sendPing,
  sendPong,
  type Lobby,
  type LobbyPlayer,
  type ChatMessage,
  type BroadcastEvent,
  type MultiQuestion as MultiQuestionT,
  type RoundResult,
  type FinalScore,
} from '@/lib/multiplayer'
import {
  generateMultiMixQuestions,
  generateSeed,
  setCountryIsoMap,
  buildCountryIsoMap,
  calculateMultiPoints,
} from '@/lib/multiMixQuestions'
import {
  getMapStyle,
  COUNTRIES_SOURCE,
  COUNTRIES_FILL_LAYER,
  COUNTRIES_LINE_LAYER,
  SMALL_COUNTRIES_SOURCE,
  SMALL_COUNTRIES_CIRCLE_LAYER,
  SMALL_COUNTRIES_RING_LAYER,
  initialViewState,
} from '@/lib/mapConfig'
import { mapBgColor, countryHoverColor, countryHoverLineColor, countryLineColor, circleStrokeColor } from '@/lib/theme'
import { buildSmallCountryPoints, createFeatureStateSetter, zoomScaledCircleRadius } from '@/lib/mapHelpers'
import { haversineDistance } from '@/lib/capitals'
import { normalizeDistance, distanceToScore } from '@/lib/distanceScoring'
import PlayerList from '@/components/multiplayer/PlayerList'
import ChatPanel from '@/components/multiplayer/ChatPanel'
import GameScoreboard from '@/components/multiplayer/GameScoreboard'
import MultiQuestionComponent from '@/components/multiplayer/MultiQuestion'
import type { RealtimeChannel } from '@supabase/supabase-js'

type GamePhase = 'lobby' | 'playing' | 'results'

export default function MultiplayerLobbyPage() {
  const router = useRouter()
  const params = useParams()
  const lobbyId = params.id as string
  const { t } = useTranslation()
  const { user, isGuest } = useAuth()
  const { prefixPath } = useBasePath()

  // Lobby state
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [players, setPlayers] = useState<LobbyPlayer[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [phase, setPhase] = useState<GamePhase>('lobby')
  const [copied, setCopied] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [playerPings, setPlayerPings] = useState<Map<string, number>>(new Map())

  // Game state
  const [questions, setQuestions] = useState<MultiQuestionT[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [roundStartTime, setRoundStartTime] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [myScore, setMyScore] = useState(0)
  const [playerScores, setPlayerScores] = useState<Map<string, { score: number; answered: boolean; isCorrect?: boolean }>>(new Map())
  const [answered, setAnswered] = useState(false)
  const [finalScores, setFinalScores] = useState<FinalScore[]>([])

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mapRef = useRef<unknown>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nameToIdRef = useRef<Map<string, number>>(new Map())
  const smallNameToIdRef = useRef<Map<string, number>>(new Map())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionsRef = useRef<MultiQuestionT[]>([])
  const currentRoundRef = useRef(0)
  const answeredRef = useRef(false)
  const roundStartRef = useRef(0)
  const myScoreRef = useRef(0)
  const phaseRef = useRef<GamePhase>('lobby')

  // Keep refs in sync
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { currentRoundRef.current = currentRound }, [currentRound])
  useEffect(() => { answeredRef.current = answered }, [answered])
  useEffect(() => { roundStartRef.current = roundStartTime }, [roundStartTime])
  useEffect(() => { myScoreRef.current = myScore }, [myScore])
  useEffect(() => { phaseRef.current = phase }, [phase])

  const isHost = lobby?.host_id === user?.id
  const activePlayers = players.filter((p) => !p.is_spectator)
  const readyCount = activePlayers.filter((p) => p.is_ready).length
  const canStart = isHost && activePlayers.length >= 2 && readyCount === activePlayers.length

  // ─── Load lobby data ──────────────────────────────────────

  useEffect(() => {
    if (!lobbyId || !user || isGuest) return

    async function load() {
      const lobbyData = await getLobby(lobbyId)
      if (!lobbyData) {
        router.push(prefixPath('/game/multiplayer'))
        return
      }
      setLobby(lobbyData)

      const playerData = await getLobbyPlayers(lobbyId)
      setPlayers(playerData)

      const messages = await getChatMessages(lobbyId)
      setChatMessages(messages)

      // If game is already playing, set phase
      if (lobbyData.status === 'playing') setPhase('playing')
      if (lobbyData.status === 'finished') setPhase('results')
    }

    load()
  }, [lobbyId, user, isGuest, router, prefixPath])

  // ─── Realtime subscription ────────────────────────────────

  useEffect(() => {
    if (!lobbyId || !user || isGuest) return

    const channel = subscribeToLobby(lobbyId, user.id, user.nickname, {
      onPresenceSync: () => {
        // Refresh player list on presence changes
        getLobbyPlayers(lobbyId).then(setPlayers)
      },
      onBroadcast: (event: BroadcastEvent) => {
        handleBroadcast(event)
      },
      onPlayerJoin: () => {
        getLobbyPlayers(lobbyId).then(setPlayers)
      },
      onPlayerLeave: () => {
        getLobbyPlayers(lobbyId).then(setPlayers)
      },
    })

    channelRef.current = channel

    return () => {
      if (channel) unsubscribeFromLobby(channel)
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId, user, isGuest])

  // ─── Timer ────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing' || answered) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - roundStartRef.current
      const q = questionsRef.current[currentRoundRef.current]
      if (!q) return
      const remaining = Math.max(0, q.timeLimit * 1000 - elapsed)
      setTimeRemaining(remaining)
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, answered, currentRound])

  // ─── Ping measurement ─────────────────────────────────────

  useEffect(() => {
    if (!channelRef.current || !user) return
    const interval = setInterval(() => {
      if (channelRef.current) sendPing(channelRef.current, user.id)
    }, 5000)
    return () => clearInterval(interval)
  }, [user])

  // ─── Broadcast handler ────────────────────────────────────

  const handleBroadcast = useCallback((event: BroadcastEvent) => {
    switch (event.type) {
      case 'game_start': {
        playGameStart()
        startMultiplayerMusic()
        setCountryIsoMap(buildCountryIsoMap({ type: 'FeatureCollection', features: [] }))
        // Generate questions from seed
        const qs = generateMultiMixQuestions(event.seed, lobby?.duration_minutes ?? 5)
        setQuestions(qs)
        questionsRef.current = qs
        setCurrentRound(0)
        setMyScore(0)
        myScoreRef.current = 0
        setPhase('playing')
        phaseRef.current = 'playing'
        setPlayerScores(new Map())
        break
      }
      case 'round_start': {
        setCurrentRound(event.round)
        currentRoundRef.current = event.round
        setRoundStartTime(event.startTime)
        roundStartRef.current = event.startTime
        setAnswered(false)
        answeredRef.current = false
        setTimeRemaining((questionsRef.current[event.round]?.timeLimit ?? 15) * 1000)
        // Reset answer indicators
        setPlayerScores((prev) => {
          const next = new Map(prev)
          next.forEach((v, k) => {
            next.set(k, { ...v, answered: false, isCorrect: undefined })
          })
          return next
        })
        break
      }
      case 'player_answer': {
        setPlayerScores((prev) => {
          const next = new Map(prev)
          const existing = next.get(event.userId) ?? { score: 0, answered: false }
          next.set(event.userId, { ...existing, answered: true })
          return next
        })
        break
      }
      case 'round_end': {
        // Update scores from round results
        for (const result of event.answers) {
          setPlayerScores((prev) => {
            const next = new Map(prev)
            const existing = next.get(result.userId) ?? { score: 0, answered: false }
            next.set(result.userId, {
              score: existing.score + result.pointsEarned,
              answered: true,
              isCorrect: result.isCorrect,
            })
            return next
          })
          if (result.userId === user?.id) {
            if (result.isCorrect) playCorrect()
            else playWrong()
          }
        }
        break
      }
      case 'game_end': {
        stopMultiplayerMusic()
        playVictoryFanfare()
        setFinalScores(event.finalScores)
        setPhase('results')
        phaseRef.current = 'results'
        break
      }
      case 'kick': {
        if (event.userId === user?.id) {
          router.push(prefixPath('/game/multiplayer'))
        }
        break
      }
      case 'chat': {
        // Skip own messages (already added locally in handleSendChat)
        if (event.message.user_id !== user?.id) {
          setChatMessages((prev) => [...prev, event.message])
        }
        break
      }
      case 'ready_change': {
        // Refresh player list when someone toggles ready
        getLobbyPlayers(lobbyId).then(setPlayers)
        break
      }
      case 'lobby_cancelled': {
        stopMultiplayerMusic()
        startMenuMusic()
        alert(t('mp.lobbyCancelled'))
        router.push(prefixPath('/game/multiplayer'))
        break
      }
      case 'ping': {
        if (event.senderId !== user?.id && channelRef.current) {
          sendPong(channelRef.current, user?.id ?? '', event.timestamp)
        }
        break
      }
      case 'pong': {
        if (event.senderId !== user?.id) {
          const latency = Math.round((Date.now() - event.originalTimestamp) / 2)
          setPlayerPings((prev) => {
            const next = new Map(prev)
            next.set(event.senderId, latency)
            return next
          })
        }
        break
      }
      case 'settings_change': {
        setLobby((prev) => prev ? { ...prev, duration_minutes: event.duration_minutes } : prev)
        break
      }
      default:
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.duration_minutes, user?.id, router, prefixPath])

  // ─── Map initialization ───────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing' || !containerRef.current) return
    let cancelled = false

    async function initMap() {
      const maplibregl = (await import('maplibre-gl')).default
      const res = await fetch('/data/countries.geojson')
      if (!res.ok) return
      const geojson: GeoJSON.FeatureCollection = await res.json()
      if (cancelled || !containerRef.current) return

      // Build ISO map for question generation
      const isoMap = buildCountryIsoMap(geojson)
      setCountryIsoMap(isoMap)

      // If we have no questions yet, regenerate from seed
      if (questionsRef.current.length === 0 && lobby?.question_seed) {
        const qs = generateMultiMixQuestions(lobby.question_seed, lobby.duration_minutes)
        setQuestions(qs)
        questionsRef.current = qs
      }

      const nameToId = new Map<string, number>()
      geojson.features.forEach((f, i) => {
        const name = f.properties?.ADMIN
        if (typeof name === 'string') nameToId.set(name, i)
      })
      nameToIdRef.current = nameToId

      const map = new maplibregl.Map({
        container: containerRef.current!,
        style: getMapStyle(''),
        center: initialViewState.center,
        zoom: initialViewState.zoom,
        attributionControl: false,
        renderWorldCopies: true,
        dragRotate: false,
        touchPitch: false,
        pitchWithRotate: false,
      })

      map.on('load', () => {
        // Add GeoJSON source
        map.addSource(COUNTRIES_SOURCE, {
          type: 'geojson',
          data: geojson,
          promoteId: 'ADMIN',
        })

        // Fill layer
        map.addLayer({
          id: COUNTRIES_FILL_LAYER,
          type: 'fill',
          source: COUNTRIES_SOURCE,
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['feature-state', 'correct'], false], '#22c55e',
              ['boolean', ['feature-state', 'wrong'], false], '#ef4444',
              ['boolean', ['feature-state', 'hover'], false], countryHoverColor(),
              '#ffffff',
            ],
            'fill-opacity': 0.85,
          },
        })

        // Line layer
        map.addLayer({
          id: COUNTRIES_LINE_LAYER,
          type: 'line',
          source: COUNTRIES_SOURCE,
          paint: {
            'line-color': countryLineColor(),
            'line-width': 1.5,
          },
        })

        // Small countries
        const smallPoints = buildSmallCountryPoints(geojson.features as GeoJSON.Feature[])
        map.addSource(SMALL_COUNTRIES_SOURCE, {
          type: 'geojson',
          data: smallPoints,
          promoteId: 'ADMIN',
        })

        map.addLayer({
          id: SMALL_COUNTRIES_CIRCLE_LAYER,
          type: 'circle',
          source: SMALL_COUNTRIES_SOURCE,
          paint: {
            'circle-radius': zoomScaledCircleRadius(),
            'circle-color': [
              'case',
              ['boolean', ['feature-state', 'correct'], false], '#22c55e',
              ['boolean', ['feature-state', 'wrong'], false], '#ef4444',
              'transparent',
            ],
            'circle-opacity': 0.5,
          },
        })

        map.addLayer({
          id: SMALL_COUNTRIES_RING_LAYER,
          type: 'circle',
          source: SMALL_COUNTRIES_SOURCE,
          paint: {
            'circle-radius': zoomScaledCircleRadius(),
            'circle-color': 'transparent',
            'circle-stroke-color': circleStrokeColor(),
            'circle-stroke-width': 1.5,
          },
        })

        // Build small country lookup
        const smallMap = new Map<string, number>()
        smallPoints.features.forEach((f, i) => {
          const name = (f.properties as Record<string, unknown>)?.ADMIN as string
          if (name) smallMap.set(name, i)
        })
        smallNameToIdRef.current = smallMap
      })

      // Click handler
      map.on('click', (e: unknown) => {
        if (phaseRef.current !== 'playing' || answeredRef.current) return

        const mapEvent = e as { point: { x: number; y: number }; lngLat: { lng: number; lat: number } }
        const q = questionsRef.current[currentRoundRef.current]
        if (!q) return

        if (q.type === 'distance') {
          handleDistanceAnswer(mapEvent.lngLat.lat, mapEvent.lngLat.lng, q, map, maplibregl)
          return
        }

        // Country/Flag click
        const features = map.queryRenderedFeatures([mapEvent.point.x, mapEvent.point.y] as [number, number], {
          layers: [COUNTRIES_FILL_LAYER, SMALL_COUNTRIES_CIRCLE_LAYER],
        })
        if (!features?.length) return

        const clickedName = features[0].properties?.ADMIN as string
        if (!clickedName) return

        handleCountryAnswer(clickedName, q, map)
      })

      mapRef.current = map

      return () => {
        map.remove()
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ─── Answer handlers ──────────────────────────────────────

  function handleCountryAnswer(clickedName: string, question: MultiQuestionT, map: unknown) {
    if (answeredRef.current) return
    setAnswered(true)
    answeredRef.current = true

    const isCorrect = clickedName === question.correctAnswer
    const timeMs = Date.now() - roundStartRef.current
    const timeLimitMs = question.timeLimit * 1000
    const points = isCorrect ? calculateMultiPoints(question.type, timeLimitMs - timeMs, timeLimitMs) : 0

    // Visual feedback on map
    const m = map as { setFeatureState: (target: { source: string; id: string | number }, state: Record<string, boolean>) => void }
    const feedbackState = isCorrect ? 'correct' : 'wrong'

    const clickedId = nameToIdRef.current.get(clickedName)
    if (clickedId !== undefined) {
      m.setFeatureState({ source: COUNTRIES_SOURCE, id: clickedName }, { [feedbackState]: true })
    }

    // Show correct answer if wrong
    if (!isCorrect) {
      m.setFeatureState({ source: COUNTRIES_SOURCE, id: question.correctAnswer }, { correct: true })
    }

    // Update score
    const newScore = myScoreRef.current + points
    setMyScore(newScore)
    myScoreRef.current = newScore

    // Broadcast answer
    if (channelRef.current && user) {
      broadcastToLobby(channelRef.current, {
        type: 'player_answer',
        userId: user.id,
        round: currentRoundRef.current,
        timeMs,
      })
    }

    // Submit to DB
    if (user) {
      submitAnswer({
        lobby_id: lobbyId,
        user_id: user.id,
        round_number: currentRoundRef.current,
        answer: clickedName,
        is_correct: isCorrect,
        time_ms: timeMs,
        points_earned: points,
      })
      updatePlayerScore(lobbyId, user.id, newScore)
    }

    // Clear feedback after 1.5s
    setTimeout(() => {
      m.setFeatureState({ source: COUNTRIES_SOURCE, id: clickedName }, { correct: false, wrong: false })
      m.setFeatureState({ source: COUNTRIES_SOURCE, id: question.correctAnswer }, { correct: false, wrong: false })
    }, 1500)
  }

  function handleDistanceAnswer(
    lat: number,
    lng: number,
    question: MultiQuestionT,
    map: unknown,
    maplibregl: typeof import('maplibre-gl'),
  ) {
    if (answeredRef.current || !question.capitalLat || !question.capitalLng) return
    setAnswered(true)
    answeredRef.current = true

    const rawKm = haversineDistance(lat, lng, question.capitalLat, question.capitalLng)
    const normalized = normalizeDistance(rawKm, question.correctAnswer)
    const scoreVal = distanceToScore(normalized)
    const timeMs = Date.now() - roundStartRef.current
    const timeLimitMs = question.timeLimit * 1000
    const points = calculateMultiPoints('distance', timeLimitMs - timeMs, timeLimitMs, scoreVal)

    const newScore = myScoreRef.current + points
    setMyScore(newScore)
    myScoreRef.current = newScore

    // Add markers on map
    const m = map as { setFeatureState: (target: { source: string; id: string | number }, state: Record<string, boolean>) => void }
    // We could add markers here but keeping it simple

    // Broadcast
    if (channelRef.current && user) {
      broadcastToLobby(channelRef.current, {
        type: 'player_answer',
        userId: user.id,
        round: currentRoundRef.current,
        timeMs,
      })
    }

    // Submit to DB
    if (user) {
      submitAnswer({
        lobby_id: lobbyId,
        user_id: user.id,
        round_number: currentRoundRef.current,
        answer: `${lat.toFixed(4)},${lng.toFixed(4)}`,
        is_correct: scoreVal >= 50,
        time_ms: timeMs,
        points_earned: points,
      })
      updatePlayerScore(lobbyId, user.id, newScore)
    }

    if (scoreVal >= 50) playCorrect()
    else playWrong()
  }

  // ─── Host actions ─────────────────────────────────────────

  async function handleStartGame() {
    if (!canStart || !channelRef.current || !user) return
    playClick()

    const seed = generateSeed()

    // Fetch GeoJSON to build ISO map before generating questions
    const res = await fetch('/data/countries.geojson')
    const geojson: GeoJSON.FeatureCollection = await res.json()
    const isoMap = buildCountryIsoMap(geojson)
    setCountryIsoMap(isoMap)

    const qs = generateMultiMixQuestions(seed, lobby?.duration_minutes ?? 5)
    const totalRounds = qs.length

    // Update lobby in DB
    await updateLobbyStatus(lobbyId, 'playing', {
      question_seed: seed,
      total_rounds: totalRounds,
      started_at: new Date().toISOString(),
    })

    // Broadcast game start
    broadcastToLobby(channelRef.current, {
      type: 'game_start',
      questions: qs,
      totalRounds,
      seed,
    })

    // Set local state
    setQuestions(qs)
    questionsRef.current = qs
    setPhase('playing')
    phaseRef.current = 'playing'
    setMyScore(0)
    myScoreRef.current = 0

    // Start first round after short delay
    setTimeout(() => {
      if (channelRef.current) {
        broadcastToLobby(channelRef.current, {
          type: 'round_start',
          round: 0,
          question: qs[0],
          startTime: Date.now(),
        })
      }
    }, 2000)
  }

  function handleTimeout() {
    if (answeredRef.current) return
    setAnswered(true)
    answeredRef.current = true
    playWrong()

    // Submit timeout answer
    if (user) {
      submitAnswer({
        lobby_id: lobbyId,
        user_id: user.id,
        round_number: currentRoundRef.current,
        answer: '',
        is_correct: false,
        time_ms: (questionsRef.current[currentRoundRef.current]?.timeLimit ?? 15) * 1000,
        points_earned: 0,
      })
    }

    if (channelRef.current && user) {
      broadcastToLobby(channelRef.current, {
        type: 'player_answer',
        userId: user.id,
        round: currentRoundRef.current,
        timeMs: (questionsRef.current[currentRoundRef.current]?.timeLimit ?? 15) * 1000,
      })
    }

    // Host advances to next round after timeout
    if (isHost) {
      setTimeout(() => advanceRound(), 2000)
    }
  }

  function advanceRound() {
    const nextRound = currentRoundRef.current + 1
    if (nextRound >= questionsRef.current.length) {
      // Game over
      endGame()
      return
    }

    if (channelRef.current) {
      broadcastToLobby(channelRef.current, {
        type: 'round_start',
        round: nextRound,
        question: questionsRef.current[nextRound],
        startTime: Date.now(),
      })
    }
  }

  async function endGame() {
    if (!channelRef.current) return

    const playerData = await getLobbyPlayers(lobbyId)
    const scores: FinalScore[] = playerData
      .filter((p) => !p.is_spectator)
      .map((p) => ({
        userId: p.user_id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score,
        correctCount: 0,
      }))
      .sort((a, b) => b.score - a.score)

    await updateLobbyStatus(lobbyId, 'finished', { finished_at: new Date().toISOString() })

    broadcastToLobby(channelRef.current, {
      type: 'game_end',
      finalScores: scores,
    })
  }

  async function handleKick(targetUserId: string) {
    playClick()
    await kickPlayer(lobbyId, targetUserId)
    if (channelRef.current) {
      broadcastToLobby(channelRef.current, { type: 'kick', userId: targetUserId })
    }
    const updated = await getLobbyPlayers(lobbyId)
    setPlayers(updated)
  }

  async function handleToggleReady() {
    if (!user) return
    playClick()
    const me = players.find((p) => p.user_id === user.id)
    if (!me) return
    const newReady = !me.is_ready
    await setReady(lobbyId, user.id, newReady)
    const updated = await getLobbyPlayers(lobbyId)
    setPlayers(updated)
    // Broadcast so other clients (especially host) see the change
    if (channelRef.current) {
      broadcastToLobby(channelRef.current, { type: 'ready_change', userId: user.id, ready: newReady })
    }
  }

  async function handleDurationChange(minutes: number) {
    playClick()
    await updateLobbySettings(lobbyId, { duration_minutes: minutes })
    setLobby((prev) => prev ? { ...prev, duration_minutes: minutes } : prev)
    if (channelRef.current) {
      broadcastToLobby(channelRef.current, { type: 'settings_change', duration_minutes: minutes })
    }
  }

  async function handleToggleVisibility() {
    if (!lobby) return
    playClick()
    const newPublic = !lobby.is_public
    await updateLobbySettings(lobbyId, { is_public: newPublic })
    setLobby((prev) => prev ? { ...prev, is_public: newPublic } : prev)
  }

  async function handleDeleteLobby() {
    if (!lobby || !isHost) return
    playClick()
    if (channelRef.current) {
      broadcastToLobby(channelRef.current, { type: 'lobby_cancelled' })
    }
    await deleteLobby(lobbyId)
    startMenuMusic()
    router.push(prefixPath('/game/multiplayer'))
  }

  async function handleSendChat(message: string) {
    if (!user) return
    const msg = await sendChatMessage(lobbyId, user.id, user.nickname, user.avatar ?? '🌍', message)
    if (msg) {
      // Add to local state immediately (sender doesn't receive their own broadcast)
      setChatMessages((prev) => [...prev, msg])
      if (channelRef.current) {
        broadcastToLobby(channelRef.current, { type: 'chat', message: msg })
      }
    }
  }

  function handleCopyCode() {
    if (!lobby) return
    navigator.clipboard.writeText(lobby.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLeave() {
    playClick()
    stopMultiplayerMusic()
    startMenuMusic()
    if (user) await leaveLobby(lobbyId, user.id)
    router.push(prefixPath('/game/multiplayer'))
  }

  function handlePlayAgain() {
    playClick()
    setPhase('lobby')
    phaseRef.current = 'lobby'
    setQuestions([])
    setCurrentRound(0)
    setMyScore(0)
    myScoreRef.current = 0
    setFinalScores([])
    setAnswered(false)
    answeredRef.current = false
  }

  // ─── Guest gate ───────────────────────────────────────────

  if (!user || isGuest) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel p-8 text-center max-w-md">
          <p className="text-geo-on-surface-dim">{t('mp.loginRequired')}</p>
          <button onClick={() => router.push(prefixPath('/'))} className="btn-ghost px-6 py-2 mt-4">
            {t('home')}
          </button>
        </div>
      </main>
    )
  }

  // ─── Lobby Phase ──────────────────────────────────────────

  if (phase === 'lobby') {
    return (
      <main className="min-h-screen flex items-center justify-center p-3 pt-14 sm:p-4 sm:pt-16 lg:p-6 lg:pt-16 pb-16 sm:pb-20">
        <div className="glass-panel w-full max-w-4xl max-h-[80vh] flex flex-col lg:flex-row gap-4 p-4 sm:p-6 overflow-hidden">
        {/* Left: Players + Settings */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <button onClick={handleLeave} className="btn-ghost px-4 py-2 text-sm shrink-0">
              {t('back')}
            </button>
            <h1 className="text-xl sm:text-2xl font-headline font-extrabold text-geo-on-surface uppercase truncate">
              {t('mp.lobby')}
            </h1>
            <div className="shrink-0" />
          </div>

          {/* Invite Code */}
          {lobby && (
            <div className="glass-panel p-4 text-center">
              <p className="text-xs text-geo-on-surface-dim uppercase font-headline mb-1">
                {t('mp.invite')}
              </p>
              <button
                onClick={handleCopyCode}
                className="text-3xl sm:text-4xl font-headline font-extrabold text-geo-primary tracking-[0.3em] hover:text-geo-on-surface transition-colors"
                aria-label={`${t('mp.copyCode')}: ${lobby.code}`}
              >
                {lobby.code}
              </button>
              <p className="text-xs text-geo-on-surface-dim mt-1">
                {copied ? t('mp.codeCopied') : t('mp.copyCode')}
              </p>
            </div>
          )}

          {/* Player List */}
          <div className="glass-panel p-4 flex-1 overflow-y-auto">
            <h2 className="font-headline font-bold text-geo-on-surface text-sm uppercase mb-3">
              {t('mp.players')} ({activePlayers.length})
            </h2>
            <PlayerList
              players={players}
              currentUserId={user.id}
              hostId={lobby?.host_id ?? ''}
              onKick={isHost ? handleKick : undefined}
              pings={playerPings}
            />
          </div>

          {/* Host Controls */}
          {isHost && (
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-headline font-bold text-geo-on-surface" htmlFor="duration-select">
                  {t('mp.duration')}:
                </label>
                <select
                  id="duration-select"
                  value={lobby?.duration_minutes ?? 5}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  className="bg-geo-surface border border-geo-outline rounded-lg px-3 py-1.5 text-sm text-geo-on-surface"
                >
                  {[3, 5, 10, 15].map((m) => (
                    <option key={m} value={m}>{m} {t('mp.minutes')}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-headline font-bold text-geo-on-surface" htmlFor="visibility-toggle">
                  {t('mp.private')}:
                </label>
                <button
                  id="visibility-toggle"
                  role="switch"
                  aria-checked={!(lobby?.is_public ?? true)}
                  onClick={() => handleToggleVisibility()}
                  className={cn(
                    'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
                    lobby?.is_public ? 'bg-geo-outline' : 'bg-geo-primary',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 rounded-full bg-white transition-transform',
                      lobby?.is_public ? 'translate-x-1' : 'translate-x-6',
                    )}
                  />
                </button>
                <span className="text-xs text-geo-on-surface-dim">
                  {lobby?.is_public ? t('mp.public') : t('mp.private')}
                </span>
              </div>
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={cn(
                  'btn-primary w-full py-3 text-lg',
                  !canStart && 'opacity-50 cursor-not-allowed',
                )}
              >
                {canStart ? t('mp.start') : t('mp.waiting')}
              </button>
              {!canStart && activePlayers.length < 2 && (
                <p className="text-xs text-geo-on-surface-dim text-center">
                  Need at least 2 players to start
                </p>
              )}
              <button
                onClick={handleDeleteLobby}
                className="btn-ghost w-full py-2 text-sm text-geo-error hover:text-red-400"
              >
                {t('mp.deleteLobby')}
              </button>
            </div>
          )}

          {/* Ready toggle for non-host */}
          {!isHost && (
            <button
              onClick={handleToggleReady}
              className={cn(
                'w-full py-3 text-lg font-headline font-bold uppercase rounded-xl transition-all',
                players.find((p) => p.user_id === user.id)?.is_ready
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'btn-secondary',
              )}
            >
              {players.find((p) => p.user_id === user.id)?.is_ready ? t('mp.ready') : t('mp.notReady')}
            </button>
          )}
        </div>

        {/* Right: Chat */}
        <div className="w-full lg:w-80 h-64 lg:h-auto flex flex-col border-l-0 lg:border-l border-geo-outline/30 shrink-0">
          <ChatPanel
            messages={chatMessages}
            onSend={handleSendChat}
            currentUserId={user.id}
          />
        </div>
        </div>
      </main>
    )
  }

  // ─── Playing Phase ────────────────────────────────────────

  if (phase === 'playing') {
    const currentQ = questions[currentRound]
    const scoreboardPlayers = players
      .filter((p) => !p.is_spectator)
      .map((p) => ({
        userId: p.user_id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.user_id === user.id ? myScore : (playerScores.get(p.user_id)?.score ?? p.score),
        answered: p.user_id === user.id ? answered : (playerScores.get(p.user_id)?.answered ?? false),
        isCorrect: playerScores.get(p.user_id)?.isCorrect,
      }))

    return (
      <main className="h-screen flex flex-col lg:flex-row relative">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={containerRef} className="absolute inset-0" />

          {/* Question overlay */}
          {currentQ && (
            <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-10">
              <MultiQuestionComponent
                question={currentQ}
                timeRemaining={timeRemaining}
                onTimeout={handleTimeout}
              />
            </div>
          )}
        </div>

        {/* Sidebar: Scoreboard + Chat */}
        <div className="w-full lg:w-80 flex flex-col shrink-0 bg-geo-bg/80 backdrop-blur-sm border-l border-geo-outline/30">
          <div className="p-3 shrink-0">
            <GameScoreboard
              players={scoreboardPlayers}
              currentUserId={user.id}
              round={currentRound + 1}
              totalRounds={questions.length}
            />
          </div>
          <div className="flex-1 min-h-0 border-t border-geo-outline/30">
            <button
              onClick={() => setChatCollapsed(!chatCollapsed)}
              className="w-full px-3 py-1.5 text-xs font-headline font-bold text-geo-on-surface-dim uppercase hover:text-geo-on-surface transition-colors text-left"
            >
              {chatCollapsed ? `▸ ${t('mp.chat')}` : `▾ ${t('mp.chat')}`}
            </button>
            {!chatCollapsed && (
              <div className="h-48 lg:flex-1">
                <ChatPanel
                  messages={chatMessages}
                  onSend={handleSendChat}
                  currentUserId={user.id}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  // ─── Results Phase ────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-6 sm:p-8 max-w-lg w-full text-center"
      >
        <h1 className="text-3xl sm:text-4xl font-headline font-extrabold text-geo-on-surface uppercase mb-2">
          {t('mp.gameOver')}
        </h1>

        {finalScores.length > 0 && (
          <>
            {/* Winner */}
            <div className="my-6">
              <span className="text-5xl">{finalScores[0]?.avatar}</span>
              <p className="text-xl font-headline font-extrabold text-geo-primary mt-2">
                🏆 {finalScores[0]?.nickname}
              </p>
              <p className="text-2xl font-headline font-bold text-geo-on-surface">
                {finalScores[0]?.score.toLocaleString()} {t('pts')}
              </p>
            </div>

            {/* Full standings */}
            <div className="space-y-2 mb-6">
              {finalScores.map((p, i) => (
                <div
                  key={p.userId}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl',
                    p.userId === user.id ? 'bg-geo-primary/10' : 'bg-geo-surface/50',
                  )}
                >
                  <span className="w-6 text-center font-headline font-bold text-geo-on-surface-dim">
                    {i + 1}
                  </span>
                  <span>{p.avatar}</span>
                  <span className="flex-1 text-left font-headline font-bold text-geo-on-surface text-sm truncate">
                    {p.nickname}
                  </span>
                  <span className="font-headline font-bold text-geo-primary tabular-nums">
                    {p.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3 justify-center">
          {isHost && (
            <button onClick={handlePlayAgain} className="btn-primary px-6 py-3">
              {t('mp.playAgain')}
            </button>
          )}
          <button onClick={handleLeave} className="btn-ghost px-6 py-3">
            {t('home')}
          </button>
        </div>
      </motion.div>
    </main>
  )
}
