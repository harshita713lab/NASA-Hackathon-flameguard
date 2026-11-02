import { Flame } from 'lucide-react'
import { cn } from '../lib/format'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-ember/30 bg-gradient-to-br from-ember/25 via-ember/[0.08] to-transparent shadow-[0_0_34px_-8px_rgba(255,122,47,0.75)]">
        <Flame className="size-5 text-ember" strokeWidth={1.8} />
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/[0.06] ring-inset" />
      </div>
      {!compact && (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[15px] font-bold tracking-[0.14em] text-white">FLAMEGUARD</span>
            <span className="rounded border border-ember/35 bg-ember/10 px-1 py-px font-mono text-[8px] tracking-wider text-ember-soft">
              SI
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
            Microgravity fire safety
          </p>
        </div>
      )}
    </div>
  )
}

export function StackReadout({ compact = false }: { compact?: boolean }) {
  const rows = [
    { label: 'Embed', value: 'all-MiniLM-L6-v2', tone: 'text-signal', icon: '01' },
    { label: 'Index', value: 'Pinecone · PSI corpus', tone: 'text-telemetry', icon: '02' },
    { label: 'Synth', value: 'Llama 3 · Groq LPU', tone: 'text-ember-soft', icon: '03' },
  ]

  return (
    <div className={cn('panel panel-glow overflow-hidden p-4', compact ? 'w-full' : 'w-[292px]')}>
      <div className="flex items-center justify-between">
        <span className="mono-label">Pipeline readout</span>
        <span className="flex items-end gap-[2px]" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-3 w-[3px] origin-bottom rounded-full bg-ember/70 animate-equalize"
              style={{ animationDelay: `${i * 130}ms` }}
            />
          ))}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[9px] text-dim">{row.icon}</span>
              <span className="text-[11px] font-medium text-muted">{row.label}</span>
            </div>
            <span className={cn('truncate font-mono text-[10px]', row.tone)}>{row.value}</span>
          </div>
        ))}
      </div>

      <p className="mt-3.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
        <span className="size-1 rounded-full bg-telemetry animate-pulse-soft" />
        Deterministic · temperature 0.0
      </p>
    </div>
  )
}
