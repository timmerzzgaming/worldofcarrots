'use client'

import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getMapStyle, COUNTRIES_SOURCE, COUNTRIES_FILL_LAYER, COUNTRIES_LINE_LAYER, initialViewState } from '@/lib/mapConfig'

export default function MapBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      try {
        const maplibregl = (await import('maplibre-gl')).default
        const res = await fetch('/data/countries.geojson')
        if (!res.ok) return
        const geojson: GeoJSON.FeatureCollection = await res.json()
        if (cancelled || !containerRef.current) return

        const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''
        const map = new maplibregl.Map({
          container: containerRef.current!,
          style: getMapStyle(apiKey),
          center: initialViewState.center,
          zoom: 1.5,
          attributionControl: false,
          interactive: false, // no pan/zoom — purely decorative
        })

        map.on('load', () => {
          try {
            for (const layer of map.getStyle().layers) {
              if (layer.type === 'symbol') {
                map.setLayoutProperty(layer.id, 'visibility', 'none')
              }
            }

            map.addSource(COUNTRIES_SOURCE, {
              type: 'geojson',
              data: geojson,
              generateId: true,
            })

            map.addLayer({
              id: COUNTRIES_FILL_LAYER,
              type: 'fill',
              source: COUNTRIES_SOURCE,
              paint: {
                'fill-color': '#60a5fa',
                'fill-opacity': 0.45,
              },
            })

            map.addLayer({
              id: COUNTRIES_LINE_LAYER,
              type: 'line',
              source: COUNTRIES_SOURCE,
              paint: {
                'line-color': '#6ee7b7',
                'line-width': 0.8,
                'line-opacity': 0.65,
              },
            })

            // Slow continuous drift
            let lng = initialViewState.center[0]
            const drift = () => {
              if (cancelled) return
              lng += 0.015
              map.setCenter([lng, initialViewState.center[1]])
              requestAnimationFrame(drift)
            }
            drift()
          } catch (err) {
            console.error('Map background layer error:', err)
          }
        })

        mapRef.current = map
      } catch (err) {
        console.error('Map background init error:', err)
      }
    }

    init()
    return () => {
      cancelled = true
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {/* Gradient overlay to keep text readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/30 to-slate-950/65" />
    </div>
  )
}
