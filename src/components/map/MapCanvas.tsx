'use client'

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  getMapStyle,
  COUNTRIES_SOURCE,
  COUNTRIES_FILL_LAYER,
  COUNTRIES_LINE_LAYER,
  initialViewState,
} from '@/lib/mapConfig'
import countriesGeoJSON from '@/data/geojson/countries.geojson'

export interface MapCanvasHandle {
  flashCountry: (countryName: string, color: 'correct' | 'wrong' | 'target') => void
  clearHighlights: () => void
  getMap: () => maplibregl.Map | null
}

interface MapCanvasProps {
  onMapReady?: (map: maplibregl.Map) => void
}

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  ({ onMapReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const hoveredRef = useRef<string | null>(null)
    const flashedRef = useRef<Set<string>>(new Set())
    const onMapReadyRef = useRef(onMapReady)
    onMapReadyRef.current = onMapReady

    const clearHighlights = useCallback(() => {
      const map = mapRef.current
      if (!map || !map.getSource(COUNTRIES_SOURCE)) return
      flashedRef.current.forEach((name) => {
        map.setFeatureState(
          { source: COUNTRIES_SOURCE, id: name },
          { correct: false, wrong: false, target: false }
        )
      })
      flashedRef.current.clear()
    }, [])

    const flashCountry = useCallback(
      (countryName: string, color: 'correct' | 'wrong' | 'target') => {
        const map = mapRef.current
        if (!map || !map.getSource(COUNTRIES_SOURCE)) return
        map.setFeatureState(
          { source: COUNTRIES_SOURCE, id: countryName },
          { [color]: true }
        )
        flashedRef.current.add(countryName)
      },
      []
    )

    useImperativeHandle(ref, () => ({
      flashCountry,
      clearHighlights,
      getMap: () => mapRef.current,
    }))

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return

      const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: getMapStyle(apiKey),
        center: initialViewState.center,
        zoom: initialViewState.zoom,
        attributionControl: false,
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

      map.on('load', () => {
        // Hide all text/label layers from the base style
        for (const layer of map.getStyle().layers) {
          if (layer.type === 'symbol') {
            map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        }

        // Add countries source — promoteId uses ADMIN as the feature ID
        map.addSource(COUNTRIES_SOURCE, {
          type: 'geojson',
          data: countriesGeoJSON as GeoJSON.FeatureCollection,
          promoteId: 'ADMIN',
        })

        // Country fill layer
        map.addLayer({
          id: COUNTRIES_FILL_LAYER,
          type: 'fill',
          source: COUNTRIES_SOURCE,
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['feature-state', 'correct'], false], '#22c55e',
              ['boolean', ['feature-state', 'wrong'], false], '#ef4444',
              ['boolean', ['feature-state', 'target'], false], '#3b82f6',
              ['boolean', ['feature-state', 'hover'], false], '#475569',
              '#334155',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'correct'], false], 0.7,
              ['boolean', ['feature-state', 'wrong'], false], 0.7,
              ['boolean', ['feature-state', 'target'], false], 0.7,
              ['boolean', ['feature-state', 'hover'], false], 0.5,
              0.3,
            ],
          },
        })

        // Country border layer — thickens on hover, colored on flash
        map.addLayer({
          id: COUNTRIES_LINE_LAYER,
          type: 'line',
          source: COUNTRIES_SOURCE,
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'correct'], false], '#22c55e',
              ['boolean', ['feature-state', 'wrong'], false], '#ef4444',
              ['boolean', ['feature-state', 'target'], false], '#3b82f6',
              ['boolean', ['feature-state', 'hover'], false], '#e2e8f0',
              '#64748b',
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'correct'], false], 3,
              ['boolean', ['feature-state', 'wrong'], false], 3,
              ['boolean', ['feature-state', 'target'], false], 3,
              ['boolean', ['feature-state', 'hover'], false], 2.5,
              1.5,
            ],
          },
        })

        // Hover handling
        map.on('mousemove', COUNTRIES_FILL_LAYER, (e) => {
          if (!e.features || e.features.length === 0) return
          const name = e.features[0].properties?.ADMIN as string | undefined
          if (!name) return

          if (hoveredRef.current && hoveredRef.current !== name) {
            map.setFeatureState(
              { source: COUNTRIES_SOURCE, id: hoveredRef.current },
              { hover: false }
            )
          }

          hoveredRef.current = name
          map.setFeatureState(
            { source: COUNTRIES_SOURCE, id: name },
            { hover: true }
          )
          map.getCanvas().style.cursor = 'pointer'
        })

        map.on('mouseleave', COUNTRIES_FILL_LAYER, () => {
          if (hoveredRef.current) {
            map.setFeatureState(
              { source: COUNTRIES_SOURCE, id: hoveredRef.current },
              { hover: false }
            )
            hoveredRef.current = null
          }
          map.getCanvas().style.cursor = ''
        })

        // Notify parent that map + layers are ready
        onMapReadyRef.current?.(map)
      })

      mapRef.current = map

      return () => {
        map.remove()
        mapRef.current = null
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
      />
    )
  }
)

MapCanvas.displayName = 'MapCanvas'

export default MapCanvas
