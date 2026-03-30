/**
 * Distance-based scoring utilities for geography games.
 *
 * Provides country area data, capital difficulty tiers, and functions
 * to normalize click-distance errors relative to country size.
 */

// ---------------------------------------------------------------------------
// Country areas (km²) — real-world approximate values for all 199 countries
// Keys are ADMIN names from the GeoJSON dataset.
// ---------------------------------------------------------------------------

export const COUNTRY_AREA: Record<string, number> = {
  'Afghanistan': 652230,
  'Albania': 28748,
  'Algeria': 2381741,
  'Andorra': 468,
  'Angola': 1246700,
  'Antigua and Barbuda': 442,
  'Argentina': 2780400,
  'Armenia': 29743,
  'Australia': 7692024,
  'Austria': 83871,
  'Azerbaijan': 86600,
  'Bahamas': 13943,
  'Bahrain': 765,
  'Bangladesh': 147570,
  'Barbados': 430,
  'Belarus': 207600,
  'Belgium': 30528,
  'Belize': 22966,
  'Benin': 112622,
  'Bhutan': 38394,
  'Bolivia': 1098581,
  'Bosnia and Herzegovina': 51197,
  'Botswana': 581730,
  'Brazil': 8515767,
  'Brunei': 5765,
  'Bulgaria': 110879,
  'Burkina Faso': 274200,
  'Burundi': 27834,
  'Cambodia': 181035,
  'Cameroon': 475442,
  'Canada': 9984670,
  'Cape Verde': 4033,
  'Central African Republic': 622984,
  'Chad': 1284000,
  'Chile': 756102,
  'China': 9596961,
  'Colombia': 1141748,
  'Comoros': 2235,
  'Costa Rica': 51100,
  'Côte d\'Ivoire': 322463,
  'Croatia': 56594,
  'Cuba': 109884,
  'Cyprus': 9251,
  'Czechia': 78867,
  'Democratic Republic of the Congo': 2344858,
  'Denmark': 43094,
  'Djibouti': 23200,
  'Dominica': 751,
  'Dominican Republic': 48671,
  'Ecuador': 276841,
  'Egypt': 1002450,
  'El Salvador': 21041,
  'Equatorial Guinea': 28051,
  'Eritrea': 117600,
  'Estonia': 45228,
  'Eswatini': 17364,
  'Ethiopia': 1104300,
  'Fiji': 18274,
  'Finland': 338424,
  'France': 640679,
  'Gabon': 267668,
  'Gambia': 11295,
  'Georgia': 69700,
  'Germany': 357022,
  'Ghana': 238533,
  'Greece': 131957,
  'Greenland': 2166086,
  'Grenada': 344,
  'Guatemala': 108889,
  'Guinea': 245857,
  'Guinea-Bissau': 36125,
  'Guyana': 214969,
  'Haiti': 27750,
  'Honduras': 112492,
  'Hungary': 93028,
  'Iceland': 103000,
  'India': 3287263,
  'Indonesia': 1904569,
  'Iran': 1648195,
  'Iraq': 438317,
  'Ireland': 70273,
  'Israel': 20770,
  'Italy': 301340,
  'Jamaica': 10991,
  'Japan': 377975,
  'Jordan': 89342,
  'Kazakhstan': 2724900,
  'Kenya': 580367,
  'Kiribati': 811,
  'Kosovo': 10887,
  'Kuwait': 17818,
  'Kyrgyzstan': 199951,
  'Laos': 236800,
  'Latvia': 64589,
  'Lebanon': 10452,
  'Lesotho': 30355,
  'Liberia': 111369,
  'Libya': 1759540,
  'Liechtenstein': 160,
  'Lithuania': 65300,
  'Luxembourg': 2586,
  'Madagascar': 587041,
  'Malawi': 118484,
  'Malaysia': 330803,
  'Maldives': 298,
  'Mali': 1240192,
  'Malta': 316,
  'Marshall Islands': 181,
  'Mauritania': 1030700,
  'Mauritius': 2040,
  'Mexico': 1964375,
  'Micronesia': 702,
  'Moldova': 33846,
  'Monaco': 2,
  'Mongolia': 1564116,
  'Montenegro': 13812,
  'Morocco': 446550,
  'Mozambique': 801590,
  'Myanmar': 676578,
  'Namibia': 825615,
  'Nauru': 21,
  'Nepal': 147181,
  'Netherlands': 41543,
  'New Zealand': 268021,
  'Nicaragua': 130373,
  'Niger': 1267000,
  'Nigeria': 923768,
  'North Korea': 120538,
  'North Macedonia': 25713,
  'Norway': 323802,
  'Oman': 309500,
  'Pakistan': 881913,
  'Palau': 459,
  'Palestine': 6020,
  'Panama': 75417,
  'Papua New Guinea': 462840,
  'Paraguay': 406752,
  'Peru': 1285216,
  'Philippines': 300000,
  'Poland': 312696,
  'Portugal': 92212,
  'Qatar': 11586,
  'Republic of the Congo': 342000,
  'Romania': 238397,
  'Russia': 17098242,
  'Rwanda': 26338,
  'Saint Kitts and Nevis': 261,
  'Saint Lucia': 616,
  'Saint Vincent and the Grenadines': 389,
  'Samoa': 2842,
  'San Marino': 61,
  'São Tomé and Príncipe': 964,
  'Saudi Arabia': 2149690,
  'Senegal': 196722,
  'Serbia': 77474,
  'Seychelles': 459,
  'Sierra Leone': 71740,
  'Singapore': 728,
  'Slovakia': 49035,
  'Slovenia': 20273,
  'Solomon Islands': 28896,
  'Somalia': 637657,
  'South Africa': 1219090,
  'South Korea': 100210,
  'South Sudan': 644329,
  'Spain': 505992,
  'Sri Lanka': 65610,
  'Sudan': 1861484,
  'Suriname': 163820,
  'Sweden': 450295,
  'Switzerland': 41284,
  'Syria': 185180,
  'Taiwan': 36193,
  'Tajikistan': 143100,
  'Tanzania': 945087,
  'Thailand': 513120,
  'Timor-Leste': 14874,
  'Togo': 56785,
  'Tonga': 747,
  'Trinidad and Tobago': 5130,
  'Tunisia': 163610,
  'Turkey': 783562,
  'Turkmenistan': 488100,
  'Tuvalu': 26,
  'Uganda': 241038,
  'Ukraine': 603500,
  'United Arab Emirates': 83600,
  'United Kingdom': 243610,
  'United States of America': 9833520,
  'Uruguay': 176215,
  'Uzbekistan': 447400,
  'Vanuatu': 12189,
  'Vatican City': 0.44,
  'Venezuela': 916445,
  'Vietnam': 331212,
  'Western Sahara': 266000,
  'Yemen': 527968,
  'Zambia': 752618,
  'Zimbabwe': 390757,
};

