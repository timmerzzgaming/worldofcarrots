import { create } from 'zustand'
import type { GamePhase, GameMode, GameModeConfig, Question, AnswerResult, Country } from '@/types/game'
import { GAME_MODES, generateQuestions, calculateScore } from '@/lib/gameEngine'
import { type Difficulty, filterByDifficulty } from '@/lib/countryDifficulty'

const LIVES_PER_LIFE_BACK = 10

interface GameStore {
  phase: GamePhase
  mode: GameMode
  modeConfig: GameModeConfig
  difficulty: Difficulty
  countries: Country[]
  questions: Question[]
  currentIndex: number
  answers: AnswerResult[]
  score: number
  lives: number
  streak: number
  timeRemaining: number
  elapsed: number
  feedbackCountry: string | null
  feedbackCorrect: boolean | null
  lifeEarned: boolean
  correctCountries: Set<string>

  variant: string
  countryRegions: Map<string, string>
  setCountries: (countries: Country[], regions: Map<string, string>) => void
  startGame: (mode: GameMode, difficulty: Difficulty, region?: string, variant?: string) => void
  submitAnswer: (selectedCountryName: string | null) => void
  nextQuestion: () => void
  tick: () => void
  timeOut: () => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'idle',
  mode: 'classic',
  modeConfig: GAME_MODES.classic,
  difficulty: 'easy',
  countries: [],
  questions: [],
  currentIndex: 0,
  answers: [],
  score: 0,
  lives: 3,
  streak: 0,
  timeRemaining: 15,
  elapsed: 0,
  feedbackCountry: null,
  feedbackCorrect: null,
  lifeEarned: false,
  correctCountries: new Set(),
  variant: '',
  countryRegions: new Map(),

  setCountries: (countries, regions) => set({ countries, countryRegions: regions }),

  startGame: (mode, difficulty, region, variant) => {
    const { countries, countryRegions } = get()
    let config = { ...GAME_MODES[mode] }

    // Borderless untimed: override perQuestionTime to null
    if (mode === 'borderless' && variant === 'untimed') {
      config = { ...config, perQuestionTime: null }
    }

    let pool = countries

    // Region filter — applies to all modes
    if (region && region !== 'World') {
      pool = pool.filter((c) => countryRegions.get(c.name) === region)
    }

    // Difficulty filter — all modes except marathon
    if (mode !== 'marathon') {
      const allowedNames = new Set(filterByDifficulty(pool.map((c) => c.name), difficulty))
      const filtered = pool.filter((c) => allowedNames.has(c.name))
      if (filtered.length > 0) pool = filtered
    }

    const count = config.totalQuestions ?? pool.length
    const questions = generateQuestions(pool, count)
    const timeRemaining = config.globalTimeLimit ?? config.perQuestionTime ?? 0

    set({
      phase: 'playing',
      mode,
      modeConfig: config,
      difficulty,
      variant: variant ?? '',
      questions,
      currentIndex: 0,
      answers: [],
      score: 0,
      lives: 3,
      streak: 0,
      timeRemaining,
      elapsed: 0,
      feedbackCountry: null,
      feedbackCorrect: null,
      lifeEarned: false,
      correctCountries: new Set(),
    })
  },

  submitAnswer: (selectedCountryName) => {
    const { questions, currentIndex, timeRemaining, modeConfig, answers, score, elapsed, correctCountries, lives, streak, mode } = get()
    const question = questions[currentIndex]
    const correct = selectedCountryName === question.country.name

    const perQ = modeConfig.perQuestionTime
    const timeUsed = perQ ? perQ - timeRemaining : 0
    const questionScore = calculateScore(correct, perQ ? timeRemaining : null, perQ, question.country.name, mode)

    const result: AnswerResult = {
      question,
      correct,
      selectedCountry: selectedCountryName,
      timeUsed,
      score: questionScore,
    }

    const newCorrect = new Set(correctCountries)
    if (correct) newCorrect.add(question.country.name)

    // Lives tracking: survival and borderless
    let newLives = lives
    let newStreak = streak
    let earnedLife = false
    if (mode === 'survival') {
      if (correct) {
        newStreak = streak + 1
        if (newStreak > 0 && newStreak % LIVES_PER_LIFE_BACK === 0) {
          newLives = lives + 1
          earnedLife = true
        }
      } else {
        newLives = lives - 1
        newStreak = 0
      }
    } else if (mode === 'borderless') {
      if (correct) {
        newStreak = streak + 1
        // Gain 1 life every 3 correct in a row, max 3
        if (newStreak > 0 && newStreak % 3 === 0 && lives < 3) {
          newLives = lives + 1
        }
      } else {
        newLives = lives - 1
        newStreak = 0
      }
    } else if (mode === 'flag') {
      if (correct) {
        newStreak = streak + 1
      } else {
        newLives = lives - 1
        newStreak = 0
      }
    }

    set({
      phase: 'feedback',
      answers: [...answers, result],
      score: score + questionScore,
      lives: newLives,
      streak: newStreak,
      feedbackCountry: question.country.name,
      feedbackCorrect: correct,
      lifeEarned: earnedLife,
      correctCountries: newCorrect,
    })
  },

  nextQuestion: () => {
    const { currentIndex, questions, modeConfig, timeRemaining, lives, mode } = get()

    // Survival / Borderless / Flag: game over if no lives
    if ((mode === 'survival' || mode === 'borderless' || mode === 'flag') && lives <= 0) {
      set({ phase: 'results', feedbackCountry: null, feedbackCorrect: null })
      return
    }

    // Timed: game over if global timer expired
    if (modeConfig.globalTimeLimit && timeRemaining <= 0) {
      set({ phase: 'results', feedbackCountry: null, feedbackCorrect: null })
      return
    }

    // No more questions
    if (currentIndex + 1 >= questions.length) {
      set({ phase: 'results', feedbackCountry: null, feedbackCorrect: null })
      return
    }

    set({
      phase: 'playing',
      currentIndex: currentIndex + 1,
      timeRemaining: modeConfig.perQuestionTime ?? timeRemaining,
      feedbackCountry: null,
      feedbackCorrect: null,
    })
  },

  tick: () => {
    const { timeRemaining, elapsed } = get()
    set({
      timeRemaining: Math.max(0, timeRemaining - 0.1),
      elapsed: elapsed + 0.1,
    })
  },

  timeOut: () => {
    const { phase, modeConfig } = get()
    if (phase !== 'playing') return

    if (modeConfig.globalTimeLimit) {
      set({ phase: 'results', feedbackCountry: null, feedbackCorrect: null })
    } else if (modeConfig.perQuestionTime) {
      get().submitAnswer(null)
    }
  },

  reset: () =>
    set({
      phase: 'idle',
      questions: [],
      currentIndex: 0,
      answers: [],
      score: 0,
      lives: 3,
      streak: 0,
      timeRemaining: 15,
      elapsed: 0,
      feedbackCountry: null,
      feedbackCorrect: null,
      correctCountries: new Set(),
      variant: '',
    }),
}))
