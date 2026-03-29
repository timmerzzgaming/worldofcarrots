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
  Americas: '#4ECDC4',      // teal
  Asia: '#FF6B6B',          // coral
  Europe: '#A855F7',        // purple
  Oceania: '#4ADE80',       // green
  Antarctica: '#94A3B8',    // gray
}

/** Get fill color for a country based on its continent */
export function continentFillColor(continent: string): string {
  return CONTINENT_COLORS[continent] ?? '#FFE4B5'
}

/** MapLibre expression for continent-based country fill with feature-state overrides */
export function continentFillExpression(): any { // eslint-disable-line
  return [
    'case',
    ['boolean', ['feature-state', 'correct'], false], '#22c55e',
    ['boolean', ['feature-state', 'wrong'], false], '#fdba74',
    ['boolean', ['feature-state', 'target'], false], '#3b82f6',
    ['boolean', ['feature-state', 'solved'], false], '#86efac',
    ['boolean', ['feature-state', 'hover'], false], countryHoverColor(),
    // Default: continent-based color
    ['match', ['get', 'REGION_UN'],
      'Africa', CONTINENT_COLORS.Africa,
      'Americas', CONTINENT_COLORS.Americas,
      'Asia', CONTINENT_COLORS.Asia,
      'Europe', CONTINENT_COLORS.Europe,
      'Oceania', CONTINENT_COLORS.Oceania,
      'Antarctica', CONTINENT_COLORS.Antarctica,
      '#FFCC66', // fallback
    ],
  ]
}
