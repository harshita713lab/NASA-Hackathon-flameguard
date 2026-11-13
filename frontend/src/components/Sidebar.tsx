import {
  Archive,
  BookOpen,
  Clock3,
  FileSearch,
  LayoutDashboard,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import type { BackendState, SearchRun } from '../types'
import { cn, formatClock, shortenQuery } from '../lib/format'
import { Logo } from './Brand'
import { StatusPill } from './StatusPill'

interface SidebarProps {
  open: boolean
  onClose: () => void
  history: SearchRun[]
  activeId: string | null
  onSelectRun: (run: SearchRun) => void
  onDeleteRun: (id: string) => void
  onClearHistory: () => void
  backend: BackendState
  backendUrl: string
  docsUrl: string
  onRefreshBackend: () => void
  onJump: (target: 'evidence') => void
  onOpenConsole: () => void
  onOpenArchives: () => void
  activeView: 'console' | 'archives'
  hasEvidence: boolean
}

export function Sidebar({
  open,
  onClose,
  history,
  activeId,
  onSelectRun,
  onDeleteRun,
  onClearHistory,
  backend,
  backendUrl,
  docsUrl,
  onRefreshBackend,
  onJump,
  onOpenConsole,
  onOpenArchives,
  activeView,
  hasEvidence,
}: SidebarProps) {
  const navItems = [
    {
      label: 'Query console',
      icon: LayoutDashboard,
      onClick: onOpenConsole,
      active: activeView === 'console',
      disabled: false,
      isNew: false,
    },
    {
      label: 'Mission archives',
      icon: Archive,
      onClick: onOpenArchives,
      active: activeView === 'archives',
      disabled: false,
      isNew: true,
    },
    {
      label: 'Evidence ledger',
      icon: FileSearch,
      onClick: () => hasEvidence && onJump('evidence'),
      active: false,
      disabled: !hasEvidence,
      isNew: false,
    },
  ]

  return (
    <aside
      id="primary-sidebar"
      aria-label="Primary navigation"
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[min(285px,86vw)] sm:w-[278px] flex-col border-r border-white/[0.07] bg-abyss/95 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 sm:px-5 py-4 sm:py-5">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 p-2 text-muted transition-colors hover:text-white touch-manipulation lg:hidden"
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-3 pt-5">
        <p className="px-2 mono-label">Workspace</p>
        <nav className="mt-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.onClick()
                onClose()
              }}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
                item.active
                  ? 'border border-white/[0.06] bg-white/[0.04] text-white'
                  : 'text-muted hover:bg-white/[0.03] hover:text-ink',
                item.disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-muted',
              )}
            >
              <item.icon className="size-4 text-dim group-hover:text-ember-soft" />
              {item.label}
              {item.isNew && (
                <span className="ml-auto rounded border border-telemetry/25 bg-telemetry/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-telemetry">
                  New
                </span>
              )}
              {item.label === 'Evidence ledger' && hasEvidence && (
                <span className="ml-auto size-1.5 rounded-full bg-ember/80" />
              )}
            </button>
          ))}
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-muted transition-colors hover:bg-white/[0.03] hover:text-ink"
          >
            <BookOpen className="size-4 text-dim group-hover:text-ember-soft" />
            API reference
            <span className="ml-auto font-mono text-[9px] text-dim">/docs</span>
          </a>
        </nav>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
        <div className="flex items-center justify-between px-2">
          <p className="mono-label">Recent runs</p>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="font-mono text-[9px] uppercase tracking-wider text-dim transition-colors hover:text-rose-300"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4 pr-1">
          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center">
              <Clock3 className="mx-auto size-4 text-dim" />
              <p className="mt-2 text-[11px] leading-relaxed text-dim">
                Your analyses will appear here for quick recall.
              </p>
            </div>
          ) : (
            history.map((run) => (
              <div key={run.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    onSelectRun(run)
                    onClose()
                  }}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2.5 pr-9 text-left transition-colors',
                    activeId === run.id
                      ? 'border-ember/25 bg-ember/[0.07]'
                      : 'border-transparent hover:border-white/[0.07] hover:bg-white/[0.03]',
                  )}
                >
                  {run.section && (
                    <span className="mb-1 inline-flex rounded border border-ember/20 bg-ember/[0.06] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-ember-soft">
                      [{run.section}]
                    </span>
                  )}
                  <p className="line-clamp-2 text-[12px] leading-snug text-ink/85">{shortenQuery(run.query, 64)}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-dim">
                    <span>{formatClock(run.createdAt)}</span>
                    <span className="text-white/15">/</span>
                    <span>{run.section ?? run.fuelFilter}</span>
                    <span className="text-white/15">/</span>
                    <span>k={run.topK}</span>
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRun(run.id)}
                  aria-label={`Delete run: ${run.query}`}
                  className="absolute right-1.5 top-2 rounded-md p-1.5 text-dim opacity-100 transition-all hover:bg-white/[0.06] hover:text-rose-300 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between">
            <p className="mono-label">API link</p>
            <StatusPill state={backend} onRefresh={onRefreshBackend} />
          </div>
          <p className="mt-3 truncate font-mono text-[10px] text-muted" title={backendUrl}>
            {backendUrl}
          </p>
          <button
            type="button"
            onClick={onRefreshBackend}
            className="mt-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-dim transition-colors hover:text-telemetry"
          >
            <RefreshCw className="size-3" />
            Re-check connection
          </button>
        </div>
        <p className="mt-2 px-1 text-center font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.12em] text-dim/70">
          Space Apps Challenge · PSI microgravity fire safety
        </p>
      </div>
    </aside>
  )
}
