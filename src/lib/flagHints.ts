// ISO A3 → ISO A2 mapping for flag file paths
// Most follow the standard pattern (first 2 letters), but many don't.
const ISO_A3_TO_A2: Record<string, string> = {
  AFG: 'af', ALB: 'al', DZA: 'dz', AND: 'ad', AGO: 'ao',
  ATG: 'ag', ARG: 'ar', ARM: 'am', AUS: 'au', AUT: 'at',
  AZE: 'az', BHS: 'bs', BHR: 'bh', BGD: 'bd', BRB: 'bb',
  BLR: 'by', BEL: 'be', BLZ: 'bz', BEN: 'bj', BTN: 'bt',
  BOL: 'bo', BIH: 'ba', BWA: 'bw', BRA: 'br', BRN: 'bn',
  BGR: 'bg', BFA: 'bf', BDI: 'bi', KHM: 'kh', CMR: 'cm',
  CAN: 'ca', CPV: 'cv', CAF: 'cf', TCD: 'td', CHL: 'cl',
  CHN: 'cn', COL: 'co', COM: 'km', COD: 'cd', COG: 'cg',
  CRI: 'cr', CIV: 'ci', HRV: 'hr', CUB: 'cu', CYP: 'cy',
  CZE: 'cz', DNK: 'dk', DJI: 'dj', DMA: 'dm', DOM: 'do',
  ECU: 'ec', EGY: 'eg', SLV: 'sv', GNQ: 'gq', ERI: 'er',
  EST: 'ee', SWZ: 'sz', ETH: 'et', FJI: 'fj', FIN: 'fi',
  GAB: 'ga', GMB: 'gm', GEO: 'ge', DEU: 'de', GHA: 'gh',
  GRC: 'gr', GRD: 'gd', GTM: 'gt', GIN: 'gn', GNB: 'gw',
  GUY: 'gy', HTI: 'ht', HND: 'hn', HUN: 'hu', ISL: 'is',
  IND: 'in', IDN: 'id', IRN: 'ir', IRQ: 'iq', IRL: 'ie',
  ISR: 'il', ITA: 'it', JAM: 'jm', JPN: 'jp', JOR: 'jo',
  KAZ: 'kz', KEN: 'ke', KIR: 'ki', KWT: 'kw', KGZ: 'kg',
  LAO: 'la', LVA: 'lv', LBN: 'lb', LSO: 'ls', LBR: 'lr',
  LBY: 'ly', LIE: 'li', LTU: 'lt', LUX: 'lu', MDG: 'mg',
  MWI: 'mw', MYS: 'my', MDV: 'mv', MLI: 'ml', MLT: 'mt',
  MHL: 'mh', MRT: 'mr', MUS: 'mu', MEX: 'mx', FSM: 'fm',
  MDA: 'md', MCO: 'mc', MNG: 'mn', MNE: 'me', MAR: 'ma',
  MOZ: 'mz', MMR: 'mm', NAM: 'na', NRU: 'nr', NPL: 'np',
  NLD: 'nl', NZL: 'nz', NIC: 'ni', NER: 'ne', NGA: 'ng',
  PRK: 'kp', MKD: 'mk', OMN: 'om', PAK: 'pk', PLW: 'pw',
  PSE: 'ps', PAN: 'pa', PNG: 'pg', PRY: 'py', PER: 'pe',
  PHL: 'ph', POL: 'pl', PRT: 'pt', QAT: 'qa', ROU: 'ro',
  RUS: 'ru', RWA: 'rw', KNA: 'kn', LCA: 'lc', VCT: 'vc',
  WSM: 'ws', SMR: 'sm', STP: 'st', SAU: 'sa', SEN: 'sn',
  SRB: 'rs', SYC: 'sc', SLE: 'sl', SGP: 'sg', SVK: 'sk',
  SVN: 'si', SLB: 'sb', SOM: 'so', ZAF: 'za', KOR: 'kr',
  SSD: 'ss', ESP: 'es', LKA: 'lk', SDN: 'sd', SUR: 'sr',
  SWE: 'se', CHE: 'ch', SYR: 'sy', TWN: 'tw', TJK: 'tj',
  TZA: 'tz', THA: 'th', TLS: 'tl', TGO: 'tg', TON: 'to',
  TTO: 'tt', TUN: 'tn', TUR: 'tr', TKM: 'tm', TUV: 'tv',
  UGA: 'ug', UKR: 'ua', ARE: 'ae', GBR: 'gb', USA: 'us',
  URY: 'uy', UZB: 'uz', VUT: 'vu', VAT: 'va', VEN: 've',
  VNM: 'vn', YEM: 'ye', ZMB: 'zm', ZWE: 'zw',
}

