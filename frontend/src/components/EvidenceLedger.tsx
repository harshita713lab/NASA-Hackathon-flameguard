import { Fragment, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileJson,
  FileText,
  Flame,
  LayoutGrid,
  Table2,
} from 'lucide-react'
import type { SearchRun } from '../types'
import { cn } from '../lib/format'
import { highlightTerms, queryTerms } from '../lib/highlight'

const FUEL_TONE: Record<string, string> = {
  Solid: 'border-ember/25 bg-ember/[0.08] text-ember-soft',
  Liquid: 'border-telemetry/25 bg-telemetry/[0.07] text-telemetry',
  Mixed: 'border-violet-400/25 bg-violet-400/[0.08] text-violet-300',
}

function FuelPill({ state }: { state: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]',
        FUEL_TONE[state] ?? 'border-white/10 bg-white/[0.04] text-muted',
      )}
    >
      {state || 'Unknown'}
    </span>
  )
}

function pad(index: number) {
  return String(index + 1).padStart(2, '0')
}

export function EvidenceLedger({ run }: { run: SearchRun }) {
  const results = run.response.raw_results ?? []
  const [fuelFilter, setFuelFilter] = useState('All')
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const [copied, setCopied] = useState<number | null>(null)

  const terms = useMemo(() => queryTerms(run.query), [run.query])

  const fuelOptions = ['All', ...new Set(results.map((result) => result.fuel_state).filter(Boolean))]
  const filtered = results.filter(
    (result) => fuelFilter === 'All' || result.fuel_state === fuelFilter,
  )

  const toggle = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const copyChunk = async (index: number) => {
    try {
      await navigator.clipboard.writeText(
        `[${results[index].experiment} · ${results[index].source}]\n${results[index].text}`,
      )
      setCopied(index)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  const exportJson = () => {
    const payload = {
      query: run.query,
      fuel_filter: run.fuelFilter === 'All' ? null : run.fuelFilter,
      top_k: run.topK,
      latency_ms: Math.round(run.latencyMs),
      generated_at: new Date(run.createdAt).toISOString(),
      synthesized_answer: run.response.synthesized_answer,
      raw_results: run.response.raw_results,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `flameguard-evidence-${run.createdAt}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const uniqueExperiments = new Set(results.map((result) => result.experiment)).size

  return (
    <section id="evidence" className="scroll-mt-24 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label flex items-center gap-2 text-telemetry/70">
            <span className="h-px w-5 bg-telemetry/40" />
            Source ledger
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Evidence trail
          </h2>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">
            Unmodified passages returned by the retrieval layer for this query. Inspect the source text to
            verify every claim in the synthesis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border-white/[0.08] text-muted">
            {results.length} {results.length === 1 ? 'passage' : 'passages'}
            <span className="text-white/15">·</span>
            {uniqueExperiments} {uniqueExperiments === 1 ? 'experiment' : 'experiments'}
          </span>
          <button
            type="button"
            onClick={exportJson}
            className="btn-ghost"
            disabled={results.length === 0}
            aria-label="Export evidence as JSON"
          >
            <Download className="size-3.5" />
            <span className="sm:hidden">Export</span>
            <span className="hidden sm:inline">Export JSON</span>
          </button>
        </div>
      </div>

      <div className="panel mt-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1 pb-1 sm:pb-0">
            {fuelOptions.map((option) => {
              const count =
                option === 'All'
                  ? results.length
                  : results.filter((result) => result.fuel_state === option).length
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFuelFilter(option)}
                  className={cn(
                    'shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors touch-manipulation',
                    fuelFilter === option
                      ? 'border-ember/30 bg-ember/[0.1] text-ember-soft'
                      : 'border-transparent text-dim hover:bg-white/[0.04] hover:text-ink',
                  )}
                >
                  {option}
                  <span className="ml-1.5 font-mono text-[9px] text-dim">{count}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-black/25 p-0.5">
              <button
                type="button"
                onClick={() => setView('cards')}
                aria-pressed={view === 'cards'}
                aria-label="Card view"
                className={cn(
                  'rounded-md p-1.5 transition-colors touch-manipulation',
                  view === 'cards' ? 'bg-white/[0.08] text-white' : 'text-dim hover:text-ink',
                )}
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                aria-label="Table view"
                className={cn(
                  'rounded-md p-1.5 transition-colors touch-manipulation',
                  view === 'table' ? 'bg-white/[0.08] text-white' : 'text-dim hover:text-ink',
                )}
              >
                <Table2 className="size-3.5" />
              </button>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-dim">
              {filtered.length}/{results.length} shown
            </span>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="panel mt-4 flex flex-col items-center px-6 py-12 text-center">
          <FileJson className="size-6 text-dim" />
          <p className="mt-3 text-sm font-medium text-ink">No passages were returned</p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
            The vector store found no matching chunks for this query and filter. Try a different fuel state,
            raise top_k, or broaden the wording.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel mt-4 px-6 py-10 text-center">
          <p className="text-sm text-muted">No passages match the “{fuelFilter}” filter.</p>
          <button
            type="button"
            onClick={() => setFuelFilter('All')}
            className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ember-soft hover:underline"
          >
            Reset filter
          </button>
        </div>
      ) : view === 'cards' ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((result) => {
            const sourceIndex = results.indexOf(result)
            const isOpen = expanded.has(sourceIndex)
            return (
              <article
                key={`${sourceIndex}-${result.source}`}
                className="group relative flex flex-col rounded-xl border border-white/[0.06] bg-panel/60 p-4 transition-colors hover:border-white/[0.12]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-dim">[{pad(sourceIndex)}]</span>
                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10.5px] font-medium text-ink/85">
                      <Flame className="size-3 shrink-0 text-ember" />
                      <span className="truncate">{result.experiment || 'Unknown'}</span>
                    </span>
                  </div>
                  <FuelPill state={result.fuel_state} />
                </div>

                <p
                  className={cn(
                    'mt-3 text-[12.5px] leading-relaxed text-muted',
                    !isOpen && 'ledger-text',
                    isOpen && 'text-ink/80',
                  )}
                >
                  {highlightTerms(result.text, terms)}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
                  <p className="flex min-w-0 items-center gap-1.5 font-mono text-[9.5px] text-dim">
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate" title={result.source}>
                      {result.source || 'Unknown source'}
                    </span>
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => copyChunk(sourceIndex)}
                      aria-label={`Copy passage ${pad(sourceIndex)}`}
                      className="rounded-md p-1.5 text-dim transition-colors hover:bg-white/[0.05] hover:text-ink"
                    >
                      {copied === sourceIndex ? (
                        <Check className="size-3.5 text-telemetry" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(sourceIndex)}
                      aria-expanded={isOpen}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-dim transition-colors hover:text-ember-soft"
                    >
                      {isOpen ? 'Less' : 'Read all'}
                      <ChevronDown
                        className={cn('size-3 transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="panel mt-4 overflow-hidden">
          <div className="md:hidden px-3.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-dim border-b border-white/[0.05] bg-white/[0.015]">
            ← Scroll horizontally to inspect full table →
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] sm:min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  {['#', 'Experiment', 'Fuel', 'Source', 'Passage excerpt', ''].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-dim"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((result) => {
                  const sourceIndex = results.indexOf(result)
                  const isOpen = expanded.has(sourceIndex)
                  return (
                    <Fragment key={`${sourceIndex}-${result.source}`}>
                      <tr
                        onClick={() => toggle(sourceIndex)}
                        className="cursor-pointer border-b border-white/[0.05] transition-colors hover:bg-white/[0.025]"
                      >
                        <td className="px-4 py-3 font-mono text-[10px] text-dim">[{pad(sourceIndex)}]</td>
                        <td className="px-4 py-3 text-[12px] text-ink/90">{result.experiment || 'Unknown'}</td>
                        <td className="px-4 py-3">
                          <FuelPill state={result.fuel_state} />
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 font-mono text-[10px] text-muted">
                          {result.source || 'Unknown'}
                        </td>
                        <td className="max-w-[300px] px-4 py-3">
                          <p className="truncate text-[11.5px] text-muted">{result.text}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggle(sourceIndex)
                            }}
                            aria-expanded={isOpen}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[9px] uppercase tracking-wider text-ember-soft/80 hover:text-ember-soft"
                          >
                            {isOpen ? 'Collapse' : 'Inspect'}
                            <ChevronDown className={cn('size-3 transition-transform', isOpen && 'rotate-180')} />
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-white/[0.05] bg-black/20">
                          <td colSpan={6} className="px-4 py-4">
                            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">
                              {highlightTerms(result.text, terms)}
                            </p>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void copyChunk(sourceIndex)
                              }}
                              className="mt-3 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-dim hover:text-ember-soft"
                            >
                              {copied === sourceIndex ? (
                                <Check className="size-3 text-telemetry" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                              {copied === sourceIndex ? 'Copied' : 'Copy passage'}
                            </button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
