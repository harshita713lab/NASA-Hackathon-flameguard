import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  ZoomIn,
} from 'lucide-react'
import type { SearchRun, SectionApiId } from '../types'
import type { MissionSection, SectionImage } from '../data/missionSections'
import { MISSION_SECTIONS, getMissionSection } from '../data/missionSections'
import {
  SECTION_QUERY_MAX,
  SECTION_QUERY_MIN,
  normalizeQuery,
  runSectionSearch,
} from '../lib/api'
import { cn, formatMs, uid } from '../lib/format'
import { AnswerPanel } from './AnswerPanel'
import { EvidenceLedger } from './EvidenceLedger'
import { ImageLightbox } from './ImageLightbox'

interface SectionSession {
  query: string
  topK: number
  loading: boolean
  error: string | null
  run: SearchRun | null
}

interface MissionArchivesProps {
  onRunComplete: (run: SearchRun) => void
  seed: SearchRun | null
  onOpenConsole: () => void
}

const TOP_K_OPTIONS = [4, 6, 8]

const ACCENT_DOT: Record<MissionSection['accent'], string> = {
  telemetry: 'bg-telemetry',
  ember: 'bg-ember',
  signal: 'bg-signal',
  violet: 'bg-violet-400',
}

const ACCENT_CARD: Record<MissionSection['accent'], string> = {
  telemetry: 'border-telemetry/35 bg-telemetry/[0.07]',
  ember: 'border-ember/35 bg-ember/[0.07]',
  signal: 'border-signal/35 bg-signal/[0.07]',
  violet: 'border-violet-400/35 bg-violet-400/[0.07]',
}

const ACCENT_TEXT: Record<MissionSection['accent'], string> = {
  telemetry: 'text-telemetry',
  ember: 'text-ember-soft',
  signal: 'text-signal',
  violet: 'text-violet-300',
}

const ACCENT_CHIP: Record<MissionSection['accent'], string> = {
  telemetry: 'border-telemetry/25 bg-telemetry/[0.06] text-telemetry',
  ember: 'border-ember/25 bg-ember/[0.06] text-ember-soft',
  signal: 'border-signal/25 bg-signal/[0.06] text-signal',
  violet: 'border-violet-400/25 bg-violet-400/[0.06] text-violet-300',
}

function createSession(): SectionSession {
  return { query: '', topK: 4, loading: false, error: null, run: null }
}

function createSessions(seed: SearchRun | null): Record<SectionApiId, SectionSession> {
  const sessions = MISSION_SECTIONS.reduce(
    (acc, section) => {
      acc[section.apiSection] = createSession()
      return acc
    },
    {} as Record<SectionApiId, SectionSession>,
  )

  if (seed?.section) {
    sessions[seed.section] = {
      query: seed.query,
      topK: seed.topK,
      loading: false,
      error: null,
      run: seed,
    }
  }

  return sessions
}

function sectionQueryId(section: SectionApiId) {
  return `archive-query-${section.toLowerCase().replace(/\s+/g, '-')}`
}

function SourcePill({ source }: { source?: string | null }) {
  if (!source) return null
  const fallback = source.toLowerCase().includes('fallback')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]',
        fallback
          ? 'border-ember/30 bg-ember/[0.08] text-ember-soft'
          : 'border-telemetry/25 bg-telemetry/[0.07] text-telemetry',
      )}
    >
      {fallback ? <AlertTriangle className="size-2.5" /> : <CheckCircle2 className="size-2.5" />}
      {source}
    </span>
  )
}

