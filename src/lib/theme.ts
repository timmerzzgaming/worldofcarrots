// Single comic theme — no dark/light toggle
export type Theme = 'comic'

export function getTheme(): Theme {
  return 'comic'
}

export function setTheme(_theme: Theme): void {
  // No-op — single theme
}

export function toggleTheme(): Theme {
  return 'comic'
}

/** Map background color (ocean) — bright sky blue */
export function mapBgColor(): string {
  return '#87CEEB'
}

/** Default country fill — bright warm color visible on sky blue ocean */
export function countryFillColor(): string {
  return '#FFCC66'
}

/** Country border color — bold comic outlines */
export function countryLineColor(): string {
  return '#2D2D2D'
}

/** Small-country circle border color */
export function circleStrokeColor(): string {
  return '#2D2D2D'
}

/** Country hover fill color */
export function countryHoverColor(): string {
  return '#FFD93D'
}

/** Country hover border color */
export function countryHoverLineColor(): string {
  return '#FF6B35'
}

/** Continent-based fill colors for bright map */
export const CONTINENT_COLORS: Record<string, string> = {
  Africa: '#FFD93D',        // bright yellow
  Americas: '#818CF8',      // indigo
  Asia: '#FF6B6B',          // coral
  Europe: '#A855F7',        // purple
  Oceania: '#FBBF24',       // amber/gold
  Antarctica: '#94A3B8',    // gray
}

/** Get fill color for a country based on its continent */
export function continentFillColor(continent: string): string {
  return CONTINENT_COLORS[continent] ?? '#FFE4B5'
}

/** Bright color palette for solved countries — assigned randomly per country */
export const SOLVED_COLORS = [
  '#FF6B6B', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA',
  '#F472B6', '#FB923C', '#2DD4BF', '#818CF8', '#E879F9',
  '#FCA5A5', '#FDE047', '#6EE7B7', '#93C5FD', '#C4B5FD',
  '#F9A8D4', '#FDBA74', '#5EEAD4', '#A5B4FC', '#F0ABFC',
]

/** Get a deterministic bright color for a solved country by its feature id */
export function solvedColor(featureId: number): string {
  return SOLVED_COLORS[featureId % SOLVED_COLORS.length]
}

/** MapLibre expression for country fill with feature-state overrides */
export function continentFillExpression(): any { // eslint-disable-line
  return [
    'case',
    ['boolean', ['feature-state', 'correct'], false], '#22c55e',
    ['boolean', ['feature-state', 'wrong'], false], '#fdba74',
    ['boolean', ['feature-state', 'target'], false], '#3b82f6',
    // Solved countries get a random bright color via solvedIdx (1-20)
    ['>', ['number', ['feature-state', 'solvedIdx'], 0], 0],
    buildSolvedColorStep(),
    // Backward compat: other game pages still use boolean solved state
    ['boolean', ['feature-state', 'solved'], false], '#86efac',
    ['boolean', ['feature-state', 'hover'], false], countryHoverColor(),
    '#FFFFFF', // white default
  ]
}

/** Build a step expression mapping solvedIdx (1-20) to bright colors */
function buildSolvedColorStep(): any { // eslint-disable-line
  // step expression: ['step', input, defaultOutput, stop1, output1, stop2, output2, ...]
  const expr: unknown[] = ['step', ['number', ['feature-state', 'solvedIdx'], 0], '#FFFFFF']
  for (let i = 0; i < SOLVED_COLORS.length; i++) {
    expr.push(i + 1, SOLVED_COLORS[i])
  }
  return expr
}
