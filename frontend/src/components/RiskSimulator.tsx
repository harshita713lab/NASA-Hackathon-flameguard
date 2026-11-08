import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Flame, ShieldCheck } from 'lucide-react'
import { cn } from '../lib/format'

const PRESETS = [
  { id: 'ISS', label: 'ISS cabin', o2: 21, pressure: 14.7, detail: '21% O₂ · 14.7 psi', dot: 'bg-telemetry' },
  { id: 'Lunar Base', label: 'Lunar Base', o2: 30, pressure: 10.2, detail: '30% O₂ · 10.2 psi', dot: 'bg-ember' },
  { id: 'Spacesuit EVA', label: 'Spacesuit EVA', o2: 100, pressure: 4.3, detail: '100% O₂ · 4.3 psi', dot: 'bg-violet-400' },
] as const

interface RiskBand {
  label: string
  tone: string
  bar: string
  note: string
}

function flammabilityIndex(o2: number, pressure: number) {
  return Math.pow(o2 / 21, 2) * Math.sqrt(14.7 / pressure)
}

function bandFor(index: number): RiskBand {
  if (index < 0.75) {
    return {
      label: 'Reduced',
      tone: 'text-telemetry',
      bar: 'bg-telemetry',
      note: 'Below the ISS baseline: sustained ignition is harder, but oxygen pockets can still concentrate locally.',
    }
  }
  if (index < 1.25) {
    return {
      label: 'Baseline',
      tone: 'text-ink',
      bar: 'bg-white/60',
      note: 'Comparable to the ISS cabin atmosphere that spacecraft material screening is designed around.',
    }
  }
  if (index < 3) {
    return {
      label: 'Elevated',
      tone: 'text-amber-300',
      bar: 'bg-amber-400',
      note: 'A higher oxygen mole fraction lowers ignition energy; screen materials at this worst case.',
    }
  }
  if (index < 12) {
    return {
      label: 'High',
      tone: 'text-ember',
      bar: 'bg-ember',
      note: 'Well above the ISS baseline; flame spread and ignition risk rise sharply in this regime.',
    }
  }
  return {
    label: 'Severe',
    tone: 'text-rose-400',
    bar: 'bg-rose-500',
    note: 'Pure-oxygen regime near EVA pressure; strict oxygen-compatibility and ignition-source controls are mandatory.',
  }
}

function barPercent(index: number) {
  const clamped = Math.max(index, 0.1)
  return Math.min(100, Math.max(3, ((Math.log10(clamped) + 1) / (Math.log10(50) + 1)) * 100))
}

