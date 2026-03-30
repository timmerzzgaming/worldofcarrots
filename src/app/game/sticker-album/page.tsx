'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth/context'
import { useTranslation } from '@/lib/i18n'
import { useBasePath } from '@/lib/basePath'
import { playClick, playHighScore } from '@/lib/sounds'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  getCollection,
  getClaimedContinents,
  CONTINENT_COUNTRIES,
  CONTINENT_BONUS,
  COUNTRY_TO_CONTINENT,
  type Sticker,
} from '@/lib/stickers'

type ViewMode = 'map' | 'list'

const CONTINENT_COLORS: Record<string, string> = {
  Africa: '#FFD93D',
  Asia: '#FF6B6B',
  Europe: '#A855F7',
  'North America': '#4ECDC4',
  'South America': '#4ECDC4',
  Oceania: '#4ADE80',
}

const CONTINENT_ORDER = ['Europe', 'Africa', 'Asia', 'North America', 'South America', 'Oceania']

export default function StickerAlbumPage() {
  const { t } = useTranslation()
  const { tc } = useTranslation()
  const router = useRouter()
  const { prefixPath } = useBasePath()
  const { user, isGuest } = useAuth()

  const [stickers, setStickers] = useState<Sticker[]>([])
  const [collectedSet, setCollectedSet] = useState<Set<string>>(new Set())
  const [claimedContinents, setClaimedContinents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null)
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)

  // Resize map when switching back to map view (MapLibre needs this after being hidden)
  useEffect(() => {
    if (viewMode === 'map' && mapRef.current) {
      mapRef.current.resize()
    }
  }, [viewMode])

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapLoaded = useRef(false)

  useEffect(() => {
    if (!user || isGuest) {
      setLoading(false)
      return
    }

    async function load() {
      const [stickerData, claimed] = await Promise.all([
        getCollection(user!.id),
        getClaimedContinents(user!.id),
      ])
      setStickers(stickerData)
      setCollectedSet(new Set(stickerData.map((s) => s.country_name)))
      setClaimedContinents(claimed)
      setLoading(false)
    }

    load()
  }, [user, isGuest])

  // Initialize MapLibre map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let cancelled = false

    async function initMap() {
      const maplibregl = (await import('maplibre-gl')).default
      if (cancelled || !mapContainerRef.current) return

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#B8D4E3' },
            },
          ],
        },
        center: [15, 20],
        zoom: 1.3,
        minZoom: 1,
        maxZoom: 6,
        attributionControl: false,
      })

      map.on('load', () => {
        if (cancelled) return
        mapLoaded.current = true

        // Add country data source
        map.addSource('countries', {
          type: 'geojson',
          data: '/data/countries.geojson',
          promoteId: 'ADMIN',
        })

        // Default country fill — light gray for uncollected
        map.addLayer({
          id: 'countries-fill',
          type: 'fill',
          source: 'countries',
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['feature-state', 'collected'], false],
              ['string', ['feature-state', 'color'], '#4ADE80'],
              '#E5E7EB',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'collected'], false],
              0.8,
              0.5,
            ],
          },
        })

        // Country borders
        map.addLayer({
          id: 'countries-line',
          type: 'line',
          source: 'countries',
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 0.8,
          },
        })

        // Collected country borders — thicker, colored
        map.addLayer({
          id: 'countries-line-collected',
          type: 'line',
          source: 'countries',
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'collected'], false],
              '#2D2D2D',
              'transparent',
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'collected'], false],
              1.5,
              0,
            ],
          },
        })

        mapRef.current = map
      })

      // Hover tooltip
      map.on('mousemove', 'countries-fill', (e) => {
        if (e.features && e.features[0]) {
          const name = e.features[0].properties.ADMIN
          setHoveredCountry(name)
          map.getCanvas().style.cursor = 'pointer'
        }
      })

      map.on('mouseleave', 'countries-fill', () => {
        setHoveredCountry(null)
        map.getCanvas().style.cursor = ''
      })
    }

    initMap()
    return () => { cancelled = true }
  }, [])

  // Update map feature states when collection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded.current) return

    // Wait for source to be loaded
    const source = map.getSource('countries')
    if (!source) return

    function applyStates() {
      collectedSet.forEach((countryName) => {
        const continent = COUNTRY_TO_CONTINENT[countryName]
        const color = CONTINENT_COLORS[continent] ?? '#4ADE80'
        map!.setFeatureState(
          { source: 'countries', id: countryName },
          { collected: true, color },
        )
      })
    }

    if (map.isSourceLoaded('countries')) {
      applyStates()
    } else {
      map.on('sourcedata', function onSource(e) {
        if (e.sourceId === 'countries' && map!.isSourceLoaded('countries')) {
          applyStates()
          map!.off('sourcedata', onSource)
        }
      })
    }
  }, [collectedSet])

  const totalCountries = Object.values(CONTINENT_COUNTRIES).flat().length
  const totalCollected = collectedSet.size
  const progressPct = totalCountries > 0 ? Math.round((totalCollected / totalCountries) * 100) : 0

  const handleBack = useCallback(() => {
    playClick()
    router.push(prefixPath('/'))
  }, [router, prefixPath])

  return (
    <main className="relative min-h-screen flex flex-col items-center px-3 sm:px-4 pt-6 sm:pt-8 pb-12">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed top-10 left-2 sm:top-4 sm:left-4 z-[60]"
      >
        <button
          onClick={handleBack}
          className="btn-ghost px-4 py-3 sm:px-4 sm:py-2 text-sm flex items-center gap-2"
          aria-label={t('back')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {t('back')}
        </button>
      </motion.div>

      {/* Title + progress */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 sm:mb-6 z-10"
      >
        <h1 className="text-3xl sm:text-5xl font-headline font-bold text-geo-on-surface uppercase tracking-tight">
          {t('stickerAlbum.title')}
        </h1>
        <p className="text-geo-on-surface-dim text-sm sm:text-base font-body mt-1">
          {t('stickerAlbum.subtitle')}
        </p>
      </motion.div>

      {/* Overall progress bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel px-5 py-3 mb-4 w-full max-w-xl z-10"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-headline font-bold text-sm text-geo-on-surface">
            🗺️ {totalCollected} / {totalCountries}
          </span>
          <span className="font-headline font-extrabold text-sm text-geo-primary">
            {progressPct}%
          </span>
        </div>
        <div className="h-3 bg-geo-outline-dim/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-geo-primary to-geo-tertiary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* View toggle */}
      <div className="flex gap-2 mb-4 z-10">
        <button
          onClick={() => { playClick(); setViewMode('map') }}
          className={`px-4 py-1.5 rounded-full text-sm font-headline font-bold transition-all ${
            viewMode === 'map'
              ? 'bg-geo-primary text-white shadow-comic-sm'
              : 'bg-white text-geo-on-surface border-2 border-geo-outline-dim'
          }`}
        >
          🗺️ {t('stickerAlbum.mapView')}
        </button>
        <button
          onClick={() => { playClick(); setViewMode('list') }}
          className={`px-4 py-1.5 rounded-full text-sm font-headline font-bold transition-all ${
            viewMode === 'list'
              ? 'bg-geo-primary text-white shadow-comic-sm'
              : 'bg-white text-geo-on-surface border-2 border-geo-outline-dim'
          }`}
        >
          📋 {t('stickerAlbum.listView')}
        </button>
      </div>

      {/* Hovered country tooltip */}
      <AnimatePresence>
        {hoveredCountry && viewMode === 'map' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2"
          >
            <span className="font-headline font-bold text-sm">
              {collectedSet.has(hoveredCountry) ? '⭐' : '❓'} {tc(hoveredCountry)}
            </span>
            <span className="text-geo-on-surface-dim text-xs ml-2">
              {COUNTRY_TO_CONTINENT[hoveredCountry]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map view — always mounted to preserve MapLibre instance, hidden via CSS */}
      <div className={`w-full max-w-4xl z-10 ${viewMode === 'map' ? '' : 'hidden'}`}>
        <div
          ref={mapContainerRef}
          className="w-full aspect-[2/1] sm:aspect-[2.5/1] rounded-2xl overflow-hidden border-[3px] border-geo-on-surface"
          style={{ boxShadow: '4px 4px 0 #2D2D2D' }}
        />
      </div>

      {/* List view — continents */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-xl z-10 space-y-3"
        >
          {CONTINENT_ORDER.map((continent) => {
            const countries = CONTINENT_COUNTRIES[continent]
            const collected = countries.filter((c) => collectedSet.has(c))
            const pct = Math.round((collected.length / countries.length) * 100)
            const isComplete = collected.length === countries.length
            const isClaimed = claimedContinents.has(continent)
            const isExpanded = selectedContinent === continent
            const color = CONTINENT_COLORS[continent]

            return (
              <motion.div
                key={continent}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel overflow-hidden"
              >
                <button
                  onClick={() => {
                    playClick()
                    setSelectedContinent(isExpanded ? null : continent)
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-geo-surface-high/50 transition-colors text-left"
                  aria-expanded={isExpanded}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline font-extrabold text-sm sm:text-base text-geo-on-surface uppercase tracking-wide">
                        {continent}
                      </h3>
                      <span className="font-headline font-bold text-xs text-geo-on-surface-dim">
                        {collected.length}/{countries.length}
                      </span>
                    </div>
                    <div className="h-2 bg-geo-outline-dim/20 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                  {isComplete && (
                    <span className="text-lg">{isClaimed ? '🏆' : '✅'}</span>
                  )}
                  {isComplete && !isClaimed && (
                    <span className="text-xs font-headline font-bold text-geo-tertiary">
                      +{CONTINENT_BONUS[continent]}💰
                    </span>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {countries.sort().map((country) => {
                          const has = collectedSet.has(country)
                          return (
                            <div
                              key={country}
                              className={`px-2 py-1.5 rounded-lg text-xs font-body flex items-center gap-1.5 ${
                                has
                                  ? 'bg-geo-surface-high border border-geo-outline'
                                  : 'bg-geo-outline-dim/10 text-geo-on-surface-dim'
                              }`}
                            >
                              <span className="text-sm">{has ? '⭐' : '❓'}</span>
                              <span className={has ? 'font-bold text-geo-on-surface' : ''}>
                                {tc(country)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Guest prompt */}
      {isGuest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel px-5 py-3 mt-6 text-center z-10 max-w-md"
        >
          <p className="font-headline font-bold text-sm text-geo-secondary uppercase">
            🔒 {t('stickerAlbum.loginRequired')}
          </p>
        </motion.div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-3 border-geo-primary border-t-transparent rounded-full"
          />
        </div>
      )}
    </main>
  )
}
