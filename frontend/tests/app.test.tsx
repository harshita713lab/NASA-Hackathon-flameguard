import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runSearchMock, checkBackendMock } = vi.hoisted(() => ({
  runSearchMock: vi.fn(),
  checkBackendMock: vi.fn(),
}))

vi.mock('../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/api')>()
  return {
    ...actual,
    runSearch: (...args: unknown[]) => runSearchMock(...args),
    checkBackend: (...args: unknown[]) => checkBackendMock(...args),
    backendLabel: 'http://127.0.0.1:8000',
    docsUrl: 'http://127.0.0.1:8000/docs',
  }
})

import App from '../src/App'
import type { SearchResponse } from '../src/types'

const response: SearchResponse = {
  synthesized_answer: 'Grounded synthesis of the lunar flame data.',
  raw_results: [
    {
      text: 'Lunar habitats run at 30-34 percent oxygen and 10.2 psi.',
      experiment: 'Lunar Base',
      fuel_state: 'Mixed',
      source: 'challenge brief',
      pillar: 'Prevention',
      environments: ['Lunar Base'],
      citation: 'NASA brief',
    },
  ],
}

function consoleSection() {
  const section = document.getElementById('console')
  expect(section).not.toBeNull()
  return within(section as HTMLElement)
}

beforeEach(() => {
  runSearchMock.mockReset()
  checkBackendMock.mockReset()
  checkBackendMock.mockResolvedValue(true)
})

describe('App', () => {
  it('renders the console, simulator and idle guidance', async () => {
    render(<App />)

    expect(consoleSection().getByRole('heading', { level: 1 }).textContent).toContain('Ask the archive.')
    expect(screen.getByRole('heading', { name: 'Flammability simulator' })).toBeInTheDocument()
    expect(await screen.findByText('Four ways into the corpus')).toBeInTheDocument()
  })

  it('runs a filtered analysis and renders the evidence trail', async () => {
    runSearchMock.mockResolvedValue(response)
    render(<App />)

    const console = consoleSection()
    fireEvent.click(console.getByRole('button', { name: /Lunar Base/ }))
    fireEvent.click(console.getByRole('button', { name: /^Detection/ }))
    fireEvent.click(console.getByRole('button', { name: /^Solid$/ }))
    fireEvent.change(screen.getByLabelText('Research query'), {
      target: { value: 'lunar flame spread question' },
    })
    fireEvent.click(console.getByRole('button', { name: /Run analysis/ }))

    expect(await screen.findByText('Grounded synthesis of the lunar flame data.')).toBeInTheDocument()
    expect(screen.getByText('Analysis complete')).toBeInTheDocument()
    expect(screen.getByText('Evidence trail')).toBeInTheDocument()
    expect(screen.getAllByText('Lunar Base').length).toBeGreaterThan(0)

    expect(runSearchMock).toHaveBeenCalledTimes(1)
    const [query, fuel, mission, pillar, topK] = runSearchMock.mock.calls[0]
    expect(query).toBe('lunar flame spread question')
    expect(fuel).toBe('Solid')
    expect(mission).toBe('Lunar Base')
    expect(pillar).toBe('Detection')
    expect(topK).toBe(4)
  })

  it('shows an error state when the run fails', async () => {
    runSearchMock.mockRejectedValue(new Error('Backend exploded'))
    render(<App />)

    fireEvent.change(screen.getByLabelText('Research query'), {
      target: { value: 'lunar flame spread question' },
    })
    fireEvent.click(consoleSection().getByRole('button', { name: /Run analysis/ }))

    expect(await screen.findByText('Backend exploded')).toBeInTheDocument()
    expect(screen.getByText('Analysis interrupted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Retry analysis/ })).toBeInTheDocument()
  })
})
