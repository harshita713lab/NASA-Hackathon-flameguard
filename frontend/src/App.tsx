import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Flame, PencilLine } from 'lucide-react'
import { AnswerPanel } from './components/AnswerPanel'
import { EvidenceLedger } from './components/EvidenceLedger'
import { QueryConsole } from './components/QueryConsole'
import { Sidebar } from './components/Sidebar'
import { ErrorState, IdleState, LoadingState } from './components/States'
import { TelemetryPanel } from './components/TelemetryPanel'
import { Topbar } from './components/Topbar'
import { useBackendStatus } from './hooks/useBackendStatus'
import { useSearchHistory } from './hooks/useSearchHistory'
import { backendLabel, docsUrl, runSearch } from './lib/api'
import { cn, uid } from './lib/format'
import type { FuelFilter, SearchRun } from './types'

function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-void" />
      <div className="grid-overlay absolute inset-0" />
      <div className="absolute -top-48 left-1/2 h-[560px] w-[min(1000px,140vw)] -translate-x-1/2 rounded-full bg-ember/[0.09] blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[420px] w-[560px] rounded-full bg-telemetry/[0.05] blur-[130px]" />
      <div className="noise-overlay absolute inset-0 opacity-[0.035] mix-blend-soft-light" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent_25%,#05070c_82%)]" />
    </div>
  )
}

function ResultsHeader({ run, onEdit }: { run: SearchRun; onEdit: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-telemetry/80">
          <CheckCircle2 className="size-3.5 shrink-0" />
          Analysis complete
        </p>
        <h2 className="mt-2 max-w-3xl font-display text-[16px] sm:text-[18px] font-semibold leading-snug tracking-tight text-white break-words">
          “{run.query}”
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip border-white/[0.08] py-1 text-[10px]">
          {run.fuelFilter === 'All' ? 'All fuel states' : `${run.fuelFilter} only`}
        </span>
        <span className="chip border-white/[0.08] py-1 text-[10px]">top_k {run.topK}</span>
        <button type="button" onClick={onEdit} className="btn-ghost py-1.5 text-[10.5px] touch-manipulation">
          <PencilLine className="size-3" />
          Edit query
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [fuel, setFuel] = useState<FuelFilter>('All')
  const [topK, setTopK] = useState(4)
  const [loading, setLoading] = useState(false)
  const [run, setRun] = useState<SearchRun | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { history, add, remove, clear } = useSearchHistory()
  const { state: backend, refresh: refreshBackend } = useBackendStatus()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (media.matches) setSidebarOpen(false)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [sidebarOpen])

  const jumpTo = (target: 'console' | 'evidence' | 'analysis-top') => {
    const id = target === 'analysis-top' ? 'analysis' : target
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const execute = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed || loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setRun(null)

    const started = performance.now()
    try {
      const response = await runSearch(trimmed, fuel, topK, controller.signal)
      const record: SearchRun = {
        id: uid(),
        query: trimmed,
        fuelFilter: fuel,
        topK,
        response,
        latencyMs: performance.now() - started,
        createdAt: Date.now(),
      }
      setRun(record)
      add(record)
      window.setTimeout(() => jumpTo('analysis-top'), 80)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'An unexpected error interrupted the analysis.')
      setRun(null)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [query, fuel, topK, loading, add])

  const restoreRun = (record: SearchRun) => {
    abortRef.current?.abort()
    setLoading(false)
    setError(null)
    setQuery(record.query)
    setFuel(record.fuelFilter)
    setTopK(record.topK)
    setRun(record)
    window.setTimeout(() => {
      document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const useExample = (example: string) => {
    setQuery(example)
    document.getElementById('research-query')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => document.getElementById('research-query')?.focus(), 450)
  }

  return (
    <div className="relative min-h-screen">
      <Backdrop />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        history={history}
        activeId={run?.id ?? null}
        onSelectRun={restoreRun}
        onDeleteRun={remove}
        onClearHistory={clear}
        backend={backend}
        backendUrl={backendLabel}
        docsUrl={docsUrl}
        onRefreshBackend={refreshBackend}
        onJump={jumpTo}
        hasEvidence={Boolean(run?.response.raw_results.length)}
      />

      <div
        className={cn(
          'fixed inset-0 z-40 bg-void/70 backdrop-blur-sm transition-opacity lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="lg:pl-[278px]">
        <Topbar
          onMenu={() => setSidebarOpen(true)}
          backend={backend}
          onRefreshBackend={refreshBackend}
          docsUrl={docsUrl}
        />

        <main className="mx-auto w-full max-w-[1380px] 2xl:max-w-[1560px] px-3.5 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-7 lg:px-8 lg:pt-9">
          <QueryConsole
            query={query}
            onQueryChange={setQuery}
            fuel={fuel}
            onFuelChange={setFuel}
            topK={topK}
            onTopKChange={setTopK}
            onSubmit={execute}
            loading={loading}
          />

          <div aria-live="polite">
            {error ? (
              <ErrorState
                message={error}
                onRetry={execute}
                backend={backend}
                backendUrl={backendLabel}
                docsUrl={docsUrl}
              />
            ) : loading ? (
              <LoadingState query={query.trim()} />
            ) : run ? (
              <div id="analysis" className="mt-7 sm:mt-9 scroll-mt-24 space-y-4 sm:space-y-5">
                <ResultsHeader run={run} onEdit={() => jumpTo('console')} />

                <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                  <div className="animate-rise min-w-0">
                    <AnswerPanel run={run} />
                  </div>
                  <div className="animate-rise min-w-0 [animation-delay:90ms]">
                    <TelemetryPanel run={run} />
                  </div>
                </div>

                <div className="pt-2">
                  <EvidenceLedger key={run.id} run={run} />
                </div>
              </div>
            ) : (
              <IdleState onUseExample={useExample} />
            )}
          </div>

          <footer className="mt-10 sm:mt-14 border-t border-white/[0.06] pt-5 sm:pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
                <Flame className="size-3 text-ember/70 shrink-0" />
                FlameGuard SI · NASA Space Apps Challenge
              </p>
              <p className="text-[10px] leading-relaxed text-dim">
                AI-generated synthesis — verify claims against the cited PSI passages.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
