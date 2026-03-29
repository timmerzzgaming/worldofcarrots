/**
 * Multi Mix question generator for multiplayer mode.
 *
 * Uses a seeded PRNG so all clients generate identical questions
 * from the same seed string.
 */

import { CAPITALS, type Capital } from '@/lib/capitals'
import { getFlagUrl } from '@/lib/flagHints'
import type { MultiQuestion, MultiQuestionType } from '@/lib/multiplayer'

// ─── Seeded PRNG (mulberry32) ───────────────────────────────

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates shuffle using seeded RNG */
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ─── Country data with ISO codes ────────────────────────────

/** Map from country ADMIN name → ISO_A3 code (populated from GeoJSON at runtime) */
let countryIsoMap: Map<string, string> | null = null

/** Set the country→ISO mapping. Call once after loading GeoJSON. */
export function setCountryIsoMap(map: Map<string, string>): void {
  countryIsoMap = map
}

/** Build the ISO map from a GeoJSON FeatureCollection */
export function buildCountryIsoMap(geojson: GeoJSON.FeatureCollection): Map<string, string> {
  const map = new Map<string, string>()
  for (const feature of geojson.features) {
    const name = feature.properties?.ADMIN as string | undefined
    const iso = feature.properties?.ISO_A3 as string | undefined
    if (name && iso) {
      map.set(name, iso)
    }
  }
  return map
}

// ─── Question generation ────────────────────────────────────

/** Countries that have both a capital and a flag available */
function getEligibleCountries(): { name: string; isoA3: string; capital: Capital }[] {
  const isoMap = countryIsoMap
  if (!isoMap) return []

  const capitalByCountry = new Map<string, Capital>()
  for (const cap of CAPITALS) {
    capitalByCountry.set(cap.country, cap)
  }

  const eligible: { name: string; isoA3: string; capital: Capital }[] = []
  isoMap.forEach((isoA3, name) => {
    const capital = capitalByCountry.get(name)
    if (!capital) return
    // Check flag exists
    const flagUrl = getFlagUrl(name, isoA3)
    if (!flagUrl) return
    eligible.push({ name, isoA3, capital })
  })

  return eligible
}

/** Time limits per question type (seconds) */
const TIME_LIMITS: Record<MultiQuestionType, number> = {
  flag: 15,
  country: 12,
  distance: 20,
}

/**
 * Generate deterministic questions for a multiplayer game.
 *
 * @param seed - Shared seed string (all clients must use the same seed)
 * @param durationMinutes - Lobby duration setting (3/5/10/15)
 * @returns Array of MultiQuestion in play order
 */
export function generateMultiMixQuestions(
  seed: string,
  durationMinutes: number,
): MultiQuestion[] {
  const rng = mulberry32(hashSeed(seed))
  const totalQuestions = Math.max(6, durationMinutes * 2)

  const eligible = getEligibleCountries()
  if (eligible.length === 0) return []

  // Shuffle countries
  const shuffled = seededShuffle(eligible, rng)

  // Determine question types: cycle through flag → country → distance
  const types: MultiQuestionType[] = ['flag', 'country', 'distance']
  const questions: MultiQuestion[] = []

  for (let i = 0; i < totalQuestions; i++) {
    const country = shuffled[i % shuffled.length]
    const type = types[i % 3]

    const base: MultiQuestion = {
      type,
      prompt: type === 'distance' ? country.capital.city : country.name,
      correctAnswer: country.name,
      timeLimit: TIME_LIMITS[type],
    }

    if (type === 'flag') {
      base.isoA3 = country.isoA3
    }

    if (type === 'distance') {
      base.capitalLat = country.capital.lat
      base.capitalLng = country.capital.lng
    }

    questions.push(base)
  }

  return questions
}

/** Generate a random seed string */
export function generateSeed(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// ─── Scoring ────────────────────────────────────────────────

/** Calculate points for a correct answer based on speed */
export function calculateMultiPoints(
  type: MultiQuestionType,
  timeRemainingMs: number,
  timeLimitMs: number,
  distanceScore?: number,
): number {
  if (type === 'distance' && distanceScore !== undefined) {
    // Distance: score 0-100, multiply by 10 for points (0-1000)
    return Math.round(distanceScore * 10)
  }

  // Country/Flag: base 1000 + speed bonus up to 1000
  const speedRatio = Math.max(0, Math.min(1, timeRemainingMs / timeLimitMs))
  return Math.round(1000 + 1000 * speedRatio)
}
