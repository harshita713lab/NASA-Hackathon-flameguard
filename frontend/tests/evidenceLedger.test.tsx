import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EvidenceLedger } from '../src/components/EvidenceLedger'
import type { SearchRun } from '../src/types'

export function makeRun(overrides: Partial<SearchRun> = {}): SearchRun {
  return {
    id: 'run-1',
    query: 'PMMA flame spread',
    fuelFilter: 'Solid',
    mission: 'Lunar Base',
    pillar: 'Detection',
    topK: 3,
    latencyMs: 1234,
    createdAt: 1700000000000,
    response: {
      synthesized_answer: 'Synthesis',
      raw_results: [
        {
          text: 'Flame spread was 2.2 mm/s in microgravity.',
          experiment: 'BASS-II',
          fuel_state: 'Solid',
          source: 'BASS.pdf',
          pillar: 'Prevention',
          environments: ['ISS'],
          citation: 'TM-1',
        },
        {
          text: 'Inert gas suppression extinguished droplets.',
          experiment: 'FLEX',
          fuel_state: 'Liquid',
          source: 'FLEX.pdf',
          pillar: 'Suppression',
          environments: ['ISS'],
          citation: null,
        },
        {
          text: 'Smoke detection used ionization sensors.',
          experiment: 'SAME',
          fuel_state: 'Mixed',
          source: 'SAME.pdf',
          pillar: null,
          environments: [],
          citation: null,
        },
      ],
    },
    ...overrides,
  }
}

describe('EvidenceLedger', () => {
  it('summarizes the passages and experiments', () => {
    const { container } = render(<EvidenceLedger run={makeRun()} />)

    expect(container.textContent).toContain('3 passages')
    expect(container.textContent).toContain('3 experiments')
    expect(screen.getAllByText('ISS')).toHaveLength(2)
  })

  it('renders fuel and pillar badges', () => {
    render(<EvidenceLedger run={makeRun()} />)

    expect(screen.getAllByText('Solid').length).toBeGreaterThan(0)
    expect(screen.getByText('Prevention')).toBeInTheDocument()
    expect(screen.getByText('Suppression')).toBeInTheDocument()
  })

  it('filters passages by fuel state', () => {
    render(<EvidenceLedger run={makeRun()} />)

    fireEvent.click(screen.getByRole('button', { name: /^Liquid/ }))

    expect(screen.getByText('1/3 shown')).toBeInTheDocument()
    expect(screen.getByText('FLEX')).toBeInTheDocument()
    expect(screen.queryByText('BASS-II')).not.toBeInTheDocument()
  })

  it('returns to all passages after filtering', () => {
    render(<EvidenceLedger run={makeRun()} />)

    fireEvent.click(screen.getByRole('button', { name: /^Liquid/ }))
    fireEvent.click(screen.getByRole('button', { name: /^All/ }))

    expect(screen.getByText('3/3 shown')).toBeInTheDocument()
    expect(screen.getByText('BASS-II')).toBeInTheDocument()
  })

  it('switches to the table view', () => {
    render(<EvidenceLedger run={makeRun()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))

    expect(screen.getByRole('table')).toBeInTheDocument()
    for (const header of ['Experiment', 'Fuel', 'Pillar', 'Source', 'Passage excerpt']) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button', { name: /Inspect/ })).toHaveLength(3)
  })

  it('expands a card to show the full passage', () => {
    render(<EvidenceLedger run={makeRun()} />)

    fireEvent.click(screen.getAllByRole('button', { name: /Read all/ })[0])

    expect(screen.getByText('Flame spread was 2.2 mm/s in microgravity.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Less/ })).toBeInTheDocument()
  })

  it('renders the empty state and disables export', () => {
    const run = makeRun()
    run.response.raw_results = []
    render(<EvidenceLedger run={run} />)

    expect(screen.getByText('No passages were returned')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export evidence as JSON' })).toBeDisabled()
  })

  it('copies a passage to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<EvidenceLedger run={makeRun()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy passage 01' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toContain('BASS-II')
    expect(copied).toContain('BASS.pdf')
    expect(copied).toContain('Flame spread was 2.2 mm/s')
  })

  it('exports the run as JSON', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<EvidenceLedger run={makeRun()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export evidence as JSON' }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as Blob
    const body = JSON.parse(await blob.text())
    expect(body.query).toBe('PMMA flame spread')
    expect(body.mission).toBe('Lunar Base')
    expect(body.pillar).toBe('Detection')
    expect(body.top_k).toBe(3)
    expect(body.raw_results).toHaveLength(3)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
