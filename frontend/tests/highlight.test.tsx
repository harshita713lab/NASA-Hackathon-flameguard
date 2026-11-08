import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { extractParameters, highlightTerms, queryTerms } from '../src/lib/highlight'

describe('queryTerms', () => {
  it('drops stop words and short tokens', () => {
    expect(queryTerms('How does flame spread affect PMMA?')).toEqual([
      'flame',
      'spread',
      'affect',
      'pmma',
    ])
  })

  it('deduplicates and caps at six terms', () => {
    const terms = queryTerms('alpha alpha beta gamma delta epsilon zeta eta')
    expect(terms).toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'])
  })
})

describe('highlightTerms', () => {
  it('returns the text unchanged when there are no terms', () => {
    expect(highlightTerms('plain text', [])).toBe('plain text')
  })

  it('wraps matches case-insensitively', () => {
    const { container } = render(<p>{highlightTerms('Flame spread in flame', ['flame'])}</p>)
    expect(container.querySelectorAll('mark')).toHaveLength(2)
    expect(container.textContent).toBe('Flame spread in flame')
  })

  it('escapes regular-expression characters in terms', () => {
    const { container } = render(<p>{highlightTerms('21% oxygen', ['21%'])}</p>)
    expect(container.querySelectorAll('mark')).toHaveLength(1)
  })
})

describe('extractParameters', () => {
  it('finds percentages, pressures and velocities', () => {
    const values = extractParameters('2.2 mm/s at 21% and 14.7 psi, then 3.5 cm/s')
    expect(values).toContain('21%')
    expect(values).toContain('14.7 psi')
    expect(values).toContain('2.2 mm/s')
    expect(values).toContain('3.5 cm/s')
    expect(values).toHaveLength(4)
  })

  it('deduplicates case-insensitively', () => {
    expect(extractParameters('14.7 psi then 14.7 PSI')).toEqual(['14.7 psi'])
  })

  it('honours the limit', () => {
    expect(extractParameters('21% 30% 40%', 2)).toEqual(['21%', '30%'])
  })

  it('returns nothing when no parameters are present', () => {
    expect(extractParameters('no numbers here')).toEqual([])
  })
})
