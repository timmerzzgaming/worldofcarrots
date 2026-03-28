import type { Country, Question, AnswerResult, GameMode, GameModeConfig } from '@/types/game'
import { getCountryPoints } from '@/lib/countryDifficulty'

const BASE_SCORE = 1000

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  classic: {
    mode: 'classic',
    label: 'Classic',
    description: '10 countries — timer varies by difficulty',
    totalQuestions: 10,
    globalTimeLimit: null,
    perQuestionTime: 15,
    feedbackDelay: 1000,
  },
  timed: {
    mode: 'timed',
    label: 'Time Attack',
    description: '60 seconds — find as many as you can',
    totalQuestions: null,
    globalTimeLimit: 60,
    perQuestionTime: null,
    feedbackDelay: 1000,
  },
  marathon: {
    mode: 'marathon',
    label: 'Marathon',
    description: 'All countries — fill the entire map',
    totalQuestions: null,
    globalTimeLimit: null,
    perQuestionTime: null,
    feedbackDelay: 1000,
  },
  survival: {
    mode: 'survival',
    label: 'Survival',
    description: '3 lives, 10s per question — earn a life back every 10 correct',
    totalQuestions: null,
    globalTimeLimit: null,
    perQuestionTime: 10,
    feedbackDelay: 1000,
  },
  practice: {
    mode: 'practice',
    label: 'Practice',
    description: 'No timer, no lives — explore at your own pace',
    totalQuestions: null,
    globalTimeLimit: null,
    perQuestionTime: null,
    feedbackDelay: 1000,
  },
  borderless: {
    mode: 'borderless',
    label: 'Borderless',
    description: '3 lives, no borders — find countries by memory alone',
    totalQuestions: null,
    globalTimeLimit: null,
    perQuestionTime: 20,
    feedbackDelay: 1000,
  },
  flag: {
    mode: 'flag',
    label: 'Guess the Flag',
    description: 'See a flag, click the country — use hints to narrow it down',
    totalQuestions: null,
    globalTimeLimit: null,
    perQuestionTime: 20,
    feedbackDelay: 1000,
  },
  distance: {
    mode: 'distance',
    label: 'Distance',
    description: 'Pin a capital on the map — lowest total distance wins',
    totalQuestions: 20,
    globalTimeLimit: null,
    perQuestionTime: null,
    feedbackDelay: 1000,
  },
}

export function generateQuestions(countries: Country[], count: number | null): Question[] {
  const shuffled = [...countries].sort(() => Math.random() - 0.5)
  const selected = count ? shuffled.slice(0, count) : shuffled
  return selected.map((country, index) => ({ country, index }))
}

export function calculateScore(
  correct: boolean,
  timeRemaining: number | null,
  maxTime: number | null,
  countryName?: string,
  mode?: GameMode,
): number {
  if (!correct) return 0

  // Marathon/survival/flag: points based on country difficulty tier
  if (countryName && (mode === 'marathon' || mode === 'survival' || mode === 'flag')) {
    const tierPoints = getCountryPoints(countryName)
    if (timeRemaining !== null && maxTime !== null && maxTime > 0) {
      const timeBonus = Math.round(tierPoints * (timeRemaining / maxTime))
      return tierPoints + timeBonus
    }
    return tierPoints
  }

  // Classic/timed: flat base + time bonus
  if (timeRemaining !== null && maxTime !== null && maxTime > 0) {
    const timeBonus = Math.round(BASE_SCORE * (timeRemaining / maxTime))
    return BASE_SCORE + timeBonus
  }
  return BASE_SCORE
}

export function calculateResults(answers: AnswerResult[]) {
  const totalScore = answers.reduce((sum, a) => sum + a.score, 0)
  const correctCount = answers.filter((a) => a.correct).length
  const accuracy = answers.length > 0 ? correctCount / answers.length : 0
  const totalTime = answers.reduce((sum, a) => sum + a.timeUsed, 0)

  return {
    totalScore,
    correctCount,
    totalQuestions: answers.length,
    accuracy,
    totalTime: Math.round(totalTime * 10) / 10,
  }
}

export function getCountriesFromGeoJSON(geojson: GeoJSON.FeatureCollection): Country[] {
  return geojson.features
    .filter((f) => f.properties?.ADMIN && f.properties?.ISO_A3)
    .map((f, i) => ({
      id: i,
      name: f.properties!.ADMIN as string,
      iso_a3: f.properties!.ISO_A3 as string,
    }))
}
