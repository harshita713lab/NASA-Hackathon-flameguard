import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSearchHistory } from '../src/hooks/useSearchHistory'
import type { SearchRun } from '../src/types'

const STORAGE_KEY = 'flameguard.history.v1'

function makeRun(id: string, query = `query ${id}`): SearchRun {
  return {
    id,
    query,
    fuelFilter: 'All',
    mission: 'All',
    pillar: 'All',
    topK: 4,
    latencyMs: 10,
    createdAt: 1700000000000,
    response: { synthesized_answer: 'answer', raw_results: [] },
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('useSearchHistory', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useSearchHistory())
    expect(result.current.history).toEqual([])
  })

  it('prepends new runs', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => result.current.add(makeRun('a')))
    act(() => result.current.add(makeRun('b')))

    expect(result.current.history.map((run) => run.id)).toEqual(['b', 'a'])
  })

  it('replaces a run with the same id', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => result.current.add(makeRun('a', 'first')))
    act(() => result.current.add(makeRun('a', 'second')))

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].query).toBe('second')
  })

  it('caps history at twelve runs', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      for (let index = 0; index < 14; index += 1) {
        result.current.add(makeRun(`run-${index}`))
      }
    })

    expect(result.current.history).toHaveLength(12)
    expect(result.current.history[0].id).toBe('run-13')
    expect(result.current.history.at(-1)?.id).toBe('run-2')
  })

  it('removes individual runs and clears everything', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => result.current.add(makeRun('a')))
    act(() => result.current.add(makeRun('b')))
    act(() => result.current.remove('a'))
    expect(result.current.history.map((run) => run.id)).toEqual(['b'])

    act(() => result.current.clear())
    expect(result.current.history).toEqual([])
  })

  it('persists history to local storage', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => result.current.add(makeRun('a')))

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('a')
  })

  it('restores valid runs and ignores malformed entries', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        makeRun('valid'),
        { id: 'missing-response', query: 'bad' },
        null,
        'not-an-object',
      ]),
    )

    const { result } = renderHook(() => useSearchHistory())
    expect(result.current.history.map((run) => run.id)).toEqual(['valid'])
  })

  it('survives corrupt storage', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')

    const { result } = renderHook(() => useSearchHistory())
    expect(result.current.history).toEqual([])
  })
})
