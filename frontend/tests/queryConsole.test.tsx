import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryConsole } from '../src/components/QueryConsole'
import { EXAMPLES } from '../src/lib/examples'
import type { FuelFilter, MissionFilter, PillarFilter } from '../src/types'

interface Overrides {
  query?: string
  fuel?: FuelFilter
  mission?: MissionFilter
  pillar?: PillarFilter
  topK?: number
  loading?: boolean
}

function setup(overrides: Overrides = {}) {
  const props = {
    query: overrides.query ?? '',
    onQueryChange: vi.fn(),
    fuel: overrides.fuel ?? ('All' as FuelFilter),
    onFuelChange: vi.fn(),
    mission: overrides.mission ?? ('All' as MissionFilter),
    onMissionChange: vi.fn(),
    pillar: overrides.pillar ?? ('All' as PillarFilter),
    onPillarChange: vi.fn(),
    topK: overrides.topK ?? 4,
    onTopKChange: vi.fn(),
    onSubmit: vi.fn(),
    loading: overrides.loading ?? false,
  }
  const view = render(<QueryConsole {...props} />)
  return { ...view, props }
}

describe('QueryConsole', () => {
  it('renders the query, counter and 500-character limit', () => {
    setup({ query: 'PMMA flame' })

    const textarea = screen.getByLabelText('Research query')
    expect(textarea).toHaveValue('PMMA flame')
    expect(textarea).toHaveAttribute('maxlength', '500')
    expect(screen.getByText('10/500')).toBeInTheDocument()
  })

  it('keeps run disabled until a query is entered', () => {
    setup()
    expect(screen.getByRole('button', { name: /Run analysis/ })).toBeDisabled()
  })

  it('submits through the run button', () => {
    const { props } = setup({ query: 'How does flame spread in microgravity?' })

    fireEvent.click(screen.getByRole('button', { name: /Run analysis/ }))
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits on Ctrl+Enter but not on plain Enter', () => {
    const { props } = setup({ query: 'How does flame spread in microgravity?' })
    const textarea = screen.getByLabelText('Research query')

    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(props.onSubmit).not.toHaveBeenCalled()

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows the loading state and blocks submission', () => {
    const { props } = setup({ query: 'valid question', loading: true })

    expect(screen.getByRole('button', { name: /Synthesizing/ })).toBeDisabled()
    fireEvent.keyDown(screen.getByLabelText('Research query'), { key: 'Enter', metaKey: true })
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('reports mission selection', () => {
    const { props } = setup()

    fireEvent.click(screen.getByRole('button', { name: /Lunar Base/ }))
    expect(props.onMissionChange).toHaveBeenCalledWith('Lunar Base')
  })

  it('reflects the active mission', () => {
    setup({ mission: 'Spacesuit EVA' })

    expect(screen.getByRole('button', { name: /Spacesuit EVA/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^ISS/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports pillar selection', () => {
    const { props } = setup()

    fireEvent.click(screen.getByRole('button', { name: /Suppression/ }))
    expect(props.onPillarChange).toHaveBeenCalledWith('Suppression')
  })

  it('reports fuel selection', () => {
    const { props } = setup()

    fireEvent.click(screen.getByRole('button', { name: /^Liquid$/ }))
    expect(props.onFuelChange).toHaveBeenCalledWith('Liquid')
  })

  it('reports top_k changes', () => {
    const { props } = setup()

    fireEvent.change(screen.getByLabelText('Number of passages to retrieve'), { target: { value: '7' } })
    expect(props.onTopKChange).toHaveBeenCalledWith(7)
    expect(screen.getByText('04')).toBeInTheDocument()
  })

  it('fills the query from an example', () => {
    const { props } = setup()

    fireEvent.click(screen.getByRole('button', { name: EXAMPLES[0] }))
    expect(props.onQueryChange).toHaveBeenCalledWith(EXAMPLES[0])
  })

  it('shows guidance to verify cited sources', () => {
    setup()
    expect(screen.getByText(/Always verify the cited source text/)).toBeInTheDocument()
  })
})
