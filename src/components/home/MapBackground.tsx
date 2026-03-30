'use client'

import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { COUNTRIES_SOURCE, COUNTRIES_FILL_LAYER, COUNTRIES_LINE_LAYER, initialViewState } from '@/lib/mapConfig'
import { mapBgColor, CONTINENT_COLORS } from '@/lib/theme'
import type { StyleSpecification } from 'maplibre-gl'

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

        const style: StyleSpecification = {
          version: 8,
          name: 'WoC Comic',
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': mapBgColor() },
            },
          ],
        }

        const map = new maplibregl.Map({
          container: containerRef.current!,
          style,
          center: initialViewState.center,
          zoom: 1.5,
          attributionControl: false,
          interactive: false,
        })

        map.on('load', () => {
          try {
            map.addSource(COUNTRIES_SOURCE, {
              type: 'geojson',
              data: geojson,
              generateId: true,
            })

            // Continent-based coloring using REGION_UN property
            const continentMatch: (string | string[])[] = ['match', ['get', 'REGION_UN']]
            for (const [continent, color] of Object.entries(CONTINENT_COLORS)) {
              continentMatch.push(continent, color)
            }
            continentMatch.push('#FFE4B5') // fallback

            map.addLayer({
              id: COUNTRIES_FILL_LAYER,
              type: 'fill',
              source: COUNTRIES_SOURCE,
              paint: {
                'fill-color': continentMatch as unknown as string,
                'fill-opacity': 0.7,
              },
            })

            map.addLayer({
              id: COUNTRIES_LINE_LAYER,
              type: 'line',
              source: COUNTRIES_SOURCE,
              paint: {
                'line-color': '#2D2D2D',
                'line-width': 1.5,
                'line-opacity': 0.4,
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
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {/* Light gradient overlay to keep text readable on bright background */}
      <div className="absolute inset-0 bg-gradient-to-b from-geo-bg/40 via-transparent to-geo-bg/60" />
    </div>
  )
}
