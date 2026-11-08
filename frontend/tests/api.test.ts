import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, backendLabel, checkBackend, docsUrl, runSearch } from '../src/lib/api'
import type { SearchResponse } from '../src/types'

const payload: SearchResponse = {
  synthesized_answer: 'Grounded answer',
  raw_results: [
    {
      text: 'passage',
      experiment: 'BASS-II',
      fuel_state: 'Solid',
      source: 'report.pdf',
      pillar: 'Prevention',
      environments: ['ISS'],
      citation: 'TM',
    },
  ],
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runSearch', () => {
  it('posts the query and top_k', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

    const result = await runSearch('How does flame spread?', 'All', 'All', 'All', 4)

    expect(result).toEqual(payload)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/search')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ query: 'How does flame spread?', top_k: 4 })
  })

  it('includes every active filter', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

    await runSearch('lunar flame spread', 'Solid', 'Lunar Base', 'Detection', 6)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      query: 'lunar flame spread',
      fuel_filter: 'Solid',
      mission: 'Lunar Base',
      pillar: 'Detection',
      top_k: 6,
    })
  })

  it('throws the API detail message', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Query rejected' }), { status: 400 }),
    )

    await expect(runSearch('flame spread query', 'All', 'All', 'All', 4)).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Query rejected',
      status: 400,
    })
  })

  it('explains gateway failures', async () => {
    fetchMock.mockResolvedValue(new Response('down', { status: 502 }))

    await expect(runSearch('flame spread query', 'All', 'All', 'All', 4)).rejects.toThrow(
      /gateway returned 502/,
    )
  })

  it('wraps network failures in ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'))

    const error = await runSearch('flame spread query', 'All', 'All', 'All', 4).catch((err) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toContain('Could not reach the FlameGuard API')
  })

  it('falls back to a generic message for non-JSON errors', async () => {
    fetchMock.mockResolvedValue(new Response('<html>bad</html>', { status: 500 }))

    await expect(runSearch('flame spread query', 'All', 'All', 'All', 4)).rejects.toThrow(
      /HTTP 500/,
    )
  })
})

describe('checkBackend', () => {
  it('returns true when the health endpoint responds', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'running' }), { status: 200 }))
    await expect(checkBackend()).resolves.toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe('/healthz')
  })

  it('returns false on unhealthy responses', async () => {
    fetchMock.mockResolvedValue(new Response('error', { status: 503 }))
    await expect(checkBackend()).resolves.toBe(false)
  })

  it('returns false when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    await expect(checkBackend()).resolves.toBe(false)
  })

  it('exposes the backend label and docs URL', () => {
    expect(backendLabel).toBe('http://127.0.0.1:8000')
    expect(docsUrl).toBe('http://127.0.0.1:8000/docs')
  })
})
