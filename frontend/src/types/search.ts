import type { RawResult, SearchResponse, SectionApiId } from '../types'

export type { RawResult, SearchResponse, SectionApiId }

/** Section-scoped request: global filters stay null so they cannot collide with the section filter. */
export interface SectionSearchRequest {
  query: string
  section: SectionApiId
  top_k: number
  environment: null
  mission: null
  pillar: null
  fuel_filter: null
}
