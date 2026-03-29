/**
 * Sticker collection system.
 * Players earn country stickers from treasure chests.
 * Complete a continent to earn a big coin bonus.
 */

import { supabase } from '@/lib/supabase'
import { logCreditTransaction } from './credits-transaction'

export interface Sticker {
  id: string
  country_name: string
  continent: string
  source: string
  earned_at: string
}

/** All countries grouped by continent (matches GeoJSON ADMIN + CONTINENT) */
export const CONTINENT_COUNTRIES: Record<string, string[]> = {
  Africa: [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
    'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', "Côte d'Ivoire",
    'Democratic Republic of the Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea',
    'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
    'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi',
    'Mali', 'Mauritania', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
    'Republic of the Congo', 'Rwanda', 'Senegal', 'Sierra Leone', 'Somalia',
    'South Africa', 'South Sudan', 'Sudan', 'São Tomé and Príncipe', 'Tanzania',
    'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
  ],
  Asia: [
    'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei',
    'Cambodia', 'China', 'Cyprus', 'Georgia', 'India', 'Indonesia', 'Iran', 'Iraq',
    'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon',
    'Malaysia', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan',
    'Palestine', 'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea',
    'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand', 'Timor-Leste', 'Turkey',
    'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam', 'Yemen',
  ],
  Europe: [
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
    'Bulgaria', 'Croatia', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France',
    'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia',
    'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco',
    'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal',
    'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
    'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican City',
  ],
  'North America': [
    'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada', 'Costa Rica',
    'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador', 'Grenada', 'Guatemala',
    'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama',
    'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
    'Trinidad and Tobago', 'United States of America',
  ],
  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana',
    'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela',
  ],
  Oceania: [
    'Australia', 'Fiji', 'Kiribati', 'Maldives', 'Marshall Islands', 'Mauritius',
    'Micronesia', 'Nauru', 'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa',
    'Seychelles', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu',
  ],
}

/** All country names in a flat array */
export const ALL_COUNTRIES = Object.values(CONTINENT_COUNTRIES).flat()

/** Reverse lookup: country → continent */
export const COUNTRY_TO_CONTINENT: Record<string, string> = {}
for (const [continent, countries] of Object.entries(CONTINENT_COUNTRIES)) {
  for (const country of countries) {
    COUNTRY_TO_CONTINENT[country] = continent
  }
}

/** Coin bonus for completing an entire continent */
export const CONTINENT_BONUS: Record<string, number> = {
  Africa: 5000,
  Asia: 4000,
  Europe: 4000,
  'North America': 2500,
  'South America': 2000,
  Oceania: 2000,
}

/** Sticker tier by chest tier — how many stickers a chest awards */
export const STICKERS_PER_CHEST: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
}

/** Pick random uncollected countries for a user. Returns country names. */
export function pickRandomStickers(
  collectedSet: Set<string>,
  count: number,
): string[] {
  const uncollected = ALL_COUNTRIES.filter((c) => !collectedSet.has(c))
  if (uncollected.length === 0) return []

  // Shuffle and take `count`
  const shuffled = [...uncollected].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/** Fetch all stickers for a user */
export async function getCollection(userId: string): Promise<Sticker[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('sticker_collection')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: true })

  if (error || !data) return []
  return data as Sticker[]
}

/** Fetch just the collected country names as a Set */
export async function getCollectedSet(userId: string): Promise<Set<string>> {
  const stickers = await getCollection(userId)
  return new Set(stickers.map((s) => s.country_name))
}

/** Grant stickers to a user. Returns newly granted country names. */
export async function grantStickers(
  userId: string,
  countries: string[],
  source: string,
): Promise<string[]> {
  if (!supabase || countries.length === 0) return []

  const rows = countries.map((name) => ({
    user_id: userId,
    country_name: name,
    continent: COUNTRY_TO_CONTINENT[name] ?? 'Unknown',
    source,
  }))

  // Insert, ignoring duplicates (ON CONFLICT DO NOTHING via upsert)
  const { data, error } = await supabase
    .from('sticker_collection')
    .upsert(rows, { onConflict: 'user_id,country_name', ignoreDuplicates: true })
    .select('country_name')

  if (error) {
    console.error('Failed to grant stickers:', error)
    return []
  }

  return (data ?? []).map((r: { country_name: string }) => r.country_name)
}

/** Check if a continent is fully completed and claim the bonus if so. */
export async function checkAndClaimContinentBonus(
  userId: string,
  continent: string,
): Promise<number> {
  if (!supabase) return 0

  const required = CONTINENT_COUNTRIES[continent]
  if (!required) return 0

  // Count collected for this continent
  const { count, error: countErr } = await supabase
    .from('sticker_collection')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('continent', continent)

  if (countErr || !count || count < required.length) return 0

  // Try to claim — unique constraint prevents double-claim
  const bonus = CONTINENT_BONUS[continent] ?? 0
  if (bonus <= 0) return 0

  const { error: claimErr } = await supabase
    .from('continent_bonus_claimed')
    .insert({ user_id: userId, continent, bonus_coins: bonus })

  if (claimErr) {
    // Already claimed
    return 0
  }

  // Award the bonus coins
  await logCreditTransaction(userId, bonus, `continent_complete:${continent}`, { continent })
  return bonus
}

/** Get which continents have been fully claimed by this user */
export async function getClaimedContinents(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set()
  const { data, error } = await supabase
    .from('continent_bonus_claimed')
    .select('continent')
    .eq('user_id', userId)

  if (error || !data) return new Set()
  return new Set(data.map((r: { continent: string }) => r.continent))
}
