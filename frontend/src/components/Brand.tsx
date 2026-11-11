import { cn } from '../lib/format'

function FlameOrbitMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fg-mark-flame" x1="24" y1="10" x2="24" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE3C2" />
          <stop offset="0.42" stopColor="#FFA45E" />
          <stop offset="1" stopColor="#F05A14" />
        </linearGradient>
        <linearGradient id="fg-mark-orbit" x1="4" y1="24" x2="44" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFB35C" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#FFD9A8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#FF7A2F" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <ellipse
        cx="24"
        cy="24"
        rx="19.4"
        ry="7.7"
        transform="rotate(-28 24 24)"
        stroke="url(#fg-mark-orbit)"
        strokeWidth="1.3"
      />
      <ellipse
        cx="24"
        cy="24"
        rx="19.4"
        ry="7.7"
        transform="rotate(32 24 24)"
        stroke="#4FD6C8"
        strokeOpacity="0.28"
        strokeWidth="1"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <circle cx="39.1" cy="13.5" r="1.5" fill="#FFD9A8" />
      <path
        d="M24.6 10.5c1.5 4.8-3 6.4-3 9.8 0 1.6 1 2.8 2.4 2.8 1.9 0 3-1.7 2.9-3.6 2.4 2 4 5 4 8.2 0 4.9-3.7 8.5-8.4 8.5s-8.4-3.7-8.4-8.5c0-6.8 6.3-8.8 10.5-17.2Z"
        fill="url(#fg-mark-flame)"
      />
      <path
        d="M23.8 27.4c.8 2.4-1.5 3.2-1.5 4.9 0 1 .7 1.8 1.8 1.8 1 0 1.9-.9 1.8-2.1 1.4 1.2 2.3 2.9 2.3 4.6 0 2.5-2 4.1-4.2 4.1s-4.2-1.8-4.2-4.3c0-3.6 3.5-5 4-9Z"
        fill="#FFF1DE"
        fillOpacity="0.82"
      />
    </svg>
  )
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-ember/30 bg-gradient-to-br from-ember/25 via-ember/[0.08] to-transparent shadow-[0_0_34px_-8px_rgba(255,122,47,0.75)]">
        <FlameOrbitMark className="size-7" />
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

export function NasaBadge({ className, label = 'NASA Space Apps' }: { className?: string; label?: string }) {
  return (
    <a
      href="https://www.nasa.gov"
      target="_blank"
      rel="noreferrer"
      title="NASA — Space Apps Challenge"
      className={cn(
        'group inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 transition-colors hover:border-white/15 hover:bg-white/[0.04]',
        className,
      )}
    >
      <img
        src="/nasa-logo.png"
        alt=""
        width={24}
        height={24}
        loading="lazy"
        decoding="async"
        className="size-5 shrink-0 object-contain opacity-70 grayscale brightness-125 transition duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-hover:brightness-100"
      />
      <span className="whitespace-nowrap font-mono text-[8.5px] uppercase leading-tight tracking-[0.14em] text-dim transition-colors group-hover:text-muted">
        {label}
      </span>
    </a>
  )
}

export function StackReadout({ compact = false }: { compact?: boolean }) {
  const rows = [
    { label: 'Embed', value: 'all-MiniLM-L6-v2', tone: 'text-signal', dot: 'bg-signal', icon: '01' },
    { label: 'Index', value: 'Pinecone · PSI corpus', tone: 'text-telemetry', dot: 'bg-telemetry', icon: '02' },
    { label: 'Synth', value: 'Llama 3 · Groq LPU', tone: 'text-ember-soft', dot: 'bg-ember-soft', icon: '03' },
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
        {rows.map((row, index) => (
          <div
            key={row.label}
            className="tile-interactive flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 hover:border-ember/20"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[9px] text-dim">{row.icon}</span>
              <span className="text-[11px] font-medium text-muted">{row.label}</span>
            </div>
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn('size-1 shrink-0 rounded-full animate-pulse-soft', row.dot)}
                style={{ animationDelay: `${index * 320}ms` }}
                aria-hidden="true"
              />
              <span className={cn('truncate font-mono text-[10px]', row.tone)}>{row.value}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="relative mt-3.5 h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
        <div className="scan-line absolute inset-y-0 w-1/3 animate-scan rounded-full" />
      </div>

      <p className="mt-2.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
        <span className="size-1 rounded-full bg-telemetry animate-pulse-soft" />
        Deterministic · temperature 0.0
      </p>
    </div>
  )
}
