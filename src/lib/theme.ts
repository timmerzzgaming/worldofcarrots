const STORAGE_KEY = 'woc-theme'

export type Theme = 'dark' | 'light'

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  window.dispatchEvent(new CustomEvent('woc-theme-change', { detail: theme }))
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

/** Map background color (ocean) */
export function mapBgColor(theme?: Theme): string {
  return (theme ?? getTheme()) === 'light' ? '#7bb8d9' : '#0f172a'
}

/** Default country fill color */
export function countryFillColor(theme?: Theme): string {
  return (theme ?? getTheme()) === 'light' ? '#cbd5e1' : '#334155'
}

/** Country border color */
export function countryLineColor(theme?: Theme): string {
  return (theme ?? getTheme()) === 'light' ? '#94a3b8' : '#475569'
}

/** Small-country circle border color — white on light theme for visibility */
export function circleStrokeColor(theme?: Theme): string {
  return (theme ?? getTheme()) === 'light' ? '#ffffff' : '#94a3b8'
}

/** Country hover fill color */
export function countryHoverColor(theme?: Theme): string {
  return (theme ?? getTheme()) === 'light' ? '#cbd5e1' : '#cbd5e1'
}

/** Country hover border/circle color — green on light, lighter gray on dark */
export function countryHoverLineColor(theme?: Theme): string {
  return (theme ?? getTheme()) === 'light' ? '#22c55e' : '#94a3b8'
}
