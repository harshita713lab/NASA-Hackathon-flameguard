export type FuelState = 'Solid' | 'Liquid' | 'Mixed'
export type FuelFilter = 'All' | FuelState
export type Mission = 'ISS' | 'Lunar Base' | 'Spacesuit EVA'
export type MissionFilter = 'All' | Mission
export type SafetyPillar = 'Prevention' | 'Detection' | 'Suppression'
export type PillarFilter = 'All' | SafetyPillar
export type BackendState = 'checking' | 'online' | 'offline'

export interface SearchPayload {
  query: string
  fuel_filter?: FuelState
  mission?: Mission
  pillar?: SafetyPillar
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
}

export interface SearchRun {
  id: string
  query: string
  fuelFilter: FuelFilter
  mission: MissionFilter
  pillar: PillarFilter
  topK: number
  response: SearchResponse
  latencyMs: number
  createdAt: number
}