// Special cases: countries with ISO_A3 = -99
const SPECIAL_ISO: Record<string, string> = {
  France: 'fr',
  Norway: 'no',
  Kosovo: 'xk',
}

/** Get the 2-letter ISO code for a flag file, given a country name and ISO_A3 */
export function getFlagCode(name: string, isoA3: string): string | null {
  if (SPECIAL_ISO[name]) return SPECIAL_ISO[name]
  return ISO_A3_TO_A2[isoA3] ?? null
}

/** Get the flag image URL for a country */
export function getFlagUrl(name: string, isoA3: string, aspect: '4x3' | '1x1' = '4x3'): string | null {
  const code = getFlagCode(name, isoA3)
  if (!code) return null
  return `/flags/${aspect}/${code}.svg`
}

// Lookalike flag groups — countries whose flags are commonly confused.
// Each group is a set of country names that look similar.
const LOOKALIKE_GROUPS: string[][] = [
  // Tricolour vertical: green-white-red / similar
  ['Italy', 'Ireland', 'Côte d\'Ivoire', 'Mexico'],
  // Tricolour horizontal: red-white-blue
  ['Netherlands', 'Luxembourg', 'Paraguay', 'Croatia'],
  // Tricolour horizontal: blue-white-red
  ['France', 'Russia', 'Slovenia', 'Slovakia'],
  // Red-yellow-green horizontal (Pan-African)
  ['Guinea', 'Mali', 'Senegal', 'Cameroon', 'Ghana', 'Benin', 'Burkina Faso', 'Ethiopia', 'Bolivia', 'Lithuania'],
  // Red-white horizontal
  ['Indonesia', 'Monaco', 'Poland', 'Singapore'],
  // Blue-yellow
  ['Ukraine', 'Sweden'],
  // Red with star/crescent
  ['Turkey', 'Tunisia', 'Algeria'],
  // Green-white-orange
  ['India', 'Niger'],
  // Blue-red-white with cross
  ['Iceland', 'Norway', 'Denmark', 'Finland', 'Sweden'],
  // Stars on blue
  ['Australia', 'New Zealand'],
  // Union Jack heritage
  ['United Kingdom', 'Australia', 'New Zealand', 'Fiji', 'Tuvalu'],
  // Red-blue-white tricolor (vertical)
  ['Romania', 'Chad', 'Moldova'],
  // Red-green with crescent
  ['Pakistan', 'Mauritania', 'Maldives', 'Turkey', 'Azerbaijan', 'Turkmenistan', 'Comoros', 'Algeria'],
  // Black-red-gold/yellow horizontal
  ['Germany', 'Belgium'],
  // Red white blue horizontal stripe
  ['Thailand', 'Costa Rica', 'Cambodia', 'North Korea', 'Laos'],
  // Green with crescent/star
  ['Pakistan', 'Saudi Arabia', 'Mauritania'],
  // Red-yellow-green with star
  ['Ghana', 'Cameroon', 'Ethiopia', 'Senegal'],
  // Sun on flag
  ['Japan', 'Bangladesh', 'Palau', 'Kiribati'],
  // White-blue stripes
  ['Argentina', 'Uruguay', 'Greece', 'Israel', 'Honduras', 'Nicaragua', 'El Salvador', 'Guatemala'],
  // Eagle/bird on flag
  ['Mexico', 'Albania', 'Egypt', 'Zimbabwe', 'Zambia'],
  // Red-black-green
  ['Kenya', 'Malawi', 'Libya', 'Afghanistan'],
  // Blue field + cross
  ['Greece', 'Finland', 'Sweden', 'Iceland', 'Norway', 'Denmark'],
  // Orange-white-green
  ['India', 'Ireland', 'Côte d\'Ivoire', 'Niger'],
  // Yellow-blue
  ['Ukraine', 'Palau', 'Kazakhstan', 'Rwanda'],
  // Central American blue-white
  ['Honduras', 'Nicaragua', 'El Salvador', 'Guatemala', 'Argentina'],
  // Caribbean: similar layouts
  ['Bahamas', 'Saint Lucia', 'Antigua and Barbuda', 'Barbados', 'Jamaica', 'Trinidad and Tobago'],
  // Arab revolt colors (black-white-green-red)
  ['Jordan', 'Palestine', 'Sudan', 'Kuwait', 'United Arab Emirates', 'Syria', 'Iraq', 'Yemen'],
]

