import type { CSSProperties } from 'react'
import { ArrowUpRight, Loader2, ShieldCheck, Sparkles, TerminalSquare } from 'lucide-react'
import type { FuelFilter } from '../types'
import { EXAMPLES } from '../lib/examples'
import { cn } from '../lib/format'
import { StackReadout } from './Brand'

const FUELS: Array<{ id: FuelFilter; dot: string }> = [
  { id: 'All', dot: 'bg-white/50' },
  { id: 'Solid', dot: 'bg-ember' },
  { id: 'Liquid', dot: 'bg-telemetry' },
  { id: 'Mixed', dot: 'bg-violet-400' },
]

interface QueryConsoleProps {
  query: string
  onQueryChange: (value: string) => void
  fuel: FuelFilter
  onFuelChange: (value: FuelFilter) => void
  topK: number
  onTopKChange: (value: number) => void
  onSubmit: () => void
  loading: boolean
}

export function QueryConsole({
  query,
  onQueryChange,
  fuel,
  onFuelChange,
  topK,
  onTopKChange,
  onSubmit,
  loading,
}: QueryConsoleProps) {
  const canSubmit = query.trim().length > 0 && !loading

  return (
    <section id="console" className="scroll-mt-24">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-8">
        <div className="max-w-2xl animate-rise">
          <div className="flex items-center gap-2.5">
            <span className="h-px w-7 bg-gradient-to-r from-ember to-transparent" />
            <p className="mono-label text-ember-soft/80">Mission control · PSI corpus</p>
          </div>

          <h1 className="mt-3 sm:mt-4 font-display text-[clamp(1.75rem,5.5vw,3.35rem)] font-bold leading-[1.06] tracking-[-0.02em] text-white">
            Ask the archive.
            <br />
            <span className="bg-gradient-to-r from-ember-soft via-ember to-[#ff9a52] bg-clip-text text-transparent">
              Verify the science.
            </span>
          </h1>

          <p className="mt-3 sm:mt-4 max-w-xl text-[13px] sm:text-sm leading-relaxed text-muted">
            Interrogate decades of NASA microgravity combustion research — Saffire, Mir and beyond — with
            retrieval-augmented synthesis. Every answer arrives with the raw PSI passages behind it.
          </p>

          <div className="mt-4 sm:mt-5 flex flex-wrap gap-1.5 sm:gap-2">
            {['Saffire', 'Mir station', 'PMMA acrylics', 'Oxygen enrichment', 'Smoke transport'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] sm:text-[9.5px] uppercase tracking-[0.1em] sm:tracking-[0.12em] text-dim"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden animate-rise xl:block shrink-0">
          <StackReadout />
        </div>
      </div>

      <div className="panel panel-glow mt-6 sm:mt-8 animate-rise p-3.5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="research-query" className="mono-label">
            Research query
          </label>
          <span className="hidden items-center gap-1 sm:flex">
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-muted">
              ⌘
            </kbd>
            <span className="text-[9px] text-dim">+</span>
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-muted">
              ↵
            </kbd>
            <span className="ml-1 font-mono text-[9px] uppercase tracking-wider text-dim">to run</span>
          </span>
        </div>

        <div className="field-shell mt-2.5 px-3 sm:px-3.5 py-2.5 sm:py-3">
          <textarea
            id="research-query"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                if (canSubmit) onSubmit()
              }
            }}
            rows={3}
            maxLength={600}
            placeholder="e.g. How does flame spread behave over solid PMMA acrylics in microgravity?"
            className="w-full resize-none bg-transparent text-base sm:text-[14.5px] leading-relaxed text-ink placeholder:text-dim/70 focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between font-mono text-[8.5px] sm:text-[9px] uppercase tracking-wider text-dim/70">
            <span className="flex items-center gap-1.5 truncate">
              <TerminalSquare className="size-3 shrink-0" />
              <span className="truncate">Natural language query</span>
            </span>
            <span className="shrink-0">{query.length}/600</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="mr-1 hidden font-mono text-[9px] uppercase tracking-[0.16em] text-dim sm:inline">
            Try
          </span>
          {EXAMPLES.slice(0, 2).map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onQueryChange(example)}
              className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 sm:px-3 py-1.5 text-left text-[10.5px] sm:text-[11px] text-muted transition-colors hover:border-ember/30 hover:bg-ember/[0.06] hover:text-ember-soft touch-manipulation"
            >
              <Sparkles className="size-3 shrink-0 text-ember/70" />
              <span className="truncate">{example}</span>
              <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hidden sm:inline" />
            </button>
          ))}
        </div>

        <div className="mt-5 sm:mt-6 flex flex-col gap-4 sm:gap-5 border-t border-white/[0.06] pt-4 sm:pt-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 lg:gap-7">
            <div className="w-full sm:w-auto">
              <p className="mono-label">Fuel state filter</p>
              <div className="mt-2 flex w-full sm:w-auto overflow-x-auto no-scrollbar rounded-xl border border-white/10 bg-black/25 p-1">
                {FUELS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onFuelChange(option.id)}
                    aria-pressed={fuel === option.id}
                    className={cn(
                      'flex flex-1 sm:flex-initial justify-center items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] sm:text-[11.5px] font-medium transition-all sm:px-3 touch-manipulation',
                      fuel === option.id
                        ? 'bg-ember/[0.13] text-ember-soft ring-1 ring-ember/25 ring-inset'
                        : 'text-dim hover:text-ink',
                    )}
                  >
                    <span className={cn('size-1.5 rounded-full shrink-0', option.dot)} />
                    {option.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full sm:w-auto sm:min-w-[190px]">
              <div className="flex items-center justify-between gap-4">
                <p className="mono-label">Passages · top_k</p>
                <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-ember-soft">
                  {String(topK).padStart(2, '0')}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={topK}
                onChange={(event) => onTopKChange(Number(event.target.value))}
                aria-label="Number of passages to retrieve"
                className="range-ember mt-3 w-full"
                style={{ '--range-progress': `${((topK - 1) / 9) * 100}%` } as CSSProperties}
              />
              <div className="mt-1 flex justify-between font-mono text-[8.5px] text-dim/60">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="btn-ember w-full shrink-0 sm:w-auto touch-manipulation"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin shrink-0" />
                Synthesizing…
              </>
            ) : (
              <>
                Run analysis
                <ArrowUpRight className="size-4 shrink-0" />
              </>
            )}
          </button>
        </div>

        <p className="mt-3.5 sm:mt-4 flex items-start gap-1.5 text-[10px] sm:text-[10.5px] leading-relaxed text-dim">
          <ShieldCheck className="mt-px size-3 shrink-0 text-telemetry/70" />
          Answers are synthesized from retrieved PSI passages. Always verify the cited source text before
          operational use.
        </p>
      </div>
    </section>
  )
}
