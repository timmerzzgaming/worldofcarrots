/**
 * US States data: all 50 states with metadata for game modes.
 */

export interface USState {
  name: string
  abbrev: string
  capital: string
  region: USRegion
}

export type USRegion = 'Northeast' | 'Southeast' | 'Midwest' | 'Southwest' | 'West'

export type USStateTier = 1 | 2 | 3 | 4

export type USStateDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

// All 50 US states
export const US_STATES: USState[] = [
  { name: 'Alabama', abbrev: 'AL', capital: 'Montgomery', region: 'Southeast' },
  { name: 'Alaska', abbrev: 'AK', capital: 'Juneau', region: 'West' },
  { name: 'Arizona', abbrev: 'AZ', capital: 'Phoenix', region: 'Southwest' },
  { name: 'Arkansas', abbrev: 'AR', capital: 'Little Rock', region: 'Southeast' },
  { name: 'California', abbrev: 'CA', capital: 'Sacramento', region: 'West' },
  { name: 'Colorado', abbrev: 'CO', capital: 'Denver', region: 'West' },
  { name: 'Connecticut', abbrev: 'CT', capital: 'Hartford', region: 'Northeast' },
  { name: 'Delaware', abbrev: 'DE', capital: 'Dover', region: 'Northeast' },
  { name: 'Florida', abbrev: 'FL', capital: 'Tallahassee', region: 'Southeast' },
  { name: 'Georgia', abbrev: 'GA', capital: 'Atlanta', region: 'Southeast' },
  { name: 'Hawaii', abbrev: 'HI', capital: 'Honolulu', region: 'West' },
  { name: 'Idaho', abbrev: 'ID', capital: 'Boise', region: 'West' },
  { name: 'Illinois', abbrev: 'IL', capital: 'Springfield', region: 'Midwest' },
  { name: 'Indiana', abbrev: 'IN', capital: 'Indianapolis', region: 'Midwest' },
  { name: 'Iowa', abbrev: 'IA', capital: 'Des Moines', region: 'Midwest' },
  { name: 'Kansas', abbrev: 'KS', capital: 'Topeka', region: 'Midwest' },
  { name: 'Kentucky', abbrev: 'KY', capital: 'Frankfort', region: 'Southeast' },
  { name: 'Louisiana', abbrev: 'LA', capital: 'Baton Rouge', region: 'Southeast' },
  { name: 'Maine', abbrev: 'ME', capital: 'Augusta', region: 'Northeast' },
  { name: 'Maryland', abbrev: 'MD', capital: 'Annapolis', region: 'Northeast' },
  { name: 'Massachusetts', abbrev: 'MA', capital: 'Boston', region: 'Northeast' },
  { name: 'Michigan', abbrev: 'MI', capital: 'Lansing', region: 'Midwest' },
  { name: 'Minnesota', abbrev: 'MN', capital: 'Saint Paul', region: 'Midwest' },
  { name: 'Mississippi', abbrev: 'MS', capital: 'Jackson', region: 'Southeast' },
  { name: 'Missouri', abbrev: 'MO', capital: 'Jefferson City', region: 'Midwest' },
  { name: 'Montana', abbrev: 'MT', capital: 'Helena', region: 'West' },
  { name: 'Nebraska', abbrev: 'NE', capital: 'Lincoln', region: 'Midwest' },
  { name: 'Nevada', abbrev: 'NV', capital: 'Carson City', region: 'West' },
  { name: 'New Hampshire', abbrev: 'NH', capital: 'Concord', region: 'Northeast' },
  { name: 'New Jersey', abbrev: 'NJ', capital: 'Trenton', region: 'Northeast' },
  { name: 'New Mexico', abbrev: 'NM', capital: 'Santa Fe', region: 'Southwest' },
  { name: 'New York', abbrev: 'NY', capital: 'Albany', region: 'Northeast' },
  { name: 'North Carolina', abbrev: 'NC', capital: 'Raleigh', region: 'Southeast' },
  { name: 'North Dakota', abbrev: 'ND', capital: 'Bismarck', region: 'Midwest' },
  { name: 'Ohio', abbrev: 'OH', capital: 'Columbus', region: 'Midwest' },
  { name: 'Oklahoma', abbrev: 'OK', capital: 'Oklahoma City', region: 'Southwest' },
  { name: 'Oregon', abbrev: 'OR', capital: 'Salem', region: 'West' },
  { name: 'Pennsylvania', abbrev: 'PA', capital: 'Harrisburg', region: 'Northeast' },
  { name: 'Rhode Island', abbrev: 'RI', capital: 'Providence', region: 'Northeast' },
  { name: 'South Carolina', abbrev: 'SC', capital: 'Columbia', region: 'Southeast' },
  { name: 'South Dakota', abbrev: 'SD', capital: 'Pierre', region: 'Midwest' },
  { name: 'Tennessee', abbrev: 'TN', capital: 'Nashville', region: 'Southeast' },
  { name: 'Texas', abbrev: 'TX', capital: 'Austin', region: 'Southwest' },
  { name: 'Utah', abbrev: 'UT', capital: 'Salt Lake City', region: 'West' },
  { name: 'Vermont', abbrev: 'VT', capital: 'Montpelier', region: 'Northeast' },
  { name: 'Virginia', abbrev: 'VA', capital: 'Richmond', region: 'Southeast' },
  { name: 'Washington', abbrev: 'WA', capital: 'Olympia', region: 'West' },
  { name: 'West Virginia', abbrev: 'WV', capital: 'Charleston', region: 'Southeast' },
  { name: 'Wisconsin', abbrev: 'WI', capital: 'Madison', region: 'Midwest' },
  { name: 'Wyoming', abbrev: 'WY', capital: 'Cheyenne', region: 'West' },
]

