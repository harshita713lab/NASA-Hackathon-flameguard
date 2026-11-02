export type FuelState = 'Solid' | 'Liquid' | 'Mixed'
export type FuelFilter = 'All' | FuelState
export type BackendState = 'checking' | 'online' | 'offline'

export interface SearchPayload {
  query: string
  fuel_filter?: FuelState
  top_k?: number
}

export interface RawResult {
  text: string
  experiment: string
  fuel_state: string
  source: string
}

export interface SearchResponse {
  synthesized_answer: string
  raw_results: RawResult[]
}

export interface SearchRun {
  id: string
  query: string
  fuelFilter: FuelFilter
  topK: number
  response: SearchResponse
  latencyMs: number
  createdAt: number
}