/** Given a country name, find all countries with lookalike flags (excluding itself) */
export function getLookalikes(countryName: string): string[] {
  const result = new Set<string>()
  for (const group of LOOKALIKE_GROUPS) {
    if (group.includes(countryName)) {
      group.forEach((c) => { if (c !== countryName) result.add(c) })
    }
  }
  return Array.from(result)
}

// Continent grouping: maps CONTINENT values from GeoJSON to simplified continent names
// The GeoJSON uses: Africa, Asia, Europe, North America, South America, Oceania, Seven seas (open ocean)
export const CONTINENT_DISPLAY: Record<string, string> = {
  Africa: 'Africa',
  Asia: 'Asia',
  Europe: 'Europe',
  'North America': 'North America',
  'South America': 'South America',
  Oceania: 'Oceania',
  'Seven seas (open ocean)': 'Oceania',
}

/** Get countries NOT on the given continent (for elimination) */
export function getCountriesNotOnContinent(
  allCountries: { name: string; continent: string }[],
  continent: string,
): string[] {
  // Map continent to display name for matching
  const display = CONTINENT_DISPLAY[continent] ?? continent
  return allCountries
    .filter((c) => {
      const cDisplay = CONTINENT_DISPLAY[c.continent] ?? c.continent
      return cDisplay !== display
    })
    .map((c) => c.name)
}

/** For hint 2: eliminate more countries — keep target, its lookalikes, and a handful
 *  of same-continent neighbours so the map still has some visible options.
 */
export function getHint2Eliminations(
  targetName: string,
  targetContinent: string,
  allCountries: { name: string; continent: string }[],
): string[] {
  const lookalikes = new Set(getLookalikes(targetName))
  const targetContinentDisplay = CONTINENT_DISPLAY[targetContinent] ?? targetContinent

  // Keep: the target, its lookalikes, and ~6 random same-continent countries
  const sameContinent = allCountries.filter((c) => {
    const cDisplay = CONTINENT_DISPLAY[c.continent] ?? c.continent
    return cDisplay === targetContinentDisplay && c.name !== targetName && !lookalikes.has(c.name)
  })

  const shuffled = [...sameContinent].sort(() => Math.random() - 0.5)
  const keepFromContinent = new Set(shuffled.slice(0, 6).map((c) => c.name))

  return allCountries
    .filter((c) =>
      c.name !== targetName &&
      !lookalikes.has(c.name) &&
      !keepFromContinent.has(c.name),
    )
    .map((c) => c.name)
}

/** For hint 3: leave only 3 options — the target and 2 decoys */
export function getHint3Eliminations(
  targetName: string,
  allCountries: { name: string; continent: string }[],
): string[] {
  // Pick 2 random decoys from all non-target countries
  const others = allCountries.filter((c) => c.name !== targetName)
  const decoys = [...others].sort(() => Math.random() - 0.5).slice(0, 2)
  const keepNames = new Set([targetName, ...decoys.map((c) => c.name)])

  return allCountries
    .filter((c) => !keepNames.has(c.name))
    .map((c) => c.name)
}
