import { useCallback, useEffect, useState } from 'react'
import type { SearchRun } from '../types'

const STORAGE_KEY = 'flameguard.history.v1'
const LIMIT = 12

function readHistory(): SearchRun[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is SearchRun => {
        if (!item || typeof item !== 'object') return false
        const candidate = item as Partial<SearchRun>
        return (
          typeof candidate.id === 'string' &&
          typeof candidate.query === 'string' &&
          typeof candidate.response?.synthesized_answer === 'string' &&
          Array.isArray(candidate.response?.raw_results)
        )
      })
      .slice(0, LIMIT)
  } catch {
    return []
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchRun[]>(() => readHistory())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [history])

  const add = useCallback((run: SearchRun) => {
    setHistory((prev) => [run, ...prev.filter((item) => item.id !== run.id)].slice(0, LIMIT))
  }, [])

  const remove = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clear = useCallback(() => setHistory([]), [])

  return { history, add, remove, clear }
}
