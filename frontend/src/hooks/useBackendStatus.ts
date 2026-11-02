import { useCallback, useEffect, useState } from 'react'
import { checkBackend } from '../lib/api'
import type { BackendState } from '../types'

export function useBackendStatus() {
  const [state, setState] = useState<BackendState>('checking')

  const ping = useCallback(async () => {
    const online = await checkBackend()
    setState(online ? 'online' : 'offline')
  }, [])

  useEffect(() => {
    let active = true

    const run = async () => {
      const online = await checkBackend()
      if (active) setState(online ? 'online' : 'offline')
    }

    void run()
    const timer = window.setInterval(() => void run(), 30_000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void run()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const refresh = useCallback(async () => {
    setState('checking')
    await ping()
  }, [ping])

  return { state, refresh }
}
