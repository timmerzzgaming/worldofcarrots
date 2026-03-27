export interface Country {
  id: number
  name: string
  iso_a3: string
}

export interface Question {
  country: Country
  index: number
}

export interface AnswerResult {
  question: Question
  correct: boolean
  selectedCountry: string | null
  timeUsed: number
  score: number
}

export type GamePhase = 'idle' | 'playing' | 'feedback' | 'results'

export type GameMode = 'classic' | 'timed' | 'marathon' | 'survival' | 'practice' | 'borderless' | 'flag' | 'distance'

export interface GameModeConfig {
  mode: GameMode
  label: string
  description: string
  totalQuestions: number | null   // null = all countries
  globalTimeLimit: number | null  // null = no global timer
  perQuestionTime: number | null  // null = no per-question timer
  feedbackDelay: number           // ms before auto-advancing
}
