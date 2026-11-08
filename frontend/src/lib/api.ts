import type {
  FuelFilter,
  MissionFilter,
  PillarFilter,
  SearchPayload,
  SearchResponse,
} from '../types'

const rawBase = (import.meta.env.VITE_API_URL ?? '').trim()
const BASE = rawBase.replace(/\/+$/, '')

const SEARCH_TIMEOUT_MS = 120_000
const HEALTH_TIMEOUT_MS = 5_000

export const backendLabel = BASE || 'http://127.0.0.1:8000'
export const docsUrl = `${backendLabel}/docs`

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function withTimeout(timeout: number, external?: AbortSignal) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  const abort = () => controller.abort()
  external?.addEventListener('abort', abort, { once: true })
  const clear = () => {
    window.clearTimeout(timer)
    external?.removeEventListener('abort', abort)
  }
  return { signal: controller.signal, clear }
}

export async function runSearch(
  query: string,
  fuelFilter: FuelFilter,
  mission: MissionFilter,
  pillar: PillarFilter,
  topK: number,
  external?: AbortSignal,
): Promise<SearchResponse> {
  const payload: SearchPayload = { query, top_k: topK }
  if (fuelFilter !== 'All') payload.fuel_filter = fuelFilter
  if (mission !== 'All') payload.mission = mission
  if (pillar !== 'All') payload.pillar = pillar

  const { signal, clear } = withTimeout(SEARCH_TIMEOUT_MS, external)

  try {
    const res = await fetch(`${BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })

    if (!res.ok) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new ApiError(
          `The FlameGuard API is unreachable (gateway returned ${res.status}). Start the FastAPI server at ${backendLabel} and retry.`,
          res.status,
        )
      }

      let detail = `The retrieval service responded with HTTP ${res.status}.`
      try {
        const data = (await res.json()) as { detail?: unknown }
        if (typeof data.detail === 'string' && data.detail.trim()) detail = data.detail
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(detail, res.status)
    }

    return (await res.json()) as SearchResponse
  } catch (error) {
    if (error instanceof ApiError) throw error

    if (error instanceof DOMException && error.name === 'AbortError') {
      if (external?.aborted) throw error
      throw new ApiError('The analysis timed out before the model finished. Try a narrower query or retry.')
    }

    throw new ApiError(
      `Could not reach the FlameGuard API at ${backendLabel}. Start the FastAPI server and try again.`,
    )
  } finally {
    clear()
  }
}

export async function checkBackend(external?: AbortSignal): Promise<boolean> {
  const { signal, clear } = withTimeout(HEALTH_TIMEOUT_MS, external)
  const url = BASE ? `${BASE}/` : '/healthz'

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
    if (!res.ok) return false
    const data = (await res.json().catch(() => null)) as { status?: unknown } | null
    return typeof data?.status === 'string'
  } catch {
    return false
  } finally {
    clear()
  }
}
