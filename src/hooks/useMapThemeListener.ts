import { useEffect } from 'react'
import { mapBgColor, countryFillColor, countryHoverColor, countryLineColor, circleStrokeColor, type Theme } from '@/lib/theme'

interface PaintUpdate {
  layer: string
  property: string
  // eslint-disable-next-line
  value: (theme: Theme) => any
}

/**
 * Listens for 'woc-theme-change' events and updates map paint properties.
 * Each game page provides its own set of paint updates based on its layers.
 */
export function useMapThemeListener(
  mapRef: React.MutableRefObject<unknown>,
  updates: PaintUpdate[],
) {
  useEffect(() => {
    function onThemeChange(e: Event) {
      const theme = (e as CustomEvent<Theme>).detail
      // eslint-disable-next-line
      const map = mapRef.current as any
      if (!map || !map.isStyleLoaded?.()) return
      for (const u of updates) {
        map.setPaintProperty(u.layer, u.property, u.value(theme))
      }
    }
    window.addEventListener('woc-theme-change', onThemeChange)
    return () => window.removeEventListener('woc-theme-change', onThemeChange)
  }, [mapRef, updates])
}

// Pre-built paint update configs for common layer setups

export function countryMapThemeUpdates(
  fillLayer: string,
  lineLayer: string,
  circleLayer?: string,
  ringLayer?: string,
  extraFillStates?: [string, string][],
): PaintUpdate[] {
  const updates: PaintUpdate[] = [
    { layer: 'background', property: 'background-color', value: (t) => mapBgColor(t) },
    {
      layer: fillLayer,
      property: 'fill-color',
      value: (t) => [
        'case',
        ['boolean', ['feature-state', 'correct'], false], '#22c55e',
        ['boolean', ['feature-state', 'wrong'], false], '#fca5a5',
        ['boolean', ['feature-state', 'target'], false], '#3b82f6',
        ['boolean', ['feature-state', 'solved'], false], '#86efac',
        ...(extraFillStates?.flatMap(([state, color]) => [
          ['boolean', ['feature-state', state], false], color,
        ]) ?? []),
        ['boolean', ['feature-state', 'hover'], false], countryHoverColor(t),
        countryFillColor(t),
      ],
    },
    {
      layer: lineLayer,
      property: 'line-color',
      value: (t) => [
        'case',
        ['boolean', ['feature-state', 'correct'], false], '#16a34a',
        ['boolean', ['feature-state', 'wrong'], false], '#dc2626',
        ['boolean', ['feature-state', 'target'], false], '#2563eb',
        ['boolean', ['feature-state', 'solved'], false], '#22c55e',
        ...(extraFillStates?.flatMap(([state, color]) => [
          ['boolean', ['feature-state', state], false], color,
        ]) ?? []),
        countryLineColor(t),
      ],
    },
  ]
  if (circleLayer) {
    updates.push({ layer: circleLayer, property: 'circle-color', value: (t) => circleStrokeColor(t) })
  }
  if (ringLayer) {
    updates.push({ layer: ringLayer, property: 'circle-stroke-color', value: (t) => circleStrokeColor(t) })
  }
  return updates
}
