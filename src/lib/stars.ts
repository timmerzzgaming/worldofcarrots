/**
 * Star rating system — 0-3 stars based on game performance.
 */

export type StarCount = 0 | 1 | 2 | 3

interface StarThreshold {
  one: number
  two: number
  three: number
}

/**
 * Star thresholds per mode.
 * The metric varies: correctCount, accuracy (0-1), or avgDistanceScore (0-100).
 */
const STAR_THRESHOLDS: Record<string, StarThreshold & { metric: 'correct' | 'accuracy' | 'avgScore' }> = {
  classic:    { metric: 'correct',  one: 4,    two: 7,    three: 9 },
  timed:      { metric: 'correct',  one: 5,    two: 10,   three: 15 },
  marathon:   { metric: 'accuracy', one: 0.50, two: 0.75, three: 0.95 },
  survival:   { metric: 'correct',  one: 10,   two: 25,   three: 50 },
  practice:   { metric: 'correct',  one: Infinity, two: Infinity, three: Infinity }, // always 0 stars
  borderless: { metric: 'correct',  one: 5,    two: 15,   three: 30 },
  flag:       { metric: 'correct',  one: 5,    two: 15,   three: 30 },
  distance:   { metric: 'avgScore', one: 30,   two: 55,   three: 80 },
  'us-states': { metric: 'accuracy', one: 0.50, two: 0.75, three: 0.90 },
}

export function calculateStars(opts: {
  mode: string
  correctCount: number
  totalQuestions: number
  accuracy: number
  avgDistanceScore?: number
  usedHints?: boolean
}): StarCount {
  const { mode, correctCount, accuracy, avgDistanceScore, usedHints } = opts

  const thresholds = STAR_THRESHOLDS[mode]
  if (!thresholds) return 0

  let value: number
  switch (thresholds.metric) {
    case 'correct':
      value = correctCount
      break
    case 'accuracy':
      value = accuracy
      break
    case 'avgScore':
      value = avgDistanceScore ?? 0
      break
  }

  // Flag mode: 3 stars requires no hints
  if (mode === 'flag' && usedHints && value >= thresholds.three) {
    return 2
  }

  if (value >= thresholds.three) return 3
  if (value >= thresholds.two) return 2
  if (value >= thresholds.one) return 1
  return 0
}