// Difficulty tiers — how recognizable/findable each state is on a map
// Tier 1 (Easy ~12): Large, distinctive shapes — Texas, California, Florida...
// Tier 2 (Medium ~13): Well-known, medium-sized
// Tier 3 (Hard ~13): Smaller or less distinctive
// Tier 4 (Expert ~12): Small, easily confused rectangular/square states

const STATE_TIER: Record<string, USStateTier> = {
  'Texas': 1, 'California': 1, 'Florida': 1, 'Alaska': 1, 'New York': 1,
  'Hawaii': 1, 'Michigan': 1, 'Louisiana': 1, 'Illinois': 1, 'Pennsylvania': 1,
  'Ohio': 1, 'Georgia': 1,

  'Washington': 2, 'Oregon': 2, 'Nevada': 2, 'Arizona': 2, 'Colorado': 2,
  'Minnesota': 2, 'Wisconsin': 2, 'Virginia': 2, 'North Carolina': 2, 'Tennessee': 2,
  'Oklahoma': 2, 'Massachusetts': 2, 'New Mexico': 2,

  'Montana': 3, 'Idaho': 3, 'Utah': 3, 'Kansas': 3, 'Nebraska': 3,
  'South Dakota': 3, 'North Dakota': 3, 'Missouri': 3, 'Arkansas': 3, 'Alabama': 3,
  'South Carolina': 3, 'Kentucky': 3, 'Maine': 3,

  'Indiana': 4, 'Iowa': 4, 'Mississippi': 4, 'West Virginia': 4, 'Maryland': 4,
  'New Jersey': 4, 'Connecticut': 4, 'Delaware': 4, 'Rhode Island': 4, 'Vermont': 4,
  'New Hampshire': 4, 'Wyoming': 4,
}

export function getStateTier(name: string): USStateTier {
  return STATE_TIER[name] ?? 3
}

export const TIER_POINTS: Record<USStateTier, number> = {
  1: 500,
  2: 750,
  3: 1250,
  4: 2000,
}

export function filterStatesByDifficulty(names: string[], difficulty: USStateDifficulty): string[] {
  const maxTier: number = { easy: 1, medium: 2, hard: 3, expert: 4 }[difficulty]
  return names.filter((n) => getStateTier(n) <= maxTier)
}

// Bright distinct colors for each state — used for the colorful map
// 10 colors cycling, ensures neighboring states get different colors via GeoJSON feature index
export const STATE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f59e0b', // amber
]

// Region views for map camera
export const US_REGION_VIEWS: Record<string, { center: [number, number]; zoom: number }> = {
  'All':       { center: [-98, 39],  zoom: 3.5 },
  'Northeast': { center: [-73, 42],  zoom: 5.5 },
  'Southeast': { center: [-84, 33],  zoom: 4.8 },
  'Midwest':   { center: [-92, 42],  zoom: 4.5 },
  'Southwest': { center: [-106, 33], zoom: 4.8 },
  'West':      { center: [-118, 42], zoom: 4.0 },
}

export const US_REGIONS: string[] = ['All', 'Northeast', 'Southeast', 'Midwest', 'Southwest', 'West']