export function MissionArchives({ onRunComplete, seed, onOpenConsole }: MissionArchivesProps) {
  const [activeId, setActiveId] = useState<SectionApiId>(seed?.section ?? 'Combustion Science')
  const [sessions, setSessions] = useState<Record<SectionApiId, SectionSession>>(() =>
    createSessions(seed),
  )
  const [lightbox, setLightbox] = useState<SectionImage | null>(null)
  const controllers = useRef<Partial<Record<SectionApiId, AbortController>>>({})

  const active = sessions[activeId]
  const section = getMissionSection(activeId)

  const collapsed = useMemo(() => normalizeQuery(active.query), [active.query])
  const tooShort = collapsed.length > 0 && collapsed.length < SECTION_QUERY_MIN
  const canSubmit =
    collapsed.length >= SECTION_QUERY_MIN &&
    collapsed.length <= SECTION_QUERY_MAX &&
    !active.loading

  const patch = useCallback((id: SectionApiId, changes: Partial<SectionSession>) => {
    setSessions((prev) => ({ ...prev, [id]: { ...prev[id], ...changes } }))
  }, [])

  useEffect(() => {
    return () => {
      Object.values(controllers.current).forEach((controller) => controller?.abort())
      controllers.current = {}
    }
  }, [])

  const execute = useCallback(
    async (id: SectionApiId, rawQuery: string, topK: number) => {
      const cleaned = normalizeQuery(rawQuery)
      if (cleaned.length < SECTION_QUERY_MIN || cleaned.length > SECTION_QUERY_MAX) return

      controllers.current[id]?.abort()
      const controller = new AbortController()
      controllers.current[id] = controller

      patch(id, { loading: true, error: null, query: rawQuery, topK, run: null })
      const started = performance.now()

      try {
        const response = await runSectionSearch(id, cleaned, topK, controller.signal)
        const record: SearchRun = {
          id: uid(),
          query: cleaned,
          fuelFilter: 'All',
          mission: 'All',
          pillar: 'All',
          topK,
          section: id,
          response,
          latencyMs: performance.now() - started,
          createdAt: Date.now(),
        }
        patch(id, { loading: false, error: null, run: record })
        onRunComplete(record)
      } catch (error) {
        if (controller.signal.aborted) return
        patch(id, {
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'The section-scoped analysis was interrupted.',
        })
      } finally {
        if (controllers.current[id] === controller) delete controllers.current[id]
      }
    },
    [onRunComplete, patch],
  )

  const clearSession = () => {
    controllers.current[activeId]?.abort()
    patch(activeId, { query: '', loading: false, error: null, run: null })
  }

  const runPrompt = (prompt: string) => {
    patch(activeId, { query: prompt })
    void execute(activeId, prompt, active.topK)
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    void execute(activeId, active.query, active.topK)
  }

  const run = active.run
  const passages = run?.response.raw_results.length ?? 0

  return (
    <section id="archives" className="scroll-mt-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl animate-rise">
          <div className="flex items-center gap-2.5">
            <span className="h-px w-7 bg-gradient-to-r from-telemetry to-transparent" />
            <p className="mono-label text-telemetry/80">Mission &amp; event archives</p>
          </div>
          <h1 className="mt-3 font-display text-[clamp(1.6rem,5vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.02em] text-white">
            Four failures.
            <br />
            <span className="bg-gradient-to-r from-telemetry via-signal to-ember-soft bg-clip-text text-transparent">
              Four safety legacies.
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted sm:text-sm">
            Each dossier is locked to one corpus section, so retrieval cannot blend Apollo 13 oxygen
            fires with Mir oxygen-candle burns. Inspect the archival figures, then interrogate only
            that section's passages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 animate-rise">
          <span className="chip border-white/[0.08] py-1 text-[10px] text-muted">
            Section-scoped RAG
          </span>
          <span className="chip border-white/[0.08] py-1 text-[10px] text-muted">4 dossiers</span>
          <button type="button" onClick={onOpenConsole} className="btn-ghost py-1.5 text-[10.5px] touch-manipulation">
            Open console
            <ArrowUpRight className="size-3" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 lg:grid-cols-4">
        {MISSION_SECTIONS.map((item, index) => {
          const isActive = item.apiSection === activeId
          return (
            <button
              key={item.apiSection}
              type="button"
              onClick={() => setActiveId(item.apiSection)}
              aria-pressed={isActive}
              className={cn(
                'group relative overflow-hidden rounded-xl border px-3 py-3 text-left transition-colors sm:px-4 sm:py-3.5 touch-manipulation',
                isActive
                  ? ACCENT_CARD[item.accent]
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.035]',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] tracking-[0.16em] text-dim">
                  0{index + 1}
                </span>
                <span className={cn('size-1.5 rounded-full', ACCENT_DOT[item.accent], !isActive && 'opacity-60')} />
              </div>
              <p
                className={cn(
                  'mt-2 truncate font-display text-[13px] font-semibold tracking-tight sm:text-sm',
                  isActive ? 'text-white' : 'text-ink/80 group-hover:text-ink',
                )}
              >
                {item.displayTitle}
              </p>
              <p className="mt-0.5 truncate font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim">
                {item.eraTag}
              </p>
              {item.apiSection === 'Combustion Science' && (
                <span className="absolute right-2 top-2 rounded-full border border-telemetry/30 bg-telemetry/[0.08] px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-telemetry lg:hidden">
                  ISS
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:mt-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start">
        <article key={section.apiSection} className="panel animate-rise overflow-hidden">
          <header className="border-b border-white/[0.06] px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]',
                  ACCENT_CHIP[section.accent],
                )}
              >
                {section.apiSection}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
                {section.eraTag}
              </span>
            </div>
            <h2 className="mt-2.5 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {section.displayTitle}
            </h2>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
              {section.system}
            </p>
          </header>

          <div className="px-4 py-4 sm:px-5">
            <p className="mono-label">Mission briefing</p>
            <ul className="mt-2.5 space-y-2">
              {section.summaryBullets.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-[12.5px] leading-relaxed text-muted">
                  <span
                    className={cn('mt-[7px] size-1 shrink-0 rounded-full', ACCENT_DOT[section.accent])}
                    aria-hidden="true"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {section.keyMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
                >
                  <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
                    {metric.label}
                  </p>
                  <p
                    className={cn(
                      'mt-1 font-display text-[15px] font-semibold leading-none tracking-tight',
                      ACCENT_TEXT[section.accent],
                    )}
                  >
                    {metric.value}
                  </p>
                  <p className="mt-1 font-mono text-[8px] leading-relaxed text-dim/80">
                    {metric.note}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06] px-4 py-3.5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <p className="mono-label">
                Archival figures · {section.images.length}
              </p>
              <span className="font-mono text-[8px] uppercase tracking-wider text-dim/70">
                Click to zoom
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {section.images.map((image) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => setLightbox(image)}
                  aria-label={`Open figure: ${image.figureLabel}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-white/[0.08] bg-black/40 touch-manipulation"
                >
                  <img
                    src={image.src}
                    alt={image.caption}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover brightness-90 transition duration-500 group-hover:scale-[1.05] group-hover:brightness-105"
                  />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/85 via-void/10 to-transparent" />
                  <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 truncate font-mono text-[7.5px] uppercase tracking-[0.08em] text-white/85">
                    {image.figureLabel}
                  </span>
                  <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/55 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <ZoomIn className="size-3 text-white" />
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[8px] uppercase leading-relaxed tracking-[0.08em] text-dim/70">
              Credits: NASA · archival source listed with each figure
            </p>
          </div>
        </article>

        <div className="min-w-0 space-y-4">
          <article className="panel panel-glow p-3.5 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mono-label">Section-scoped query</p>
                <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-dim">
                  POST /api/search · section = “{section.apiSection}”
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-dim">
                {run ? 'Cached' : 'New'}
              </span>
            </div>

            <label htmlFor={sectionQueryId(activeId)} className="sr-only">
              Research query for {section.displayTitle}
            </label>
            <div className="field-shell mt-2.5 px-3 py-2.5">
              <textarea
                id={sectionQueryId(activeId)}
                value={active.query}
                onChange={(event) => patch(activeId, { query: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                rows={3}
                maxLength={SECTION_QUERY_MAX}
                placeholder={`Ask about ${section.displayTitle}…`}
                className="w-full resize-none bg-transparent text-base leading-relaxed text-ink placeholder:text-dim/70 focus:outline-none sm:text-[14px]"
              />
              <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[8.5px] uppercase tracking-wider">
                <span
                  className={cn(
                    'flex min-w-0 items-center gap-1.5 truncate',
                    tooShort ? 'text-ember-soft' : 'text-dim/70',
                  )}
                >
                  <TerminalSquare className="size-3 shrink-0" />
                  <span className="truncate">
                    {tooShort
                      ? `Minimum ${SECTION_QUERY_MIN} non-space characters`
                      : 'Natural language query'}
                  </span>
                </span>
                <span className={cn('shrink-0', tooShort ? 'text-ember-soft' : 'text-dim/70')}>
                  {collapsed.length}/{SECTION_QUERY_MAX}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <p className="mono-label">Starter prompts</p>
              <div className="mt-1.5 space-y-1.5">
                {section.starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => runPrompt(prompt)}
                    disabled={active.loading}
                    className="group flex w-full items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-left text-[11px] leading-snug text-muted transition-colors hover:border-ember/30 hover:bg-ember/[0.05] hover:text-ember-soft disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    <Sparkles className="mt-0.5 size-3 shrink-0 text-ember/70" />
                    <span className="min-w-0 flex-1">{prompt}</span>
                    <ArrowUpRight className="mt-0.5 size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3.5 flex flex-col gap-3 border-t border-white/[0.06] pt-3.5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="mono-label">Passages · top_k</p>
                  <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] text-ember-soft">
                    {String(active.topK).padStart(2, '0')}
                  </span>
                </div>
                <div className="mt-1.5 flex w-fit rounded-lg border border-white/10 bg-black/25 p-0.5">
                  {TOP_K_OPTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => patch(activeId, { topK: value })}
                      aria-pressed={active.topK === value}
                      className={cn(
                        'rounded-md px-3 py-1 font-mono text-[10.5px] transition-colors touch-manipulation',
                        active.topK === value
                          ? 'bg-ember/[0.13] text-ember-soft ring-1 ring-inset ring-ember/25'
                          : 'text-dim hover:text-ink',
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(active.query || run || active.error) && !active.loading && (
                  <button
                    type="button"
                    onClick={clearSession}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 font-mono text-[9px] uppercase tracking-wider text-dim transition-colors hover:text-ink touch-manipulation"
                  >
                    <RotateCcw className="size-3" />
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="btn-ember flex-1 justify-center sm:flex-none touch-manipulation"
                >
                  {active.loading ? (
                    <>
                      <Loader2 className="size-4 shrink-0 animate-spin" />
                      Retrieving…
                    </>
                  ) : (
                    <>
                      Run scoped query
                      <ArrowUpRight className="size-4 shrink-0" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-dim">
              <ShieldCheck className="mt-px size-3 shrink-0 text-telemetry/70" />
              Global environment, mission, pillar and fuel filters are sent as null so only the
              section filter is applied.
            </p>

            {run && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <SourcePill source={run.response.active_source} />
                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {passages} {passages === 1 ? 'passage' : 'passages'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  top_k {run.topK}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {formatMs(run.latencyMs)}
                </span>
              </div>
            )}

            {run?.response.is_safe === false && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] p-2.5 text-[11px] leading-relaxed text-rose-200">
                <ShieldAlert className="mt-px size-3.5 shrink-0" />
                Guardrail flagged this answer as unsafe (is_safe = false). Treat the synthesis as
                unverified and inspect the source passages below.
              </div>
            )}

            {active.error && (
              <div className="mt-3 rounded-lg border border-ember/25 bg-ember/[0.07] p-3">
                <p className="text-[11.5px] leading-relaxed text-ember-soft">{active.error}</p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-ember-soft hover:underline"
                >
                  <RotateCcw className="size-3" />
                  Retry section query
                </button>
              </div>
            )}

            {active.loading && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <Loader2 className="size-3.5 animate-spin text-telemetry" />
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  Retrieving {section.apiSection} passages…
                </p>
              </div>
            )}
          </article>

          {run && (
            <div className="animate-rise">
              <AnswerPanel run={run} />
            </div>
          )}
        </div>
      </div>

      {run && (
        <div className="mt-4 animate-rise sm:mt-5">
          <EvidenceLedger key={run.id} run={run} />
        </div>
      )}

      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </section>
  )
}
