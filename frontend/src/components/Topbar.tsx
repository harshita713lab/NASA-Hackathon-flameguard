import { useEffect, useState } from 'react'
import { BookOpen, Menu, Radio } from 'lucide-react'
import type { BackendState } from '../types'
import { NasaBadge } from './Brand'
import { StatusPill } from './StatusPill'

interface TopbarProps {
  onMenu: () => void
  backend: BackendState
  onRefreshBackend: () => void
  docsUrl: string
}

export function Topbar({ onMenu, backend, onRefreshBackend, docsUrl }: TopbarProps) {
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const time = clock.toISOString().slice(11, 19)

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-void/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1380px] 2xl:max-w-[1560px] items-center justify-between gap-3 px-3.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-muted transition-colors hover:text-white touch-manipulation lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>

          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.16em]">
            <span className="hidden text-dim sm:inline">Mission control</span>
            <span className="hidden text-white/15 sm:inline">/</span>
            <span className="truncate text-ink/80">SI console</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted md:flex">
            <Radio className="size-3 text-telemetry" />
            {time}
            <span className="text-dim">UTC</span>
          </div>
          <NasaBadge label="NASA" />
          <StatusPill state={backend} onRefresh={onRefreshBackend} />
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-lg border border-white/10 bg-white/[0.02] p-2 text-muted transition-colors hover:border-white/20 hover:text-ink sm:block touch-manipulation"
            aria-label="Open API documentation"
            title="API documentation"
          >
            <BookOpen className="size-4" />
          </a>
        </div>
      </div>
    </header>
  )
}
