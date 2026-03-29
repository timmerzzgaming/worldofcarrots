import type { StyleSpecification } from 'maplibre-gl'

export function getMapStyle(apiKey: string): string | StyleSpecification {
  if (apiKey && apiKey !== 'your_maptiler_api_key') {
    return `https://api.maptiler.com/maps/dataviz/style.json?key=${apiKey}`
  }
  // Comic style — bright sky blue ocean
  return {
    version: 8,
    name: 'WoC Comic',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#87CEEB' },
      },
    ],
  }
}

export function getWhiteMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'WoC Comic',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#87CEEB' },
      },
    ],
  }
}

export const COUNTRIES_SOURCE = 'countries'
export const COUNTRIES_FILL_LAYER = 'countries-fill'
export const COUNTRIES_LINE_LAYER = 'countries-line'
export const SMALL_COUNTRIES_SOURCE = 'small-countries'
export const SMALL_COUNTRIES_CIRCLE_LAYER = 'small-countries-circle'
export const SMALL_COUNTRIES_RING_LAYER = 'small-countries-ring'

export const initialViewState = {
  center: [10, 30] as [number, number],
  zoom: 1.8,
}

/** Increased deceleration for smoother map stopping (50% more friction). */
export const MAP_DECELERATION = 0.003

export const REGION_VIEWS: Record<string, { center: [number, number]; zoom: number }> = {
  World:    { center: [10, 30],   zoom: 1.8 },
  Africa:   { center: [20, 5],    zoom: 2.8 },
  Americas: { center: [-80, 10],  zoom: 2.2 },
  Asia:     { center: [85, 35],   zoom: 2.5 },
  Europe:   { center: [15, 52],   zoom: 3.5 },
  Oceania:  { center: [150, -15], zoom: 3.2 },
}
