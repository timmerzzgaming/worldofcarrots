import { mapBgColor, countryHoverColor, countryLineColor, circleStrokeColor, continentFillExpression } from '@/lib/theme'

// eslint-disable-next-line
type PaintValue = any

interface PaintUpdate {
  layer: string
  property: string
  value: () => PaintValue
}

/**
 * No-op in single-theme mode. Kept for API compatibility.
 */
export function useMapThemeListener(
  _mapRef: React.MutableRefObject<unknown>,
  _updates: PaintUpdate[],
) {
  // Single theme — no listener needed
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
    { layer: 'background', property: 'background-color', value: () => mapBgColor() },
    {
      layer: fillLayer,
      property: 'fill-color',
      value: () => continentFillExpression(),
    },
    {
      layer: lineLayer,
      property: 'line-color',
      value: () => [
        'case',
        ['boolean', ['feature-state', 'correct'], false], '#16a34a',
        ['boolean', ['feature-state', 'wrong'], false], '#dc2626',
        ['boolean', ['feature-state', 'target'], false], '#2563eb',
        ['boolean', ['feature-state', 'solved'], false], '#22c55e',
        ...(extraFillStates?.flatMap(([state, color]) => [
          ['boolean', ['feature-state', state], false], color,
        ]) ?? []),
        countryLineColor(),
      ],
    },
  ]
  if (circleLayer) {
    updates.push({ layer: circleLayer, property: 'circle-color', value: () => circleStrokeColor() })
  }
  if (ringLayer) {
    updates.push({ layer: ringLayer, property: 'circle-stroke-color', value: () => circleStrokeColor() })
  }
  return updates
}
