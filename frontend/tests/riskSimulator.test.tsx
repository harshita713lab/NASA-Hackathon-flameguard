import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RiskSimulator } from '../src/components/RiskSimulator'

function readout(container: HTMLElement) {
  const node = container.querySelector('[aria-live="polite"]')
  expect(node).not.toBeNull()
  return node as HTMLElement
}

describe('RiskSimulator', () => {
  it('defaults to the ISS baseline', () => {
    const { container } = render(<RiskSimulator />)

    expect(readout(container)).toHaveTextContent('1.00')
    expect(screen.getByText('Baseline')).toBeInTheDocument()
    expect(screen.getByText('3.09 psi')).toBeInTheDocument()
    expect(screen.getByText('1.00×')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ISS cabin/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('applies the Lunar Base preset', () => {
    const { container } = render(<RiskSimulator />)

    fireEvent.click(screen.getByRole('button', { name: /Lunar Base/ }))

    expect(readout(container)).toHaveTextContent('2.45')
    expect(screen.getByText('Elevated')).toBeInTheDocument()
    expect(screen.getByText('3.06 psi')).toBeInTheDocument()
    expect(screen.getByText('1.43×')).toBeInTheDocument()
    expect(screen.getByText('30.0%')).toBeInTheDocument()
    expect(screen.getByText('10.2 psi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lunar Base/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('applies the Spacesuit EVA preset and flags the severe band', () => {
    const { container } = render(<RiskSimulator />)

    fireEvent.click(screen.getByRole('button', { name: /Spacesuit EVA/ }))

    expect(readout(container)).toHaveTextContent('41.9')
    expect(screen.getByText('Severe')).toBeInTheDocument()
    expect(screen.getByText('4.30 psi')).toBeInTheDocument()
    expect(screen.getByText('4.76×')).toBeInTheDocument()
    expect(screen.getByText(/Pure-oxygen regime/)).toBeInTheDocument()
  })

  it('updates the index when oxygen concentration changes', () => {
    const { container } = render(<RiskSimulator />)

    fireEvent.change(screen.getByLabelText('Oxygen concentration'), { target: { value: '30' } })

    expect(screen.getByText('30.0%')).toBeInTheDocument()
    expect(readout(container)).toHaveTextContent('2.04')
    expect(screen.getByText('Elevated')).toBeInTheDocument()
  })

  it('updates the index when cabin pressure changes', () => {
    const { container } = render(<RiskSimulator />)

    fireEvent.change(screen.getByLabelText('Cabin pressure'), { target: { value: '10.2' } })

    expect(readout(container)).toHaveTextContent('1.20')
    expect(screen.getByText('Baseline')).toBeInTheDocument()
  })

  it('shows the heuristic disclaimer', () => {
    render(<RiskSimulator />)

    expect(screen.getByText(/Heuristic screening aid/)).toBeInTheDocument()
    expect(screen.getByText(/not a certified NASA flammability limit/)).toBeInTheDocument()
  })
})
