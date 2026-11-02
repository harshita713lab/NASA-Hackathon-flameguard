import { useState } from 'react'
import { Check, Copy, Layers, Sparkles, Timer } from 'lucide-react'
import type { SearchRun } from '../types'
import { formatMs } from '../lib/format'
import { extractParameters } from '../lib/highlight'
import { RichText } from '../lib/richText'

export function AnswerPanel({ run }: { run: SearchRun }) {
  const [copied, setCopied] = useState(false)
  const answer = run.response.synthesized_answer?.trim() ?? ''
  const results = run.response.raw_results ?? []

  const parameters = extractParameters(
    [answer, ...results.map((result) => result.text)].join('\n'),
    8,
  )
  const experiments = Array.from(new Set(results.map((result) => result.experiment).filter(Boolean)))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <article className="panel panel-glow flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-gradient-to-r from-ember/[0.06] via-transparent to-transparent px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl border border-ember/25 bg-ember/10">
            <Sparkles className="size-4 text-ember" />
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-white">SI synthesis</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
              <span>Llama 3 · Groq</span>
              <span className="text-white/15">/</span>
              <span>temperature 0.0</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-muted">
            <Timer className="size-3 text-telemetry" />
            {formatMs(run.latencyMs)}
          </span>
          <button
            type="button"
            onClick={copy}
            className="in group inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-muted transition-colors hover:border-ember/30 hover:text-ember-soft"
            aria-label="Copy synthesized answer"
          >
            {copied ? <Check className="size-3.5 text-telemetry" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </header>

      <div className="flex-1 px-5 py-5 sm:px-6 sm:py-6">
        {answer ? (
          <RichText text={answer} />
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            The model returned an empty synthesis for this query. Retry with a more specific question about
            the fuel, oxygen concentration or experiment.
          </p>
        )}

        {parameters.length > 0 && (
          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <p className="mono-label">Numerical parameters detected</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {parameters.map((parameter) => (
                <span
                  key={parameter}
                  className="rounded-md border border-ember/15 bg-ember/[0.06] px-2 py-1 font-mono text-[10.5px] text-ember-soft"
                >
                  {parameter}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.015] px-5 py-3.5 sm:px-6">
        <p className="flex items-center gap-1.5 text-[11px] text-dim">
          <Layers className="size-3.5 text-ember/70" />
          Grounded in {results.length} retrieved {results.length === 1 ? 'passage' : 'passages'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {experiments.map((experiment) => (
            <span
              key={experiment}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted"
            >
              {experiment}
            </span>
          ))}
        </div>
      </footer>
    </article>
  )
}