function formatIndex(value: number) {
  if (value >= 100) return value.toFixed(0)
  if (value >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

export function RiskSimulator() {
  const [o2, setO2] = useState(21)
  const [pressure, setPressure] = useState(14.7)

  const index = flammabilityIndex(o2, pressure)
  const band = bandFor(index)
  const ppO2 = (o2 / 100) * pressure
  const o2Multiple = o2 / 21
  const width = barPercent(index)

  return (
    <section id="risk" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-label flex items-center gap-2 text-telemetry/70">
            <span className="h-px w-5 bg-telemetry/40" />
            Mission risk model
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Flammability simulator
          </h2>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">
            Move the atmosphere sliders to compare a habitat against the ISS baseline. Oxygen concentration
            dominates, while pressure shifts the oxygen partial pressure.
          </p>
        </div>
        <span className="chip border-white/[0.08] text-muted">Relative index · ISS = 1.0</span>
      </div>

      <div className="panel panel-glow mt-4 p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => {
                const active =
                  Math.abs(o2 - preset.o2) < 0.05 && Math.abs(pressure - preset.pressure) < 0.05
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setO2(preset.o2)
                      setPressure(preset.pressure)
                    }}
                    aria-pressed={active}
                    className={cn(
                      'flex flex-1 basis-[calc(50%-0.375rem)] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors sm:basis-auto touch-manipulation',
                      active
                        ? 'border-ember/30 bg-ember/[0.09] text-ember-soft'
                        : 'border-white/[0.07] bg-white/[0.02] text-muted hover:border-white/[0.14] hover:text-ink',
                    )}
                  >
                    <span className={cn('size-1.5 shrink-0 rounded-full', preset.dot)} />
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium">{preset.label}</span>
                      <span className="block truncate font-mono text-[8px] text-dim">{preset.detail}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="sim-o2" className="mono-label">
                  Oxygen concentration
                </label>
                <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-ember-soft">
                  {o2.toFixed(1)}%
                </span>
              </div>
              <input
                id="sim-o2"
                type="range"
                min={10}
                max={100}
                step={0.5}
                value={o2}
                onChange={(event) => setO2(Number(event.target.value))}
                className="range-ember mt-3 w-full"
                style={{ '--range-progress': `${((o2 - 10) / 90) * 100}%` } as CSSProperties}
              />
              <div className="mt-1 flex justify-between font-mono text-[8.5px] text-dim/60">
                <span>10%</span>
                <span>Air 21%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="sim-pressure" className="mono-label">
                  Cabin pressure
                </label>
                <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-telemetry">
                  {pressure.toFixed(1)} psi
                </span>
              </div>
              <input
                id="sim-pressure"
                type="range"
                min={3}
                max={16}
                step={0.1}
                value={pressure}
                onChange={(event) => setPressure(Number(event.target.value))}
                className="range-ember mt-3 w-full"
                style={
                  { '--range-progress': `${((pressure - 3) / 13) * 100}%` } as CSSProperties
                }
              />
              <div className="mt-1 flex justify-between font-mono text-[8.5px] text-dim/60">
                <span>3 psi</span>
                <span>14.7 psi</span>
                <span>16 psi</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-black/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="mono-label">Relative flammability</p>
              <span className={cn('font-mono text-[9px] uppercase tracking-wider', band.tone)}>
                {band.label}
              </span>
            </div>

            <p
              aria-live="polite"
              className={cn('mt-2 font-display text-4xl font-bold tracking-tight', band.tone)}
            >
              {formatIndex(index)}
              <span className="ml-2 font-mono text-[11px] font-normal text-dim">× ISS</span>
            </p>

            <div className="relative mt-4 h-1.5 rounded-full bg-white/[0.07]">
              <div
                className={cn('h-full rounded-full transition-all duration-300', band.bar)}
                style={{ width: `${width}%` }}
              />
              {PRESETS.map((preset) => (
                <span
                  key={preset.id}
                  title={`${preset.label} · ${formatIndex(
                    flammabilityIndex(preset.o2, preset.pressure),
                  )}× ISS`}
                  className={cn(
                    'absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full ring-2 ring-abyss',
                    preset.dot,
                  )}
                  style={{
                    left: `${Math.min(
                      100,
                      Math.max(0, barPercent(flammabilityIndex(preset.o2, preset.pressure))),
                    )}%`,
                  }}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <p className="font-mono text-[8px] uppercase tracking-wider text-dim">
                  O₂ partial pressure
                </p>
                <p className="mt-1 font-mono text-[12px] text-ink">{ppO2.toFixed(2)} psi</p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <p className="font-mono text-[8px] uppercase tracking-wider text-dim">
                  O₂ mole fraction vs air
                </p>
                <p className="mt-1 font-mono text-[12px] text-ink">{o2Multiple.toFixed(2)}×</p>
              </div>
            </div>

            <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-dim">
              <ShieldCheck className="mt-px size-3 shrink-0 text-telemetry/70" />
              {band.note}
            </p>
          </div>
        </div>

        <p className="mt-4 flex items-start gap-1.5 border-t border-white/[0.06] pt-3 text-[9.5px] leading-relaxed text-dim">
          <Flame className="mt-px size-3 shrink-0 text-ember/70" />
          Heuristic screening aid: index = (O₂ / 21)² × √(14.7 / pressure), normalized to the ISS cabin.
          It is not a certified NASA flammability limit — verify against PSI test data.
        </p>
      </div>
    </section>
  )
}
