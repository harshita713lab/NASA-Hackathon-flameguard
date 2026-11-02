import { Activity, Filter, Gauge, Layers3, Microscope } from 'lucide-react'
import type { SearchRun } from '../types'
import { cn, formatMs } from '../lib/format'

const FUEL_TONE: Record<string, string> = {
  Solid: 'bg-ember',
  Liquid: 'bg-telemetry',
  Mixed: 'bg-violet-400',
}

function toneFor(state: string) {
  return FUEL_TONE[state] ?? 'bg-white/30'
}

export function TelemetryPanel({ run }: { run: SearchRun }) {
  const results = run.response.raw_results ?? []
  const experimentCounts = new Map<string, number>()
  const fuelCounts = new Map<string, number>()

  for (const result of results) {
    experimentCounts.set(result.experiment, (experimentCounts.get(result.experiment) ?? 0) + 1)
    fuelCounts.set(result.fuel_state, (fuelCounts.get(result.fuel_state) ?? 0) + 1)
  }

  const experiments = Array.from(experimentCounts.entries()).sort((a, b) => b[1] - a[1])
  const fuels = Array.from(fuelCounts.entries()).sort((a, b) => b[1] - a[1])
  const total = results.length || 1

  const stats = [
    { label: 'Passages', value: `${results.length}`, hint: `of ${run.topK} requested`, icon: Layers3 },
    { label: 'Experiments', value: `${experiments.length}`, hint: 'unique sources', icon: Microscope },
    { label: 'Fuel states', value: `${fuels.length}`, hint: 'across evidence', icon: Filter },
    { label: 'Latency', value: formatMs(run.latencyMs), hint: 'end to end', icon: Gauge },
  ]

  return (
    <aside className="panel flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Activity className="size-4 text-telemetry" />
          <h2 className="font-display text-[13px] font-semibold tracking-tight text-white">
            Retrieval telemetry
          </h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-telemetry/20 bg-telemetry/[0.06] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-telemetry">
          <span className="size-1 rounded-full bg-telemetry animate-pulse-soft" />
          Live
        </span>
      </header>

      <div className="flex-1 space-y-5 px-5 py-4">
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-tile">
              <div className="flex items-center justify-between gap-2">
                <span className="mono-label">{stat.label}</span>
                <stat.icon className="size-3.5 text-dim" />
              </div>
              <p className="mt-2 font-display text-xl font-semibold tracking-tight text-white">{stat.value}</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-dim/80">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="mono-label">Experiment mix</p>
            <span className="font-mono text-[9px] text-dim">{results.length} chunks</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {experiments.length === 0 && <p className="text-[11px] text-dim">No evidence returned.</p>}
            {experiments.map(([experiment, count], index) => {
              const pct = Math.round((count / total) * 100)
              return (
                <div key={experiment}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[11.5px] text-ink/85">{experiment}</span>
                    <span className="font-mono text-[9.5px] text-dim">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full origin-left rounded-full bg-gradient-to-r from-ember to-ember-soft animate-bar"
                      style={{ width: `${pct}%`, animationDelay: `${index * 90}ms` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mono-label">Fuel state split</p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
            {fuels.map(([fuel, count]) => (
              <div
                key={fuel}
                className={cn('h-full animate-bar', toneFor(fuel))}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${fuel}: ${count}`}
              />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {fuels.map(([fuel, count]) => (
              <span key={fuel} className="flex items-center gap-1.5 text-[10.5px] text-muted">
                <span className={cn('size-1.5 rounded-full', toneFor(fuel))} />
                {fuel}
                <span className="font-mono text-[9px] text-dim">{count}</span>
              </span>
            ))}
            {fuels.length === 0 && <span className="text-[10.5px] text-dim">—</span>}
          </div>
        </div>
      </div>

      <footer className="space-y-1.5 border-t border-white/[0.06] bg-white/[0.015] px-5 py-3">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-dim">
          <span>Request</span>
          <span className="text-muted">
            top_k {run.topK} · {run.fuelFilter === 'All' ? 'no fuel filter' : `${run.fuelFilter} only`}
          </span>
        </div>
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-dim">
          <span>Index</span>
          <span className="text-telemetry/80">nasa-combustion-rag</span>
        </div>
      </footer>
    </aside>
  )
}
