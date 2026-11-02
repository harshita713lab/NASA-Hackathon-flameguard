import type { BackendState } from '../types'
import { cn } from '../lib/format'

const STYLES: Record<BackendState, { label: string; dot: string; box: string }> = {
  online: {
    label: 'API online',
    dot: 'bg-telemetry shadow-[0_0_10px_rgba(79,214,200,0.8)]',
    box: 'border-telemetry/25 bg-telemetry/[0.07] text-telemetry',
  },
  offline: {
    label: 'API offline',
    dot: 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.85)]',
    box: 'border-rose-400/25 bg-rose-400/[0.07] text-rose-300',
  },
  checking: {
    label: 'Linking…',
    dot: 'bg-muted animate-blink',
    box: 'border-white/10 bg-white/[0.03] text-muted',
  },
}

export function StatusPill({
  state,
  onRefresh,
  className,
}: {
  state: BackendState
  onRefresh?: () => void
  className?: string
}) {
  const style = STYLES[state]

  return (
    <button
      type="button"
      onClick={onRefresh}
      title="Check backend connection"
      className={cn(
        'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-opacity hover:opacity-80',
        style.box,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', style.dot)} />
      {style.label}
    </button>
  )
}
