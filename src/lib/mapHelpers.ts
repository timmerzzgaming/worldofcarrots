/**
 * Shared map utilities used across game pages.
 * Eliminates duplication of SMALL_COUNTRIES, centroid, and feature-state helpers.
 */

// Countries that need circle markers (too small to click reliably)
export const SMALL_COUNTRIES = new Set([
  // Microstates
  'Vatican City', 'Monaco', 'San Marino', 'Liechtenstein', 'Andorra', 'Malta',
  'Singapore', 'Bahrain',
  // Small islands
  'Maldives', 'Seychelles', 'Mauritius', 'Comoros', 'Cape Verde',
  'São Tomé and Príncipe',
  'Kiribati', 'Tuvalu', 'Nauru', 'Palau', 'Marshall Islands',
  'Micronesia', 'Tonga', 'Samoa', 'Fiji', 'Vanuatu', 'Solomon Islands',
  // Caribbean
  'Barbados', 'Grenada', 'Saint Lucia', 'Dominica',
  'Saint Kitts and Nevis', 'Antigua and Barbuda',
  'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
  'Bahamas',
  // Other small
  'Eswatini', 'Lesotho',
])

// Countries that need a larger click target radius
export const LARGE_CIRCLE: Record<string, number> = { Kiribati: 40 }

// Manual centroid overrides for countries that span the antimeridian
const CENTROID_OVERRIDES: Record<string, [number, number]> = {
  Kiribati: [173.0, 1.4],  // Actual location in the Pacific, not averaged across antimeridian
}

// Default circle radius for small countries
export const DEFAULT_CIRCLE_RADIUS = 14

/** MapLibre expression that scales circle radius with zoom level. */
export function zoomScaledCircleRadius(): any { // eslint-disable-line
  return [
    'interpolate', ['linear'], ['zoom'],
    1, ['*', ['get', 'radius'], 0.5],
    3, ['get', 'radius'],
    6, ['*', ['get', 'radius'], 2],
    10, ['*', ['get', 'radius'], 4],
  ]
}

/** Compute the centroid of a GeoJSON geometry's coordinates. */
export function centroid(coords: unknown): [number, number] {
  let sumLng = 0, sumLat = 0, count = 0
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      sumLng += c[0] as number; sumLat += c[1] as number; count++
    } else if (Array.isArray(c)) c.forEach(walk)
  }
  walk(coords)
  return count > 0 ? [sumLng / count, sumLat / count] : [0, 0]
}

/** Build a GeoJSON FeatureCollection of point markers for small countries. */
export function buildSmallCountryPoints(
  features: GeoJSON.Feature[],
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features
      .filter(f => SMALL_COUNTRIES.has(f.properties?.ADMIN as string))
      .map((f, i) => ({
        type: 'Feature' as const,
        id: i,
        geometry: {
          type: 'Point' as const,
          coordinates: CENTROID_OVERRIDES[f.properties?.ADMIN as string]
            ?? centroid('coordinates' in f.geometry ? f.geometry.coordinates : []),
        },
        properties: {
          ADMIN: f.properties?.ADMIN,
          radius: LARGE_CIRCLE[f.properties?.ADMIN as string] ?? DEFAULT_CIRCLE_RADIUS,
        },
      })),
  }
}

/** Create a helper to set feature state on a map source. */
export function createFeatureStateSetter(
  mapRef: React.MutableRefObject<unknown>,
  sourceId: string,
) {
  return (id: number, state: Record<string, boolean | number>) => {
    const map = mapRef.current as {
      setFeatureState: (t: { source: string; id: number }, s: Record<string, boolean | number>) => void
    } | null
    map?.setFeatureState({ source: sourceId, id }, state)
  }
}

/** Fisher-Yates shuffle — produces an unbiased random permutation. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