// ---------------------------------------------------------------------------
// Capital difficulty tiers
// 1 = Easy (~50), 2 = Medium (~55), 3 = Hard (~50), 4 = Expert (~42)
// ---------------------------------------------------------------------------

export const CAPITAL_TIER: Record<string, 1 | 2 | 3 | 4> = {
  // Tier 1 — Easy (~50 countries): major / well-known
  'Argentina': 1,
  'Australia': 1,
  'Austria': 1,
  'Brazil': 1,
  'Canada': 1,
  'Chile': 1,
  'China': 1,
  'Cuba': 1,
  'Czechia': 1,
  'Denmark': 1,
  'Egypt': 1,
  'Finland': 1,
  'France': 1,
  'Germany': 1,
  'Greece': 1,
  'Hungary': 1,
  'Iceland': 1,
  'India': 1,
  'Ireland': 1,
  'Israel': 1,
  'Italy': 1,
  'Jamaica': 1,
  'Japan': 1,
  'Mexico': 1,
  'New Zealand': 1,
  'Nigeria': 1,
  'North Korea': 1,
  'Norway': 1,
  'Pakistan': 1,
  'Peru': 1,
  'Poland': 1,
  'Portugal': 1,
  'Russia': 1,
  'Saudi Arabia': 1,
  'South Africa': 1,
  'South Korea': 1,
  'Spain': 1,
  'Sweden': 1,
  'Switzerland': 1,
  'Thailand': 1,
  'Turkey': 1,
  'Ukraine': 1,
  'United Arab Emirates': 1,
  'United Kingdom': 1,
  'United States of America': 1,
  'Venezuela': 1,
  'Vietnam': 1,

  // Tier 2 — Medium (~55 countries): reasonably known
  'Afghanistan': 2,
  'Algeria': 2,
  'Angola': 2,
  'Bangladesh': 2,
  'Belgium': 2,
  'Bolivia': 2,
  'Bulgaria': 2,
  'Cambodia': 2,
  'Cameroon': 2,
  'Colombia': 2,
  'Costa Rica': 2,
  'Croatia': 2,
  'Democratic Republic of the Congo': 2,
  'Dominican Republic': 2,
  'Ecuador': 2,
  'El Salvador': 2,
  'Estonia': 2,
  'Ethiopia': 2,
  'Ghana': 2,
  'Greenland': 2,
  'Guatemala': 2,
  'Haiti': 2,
  'Honduras': 2,
  'Indonesia': 2,
  'Iran': 2,
  'Iraq': 2,
  'Jordan': 2,
  'Kazakhstan': 2,
  'Kenya': 2,
  'Latvia': 2,
  'Lebanon': 2,
  'Libya': 2,
  'Lithuania': 2,
  'Malaysia': 2,
  'Mongolia': 2,
  'Morocco': 2,
  'Mozambique': 2,
  'Myanmar': 2,
  'Nepal': 2,
  'Netherlands': 2,
  'Nicaragua': 2,
  'Oman': 2,
  'Panama': 2,
  'Paraguay': 2,
  'Philippines': 2,
  'Romania': 2,
  'Senegal': 2,
  'Serbia': 2,
  'Singapore': 2,
  'Slovakia': 2,
  'Slovenia': 2,
  'Somalia': 2,
  'Sri Lanka': 2,
  'Sudan': 2,
  'Syria': 2,
  'Tanzania': 2,
  'Trinidad and Tobago': 2,
  'Tunisia': 2,
  'Uruguay': 2,
  'Uzbekistan': 2,

  // Tier 3 — Hard (~50 countries): less known, trickier capitals
  'Albania': 3,
  'Armenia': 3,
  'Azerbaijan': 3,
  'Bahamas': 3,
  'Belarus': 3,
  'Belize': 3,
  'Benin': 3,
  'Bhutan': 3,
  'Bosnia and Herzegovina': 3,
  'Botswana': 3,
  'Brunei': 3,
  'Burkina Faso': 3,
  'Burundi': 3,
  'Central African Republic': 3,
  'Chad': 3,
  'Côte d\'Ivoire': 3,
  'Cyprus': 3,
  'Eritrea': 3,
  'Fiji': 3,
  'Gabon': 3,
  'Gambia': 3,
  'Georgia': 3,
  'Guinea': 3,
  'Guyana': 3,
  'Kosovo': 3,
  'Kuwait': 3,
  'Kyrgyzstan': 3,
  'Laos': 3,
  'Lesotho': 3,
  'Liberia': 3,
  'Madagascar': 3,
  'Malawi': 3,
  'Mali': 3,
  'Mauritania': 3,
  'Moldova': 3,
  'Montenegro': 3,
  'Namibia': 3,
  'Niger': 3,
  'North Macedonia': 3,
  'Papua New Guinea': 3,
  'Qatar': 3,
  'Republic of the Congo': 3,
  'Rwanda': 3,
  'Sierra Leone': 3,
  'South Sudan': 3,
  'Suriname': 3,
  'Tajikistan': 3,
  'Togo': 3,
  'Turkmenistan': 3,
  'Uganda': 3,
  'Yemen': 3,
  'Zambia': 3,
  'Zimbabwe': 3,

  // Tier 4 — Expert (~42 countries): microstates, tiny islands, very obscure
  'Andorra': 4,
  'Antigua and Barbuda': 4,
  'Bahrain': 4,
  'Barbados': 4,
  'Cape Verde': 4,
  'Comoros': 4,
  'Djibouti': 4,
  'Dominica': 4,
  'Equatorial Guinea': 4,
  'Eswatini': 4,
  'Grenada': 4,
  'Guinea-Bissau': 4,
  'Kiribati': 4,
  'Liechtenstein': 4,
  'Luxembourg': 4,
  'Maldives': 4,
  'Malta': 4,
  'Marshall Islands': 4,
  'Mauritius': 4,
  'Micronesia': 4,
  'Monaco': 4,
  'Nauru': 4,
  'Palau': 4,
  'Palestine': 4,
  'Saint Kitts and Nevis': 4,
  'Saint Lucia': 4,
  'Saint Vincent and the Grenadines': 4,
  'Samoa': 4,
  'San Marino': 4,
  'São Tomé and Príncipe': 4,
  'Seychelles': 4,
  'Solomon Islands': 4,
  'Taiwan': 4,
  'Timor-Leste': 4,
  'Tonga': 4,
  'Tuvalu': 4,
  'Vanuatu': 4,
  'Vatican City': 4,
  'Western Sahara': 4,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DistanceDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Reference radius — median country size (~250 km) */
export const REFERENCE_RADIUS = 250;

/** Minimum effective radius to prevent extreme multipliers for microstates */
const MIN_RADIUS_KM = 5;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Get the equivalent radius of a country in km.
 * Treats the country as a circle with the same area: r = sqrt(area / pi).
 * Returns `REFERENCE_RADIUS` if the country is not found.
 */
export function getCountryRadius(country: string): number {
  const areaKm2 = COUNTRY_AREA[country];
  if (areaKm2 === undefined) {
    return REFERENCE_RADIUS;
  }
  return Math.max(Math.sqrt(areaKm2 / Math.PI), MIN_RADIUS_KM);
}

/**
 * Normalize a raw distance based on country size.
 *
 * Small countries amplify the error (their radius is small relative to
 * the reference), while large countries reduce it.
 *
 * Formula: `rawKm * (REFERENCE_RADIUS / clampedRadius)`
 *
 * The radius is clamped to a minimum of 5 km to avoid extreme multipliers
 * for microstates like Vatican City or Monaco.
 */
export function normalizeDistance(rawKm: number, country: string): number {
  const radius = getCountryRadius(country);
  return rawKm * (REFERENCE_RADIUS / radius);
}

/**
 * Get the difficulty tier of a capital (1-4).
 * Returns 4 (expert) if the country is not found.
 */
export function getCapitalTier(country: string): 1 | 2 | 3 | 4 {
  return CAPITAL_TIER[country] ?? 4;
}

/**
 * Filter country names by capital difficulty.
 *
 * - easy:   tier 1 only
 * - medium: tiers 1-2
 * - hard:   tiers 1-3
 * - expert: all tiers (1-4)
 */
export function filterCapitalsByDifficulty(difficulty: DistanceDifficulty): string[] {
  const maxTier: number = {
    easy: 1,
    medium: 2,
    hard: 3,
    expert: 4,
  }[difficulty];

  return Object.entries(CAPITAL_TIER)
    .filter(([, tier]) => tier <= maxTier)
    .map(([name]) => name);
}

/**
 * Convert a normalized distance into a 0-100 score.
 * < 10 km (normalized) = perfect 100.
 * Then exponential decay from 100 down to 0.
 * ~150 km = 75, ~500 km = 37, ~1500 km = 5, 3000+ km = ~0
 */
export function distanceToScore(normalizedKm: number): number {
  if (normalizedKm <= 10) return 100
  const raw = 100 * Math.exp(-(normalizedKm - 10) / 500)
  return Math.round(Math.max(0, Math.min(100, raw)))
}
