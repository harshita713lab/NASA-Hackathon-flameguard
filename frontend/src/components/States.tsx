import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Binary,
  Check,
  CheckCircle2,
  Database,
  FileCheck2,
  Flame,
  Loader2,
  RotateCcw,
  Sparkles,
  TerminalSquare,
  TriangleAlert,
  WifiOff,
} from 'lucide-react'
import type { BackendState } from '../types'
import { EXAMPLES } from '../lib/examples'
import { cn } from '../lib/format'

export function IdleState({ onUseExample }: { onUseExample: (query: string) => void }) {
  const pipeline = [
    { icon: Binary, label: 'Query embedding', detail: 'all-MiniLM-L6-v2 · local HuggingFace model' },
    { icon: Database, label: 'Similarity retrieval', detail: 'Pinecone · NASA PSI vector index' },
    { icon: Sparkles, label: 'Grounded synthesis', detail: 'Llama 3 on Groq · temperature 0.0' },
    { icon: FileCheck2, label: 'Evidence returned', detail: 'raw_results · experiment, fuel state, source' },
  ]

  return (
    <div className="mt-7 sm:mt-9 grid animate-rise gap-4 sm:gap-5 lg:grid-cols-[1.12fr_1fr]">
      <div className="panel p-4 sm:p-6">
        <p className="mono-label">Start here</p>
        <h2 className="mt-2 font-display text-base sm:text-lg font-semibold tracking-tight text-white">
          Four ways into the corpus
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Load a benchmark question, adjust the fuel filter, then run the analysis.
        </p>

        <div className="mt-4 sm:mt-5 grid gap-2.5 sm:grid-cols-2">
          {EXAMPLES.map((example, index) => (
            <button
              key={example}
              type="button"
              onClick={() => onUseExample(example)}
              className="tile-interactive group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 sm:p-3.5 text-left transition-all hover:border-ember/25 hover:bg-ember/[0.04] touch-manipulation"
            >
              <span className="font-mono text-[9px] text-dim transition-colors group-hover:text-ember-soft">
                0{index + 1}
              </span>
              <p className="mt-2 flex-1 text-[11.5px] sm:text-[12px] leading-relaxed text-ink/80 transition-colors group-hover:text-ink">
                {example}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-dim transition-colors group-hover:text-ember-soft">
                Load query
                <ArrowUpRight className="size-3" />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="mono-label">Pipeline</p>
            <h2 className="mt-2 font-display text-lg font-semibold tracking-tight text-white">
              How the SI answers
            </h2>
          </div>
          <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Flame className="size-4 text-ember" />
          </span>
        </div>

        <ol className="mt-5 space-y-4">
          {pipeline.map((step, index) => (
            <li key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <step.icon className="size-3.5 text-ember-soft/90" />
                </span>
                {index < pipeline.length - 1 && (
                  <span className="mt-1 h-full min-h-[14px] w-px flex-1 bg-gradient-to-b from-white/15 to-transparent" />
                )}
              </div>
              <div className="pb-1">
                <p className="text-[12px] font-medium text-ink">{step.label}</p>
                <p className="mt-0.5 font-mono text-[9.5px] leading-relaxed text-dim">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-ember/15 bg-ember/[0.05] p-3">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-ember-soft/80" />
          <p className="text-[10.5px] leading-relaxed text-ember-soft/75">
            The synthesis is AI-generated from retrieved passages and can misinterpret source data. Treat it
            as a lead, not a certified result.
          </p>
        </div>
      </div>
    </div>
  )
}

const STAGES = [
  { icon: Binary, label: 'Embedding query', detail: 'all-MiniLM-L6-v2' },
  { icon: Database, label: 'Scanning vector index', detail: 'Pinecone similarity search' },
  { icon: Sparkles, label: 'Synthesizing answer', detail: 'Llama 3 · Groq' },
]

export function LoadingState({ query }: { query: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const started = performance.now()
    const timer = window.setInterval(() => setElapsed(performance.now() - started), 150)
    return () => window.clearInterval(timer)
  }, [])

  const activeStage = elapsed < 2400 ? 0 : elapsed < 6200 ? 1 : 2

  return (
    <div id="analysis" className="mt-9 scroll-mt-24 space-y-5 animate-fade" aria-busy="true">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="panel panel-glow overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <div className="relative grid size-11 shrink-0 place-items-center">
              <span className="scan-orbit absolute inset-0 rounded-full opacity-70 animate-sweep" />
              <span className="absolute inset-[3px] rounded-full border border-ember/20 bg-void" />
              <Flame className="relative size-4 text-ember animate-pulse-soft" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mono-label text-ember-soft/80">Super intelligence working</p>
              <p className="mt-1 truncate text-[13px] text-ink/90" title={query}>
                {query}
              </p>
            </div>
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-muted">
              {(elapsed / 1000).toFixed(1)}s
            </span>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <ol className="space-y-2.5">
              {STAGES.map((stage, index) => {
                const done = index < activeStage
                const active = index === activeStage
                return (
                  <li
                    key={stage.label}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                      active
                        ? 'border-ember/25 bg-ember/[0.05]'
                        : done
                          ? 'border-white/[0.05] bg-white/[0.015]'
                          : 'border-transparent opacity-45',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-md border',
                        active
                          ? 'border-ember/30 bg-ember/10'
                          : done
                            ? 'border-telemetry/25 bg-telemetry/[0.08]'
                            : 'border-white/10',
                      )}
                    >
                      {done ? (
                        <Check className="size-3 text-telemetry" />
                      ) : active ? (
                        <Loader2 className="size-3 animate-spin text-ember" />
                      ) : (
                        <stage.icon className="size-3 text-dim" />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                      <span className={cn('text-[11.5px]', active ? 'text-ink' : 'text-muted')}>
                        {stage.label}
                      </span>
                      <span className="truncate font-mono text-[9px] text-dim">{stage.detail}</span>
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="space-y-2.5 pt-1">
              {[96, 88, 92, 64].map((width, index) => (
                <div
                  key={index}
                  className="skeleton h-2.5 rounded-full"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="panel space-y-5 p-5">
          <div className="flex items-center justify-between">
            <div className="skeleton h-2.5 w-28 rounded-full" />
            <div className="skeleton h-4 w-12 rounded-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2 sm:gap-2.5">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="stat-tile space-y-2">
                <div className="skeleton h-2 w-16 rounded-full" />
                <div className="skeleton h-5 w-10 rounded" />
                <div className="skeleton h-2 w-14 rounded-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[70, 46, 60].map((width, index) => (
              <div key={index} className="space-y-1.5">
                <div className="skeleton h-2 w-24 rounded-full" />
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="skeleton h-full rounded-full" style={{ width: `${width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="skeleton h-2.5 w-32 rounded-full" />
          <div className="skeleton h-6 w-24 rounded-lg" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-2 rounded-xl border border-white/[0.05] p-4">
              <div className="flex justify-between">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-4 w-14 rounded-full" />
              </div>
              <div className="skeleton h-2.5 w-full rounded-full" />
              <div className="skeleton h-2.5 w-11/12 rounded-full" />
              <div className="skeleton h-2.5 w-2/3 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
  backend: BackendState
  backendUrl: string
  docsUrl: string
}

export function ErrorState({ message, onRetry, backend, backendUrl, docsUrl }: ErrorStateProps) {
  return (
    <div id="analysis" className="panel mt-7 sm:mt-9 scroll-mt-24 animate-rise overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-400/15 bg-rose-500/[0.05] px-4 sm:px-6 py-3.5 sm:py-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-rose-400/25 bg-rose-400/10 shrink-0">
            <WifiOff className="size-4 text-rose-300" />
          </span>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-rose-300/90">
              Analysis interrupted
            </p>
            <p className="mt-0.5 text-[12.5px] sm:text-[13px] text-ink/90">The retrieval service did not complete the run.</p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider',
            backend === 'online'
              ? 'border-telemetry/25 bg-telemetry/[0.06] text-telemetry'
              : 'border-rose-400/25 bg-rose-400/[0.06] text-rose-300',
          )}
        >
          {backend === 'online' ? 'API reachable' : 'API unreachable'}
        </span>
      </div>

      <div className="grid gap-4 sm:gap-5 px-4 sm:px-6 py-4 sm:py-5 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="text-[12.5px] sm:text-[13px] leading-relaxed text-ink/85">{message}</p>
          <p className="mt-3 flex items-start gap-2 text-[11px] sm:text-[11.5px] leading-relaxed text-muted">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-ember-soft/70" />
            <span>
              Confirm the FastAPI server is running and that{' '}
              <span className="font-mono text-muted">PINECONE_API_KEY</span> and{' '}
              <span className="font-mono text-muted">GROQ_API_KEY</span> are set in the backend environment.
            </span>
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onRetry} className="btn-ember px-4 py-2.5 text-[12.5px] touch-manipulation">
              <RotateCcw className="size-3.5" />
              Retry analysis
            </button>
            <a href={docsUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3.5 py-2.5 touch-manipulation">
              Open API docs
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-black/40 p-4">
          <p className="mono-label flex items-center gap-1.5">
            <TerminalSquare className="size-3" />
            Boot the API
          </p>
          <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-muted">
            <span className="text-telemetry/70">$</span> cd backend{'\n'}
            <span className="text-telemetry/70">$</span> uvicorn app.main:app --reload
          </pre>
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <p className="mono-label">Proxy target</p>
            <p className="mt-1.5 truncate font-mono text-[10px] text-muted" title={backendUrl}>
              {backendUrl}
            </p>
          </div>
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-dim">
            <CheckCircle2 className="size-3 text-telemetry/60" />
            Requests proxied by Vite · no CORS changes needed
          </p>
        </div>
      </div>
    </div>
  )
}
