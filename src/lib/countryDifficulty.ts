// 4 tiers based on how recognizable a country is on a world map.
// Tier 1 (Easy):      Large, iconic — 500 pts
// Tier 2 (Medium):    Well-known but smaller — 750 pts
// Tier 3 (Hard):      Requires decent knowledge — 1250 pts
// Tier 4 (Very Hard): Tiny, obscure, or easily confused — 2000 pts

export type CountryTier = 1 | 2 | 3 | 4

export const TIER_POINTS: Record<CountryTier, number> = {
  1: 500,
  2: 750,
  3: 1250,
  4: 2000,
}

export const TIER_LABELS: Record<CountryTier, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
  4: 'Very Hard',
}

// --- Tier 1: Easy (~47) ---
const TIER_1 = new Set([
  'United States of America', 'Canada', 'Mexico', 'Brazil', 'Argentina',
  'Russia', 'China', 'India', 'Australia', 'Japan',
  'United Kingdom', 'France', 'Germany', 'Italy', 'Spain',
  'Egypt', 'South Africa', 'Nigeria', 'Turkey', 'Saudi Arabia',
  'Indonesia', 'Greenland', 'Iceland', 'Norway', 'Sweden',
  'Finland', 'Denmark', 'Poland', 'Ukraine', 'Greece',
  'Iran', 'Iraq', 'Pakistan', 'Thailand', 'South Korea',
  'Colombia', 'Peru', 'Chile', 'Venezuela', 'Cuba',
  'Algeria', 'Libya', 'Morocco', 'Kenya', 'Ethiopia',
  'New Zealand', 'Mongolia',
])

// --- Tier 2: Medium (~60) ---
const TIER_2 = new Set([
  'Portugal', 'Netherlands', 'Ireland', 'Belgium', 'Switzerland',
  'Austria', 'Czechia', 'Romania', 'Hungary', 'Bulgaria',
  'Croatia', 'Serbia', 'Slovakia', 'Vietnam',
  'Philippines', 'Malaysia', 'Myanmar', 'Cambodia', 'Nepal',
  'Bangladesh', 'Sri Lanka', 'Afghanistan', 'Kazakhstan', 'Uzbekistan',
  'North Korea', 'Taiwan',
  'United Arab Emirates', 'Israel', 'Jordan', 'Lebanon', 'Syria',
  'Qatar', 'Kuwait', 'Oman', 'Yemen',
  'Bolivia', 'Ecuador', 'Paraguay', 'Uruguay', 'Guyana',
  'Panama', 'Costa Rica', 'Guatemala', 'Honduras', 'Nicaragua',
  'Dominican Republic', 'Haiti', 'Jamaica',
  'Democratic Republic of the Congo', 'Republic of the Congo',
  'Ghana', 'Cameroon', "C\u00f4te d'Ivoire", 'Senegal', 'Mali',
  'Sudan', 'South Sudan', 'Somalia', 'Madagascar', 'Mozambique',
  'Zimbabwe', 'Zambia', 'Angola', 'Tunisia',
  'Tanzania', 'Uganda',
  'Papua New Guinea',
])

// --- Tier 3: Hard (~55) ---
const TIER_3 = new Set([
  'Lithuania', 'Latvia', 'Estonia', 'Slovenia', 'Bosnia and Herzegovina',
  'North Macedonia', 'Montenegro', 'Albania', 'Moldova', 'Belarus',
  'Georgia', 'Armenia', 'Azerbaijan', 'Kyrgyzstan', 'Tajikistan',
  'Turkmenistan', 'Laos',
  'El Salvador', 'Belize', 'Trinidad and Tobago',
  'Suriname', 'Palestine', 'Bahrain',
  'Niger', 'Chad', 'Burkina Faso', 'Mauritania', 'Benin', 'Togo',
  'Sierra Leone', 'Liberia', 'Guinea', 'Gambia', 'Guinea-Bissau',
  'Central African Republic', 'Gabon', 'Eritrea', 'Rwanda', 'Burundi',
  'Malawi', 'Namibia', 'Botswana', 'Lesotho', 'Eswatini',
  'Fiji', 'Bahamas',
  'Luxembourg', 'Cyprus', 'Malta', 'Singapore',
  'Barbados', 'Mauritius',
])

// --- Tier 4: Very Hard (~35) ---
const TIER_4 = new Set([
  'Kosovo', 'Andorra', 'Liechtenstein', 'Monaco', 'San Marino', 'Vatican City',
  'Timor-Leste', 'Brunei', 'Bhutan', 'Maldives',
  'Equatorial Guinea', 'Djibouti', 'Cape Verde', 'Comoros',
  "S\u00e3o Tom\u00e9 and Pr\u00edncipe", 'Seychelles',
  'Solomon Islands', 'Vanuatu', 'Samoa', 'Tonga', 'Kiribati',
  'Micronesia', 'Marshall Islands', 'Palau', 'Nauru', 'Tuvalu',
  'Antigua and Barbuda', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Grenada', 'Dominica',
])

const TIER_MAP = new Map<string, CountryTier>()
TIER_1.forEach((n) => TIER_MAP.set(n, 1))
TIER_2.forEach((n) => TIER_MAP.set(n, 2))
TIER_3.forEach((n) => TIER_MAP.set(n, 3))
TIER_4.forEach((n) => TIER_MAP.set(n, 4))

/** Get the difficulty tier of a country (defaults to 3 if not categorized) */
export function getCountryTier(name: string): CountryTier {
  return TIER_MAP.get(name) ?? 3
}

/** Get points awarded for correctly identifying a country */
export function getCountryPoints(name: string): number {
  return TIER_POINTS[getCountryTier(name)]
}

// --- Difficulty filter (used for game difficulty setting) ---

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export const DIFFICULTIES: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: '~47 well-known countries' },
  { value: 'medium', label: 'Medium', description: '~107 countries' },
  { value: 'hard', label: 'Hard', description: '~162 countries' },
  { value: 'expert', label: 'Expert', description: 'All 197 countries' },
]

export function filterByDifficulty(countryNames: string[], difficulty: Difficulty): string[] {
  switch (difficulty) {
    case 'easy':
      return countryNames.filter((n) => getCountryTier(n) === 1)
    case 'medium':
      return countryNames.filter((n) => getCountryTier(n) <= 2)
    case 'hard':
      return countryNames.filter((n) => getCountryTier(n) <= 3)
    case 'expert':
      return countryNames
  }
}

/** Precomputed country counts per region × difficulty (based on Natural Earth 50m data). */
export const COUNTRY_COUNTS: Record<string, Record<Difficulty, number>> = {
  World:    { easy: 46, medium: 125, hard: 152, expert: 197 },
  Africa:   { easy: 7,  medium: 19,  hard: 43,  expert: 54 },
  Americas: { easy: 9,  medium: 26,  hard: 26,  expert: 35 },
  Asia:     { easy: 13, medium: 41,  hard: 43,  expert: 49 },
  Europe:   { easy: 14, medium: 35,  hard: 36,  expert: 45 },
  Oceania:  { easy: 3,  medium: 4,   hard: 4,   expert: 14 },
}
