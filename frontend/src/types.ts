export type FuelState = 'Solid' | 'Liquid' | 'Mixed'
export type FuelFilter = 'All' | FuelState
export type Mission = 'ISS' | 'Lunar Base' | 'Spacesuit EVA'
export type MissionFilter = 'All' | Mission
export type SafetyPillar = 'Prevention' | 'Detection' | 'Suppression'
export type PillarFilter = 'All' | SafetyPillar
export type BackendState = 'checking' | 'online' | 'offline'

export const SECTION_API_IDS = ['Combustion Science', 'Apollo 1', 'Apollo 13', 'Mir'] as const
export type SectionApiId = (typeof SECTION_API_IDS)[number]

export interface SearchPayload {
  query: string
  environment?: string | null
  section?: SectionApiId | null
  fuel_filter?: FuelState | null
  mission?: Mission | null
  pillar?: SafetyPillar | null
  top_k?: number
}

export interface RawResult {
  text: string
  experiment: string
  fuel_state: string
  source: string
  pillar?: string | null
  environments?: string[]
  citation?: string | null
}

export interface SearchResponse {
  synthesized_answer: string
  raw_results: RawResult[]
  active_source?: string | null
  is_safe?: boolean | null
}

export interface SearchRun {
  id: string
  query: string
  fuelFilter: FuelFilter
  mission: MissionFilter
  pillar: PillarFilter
  topK: number
  section?: SectionApiId
  response: SearchResponse
  latencyMs: number
  createdAt: number
}
