export interface CountryFeatureProperties {
  ADMIN: string
  NAME: string
  ISO_A3: string
  CONTINENT: string
  REGION_UN: string
  SUBREGION: string
  POP_EST: number
}

export type HighlightState = 'none' | 'hover' | 'correct' | 'wrong' | 'target'
