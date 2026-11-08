import { describe, expect, it } from 'vitest'
import { cn, formatClock, formatMs, formatTimestamp, shortenQuery, uid } from '../src/lib/format'

describe('format helpers', () => {
  it('joins only truthy class names', () => {
    expect(cn('a', false, null, undefined, 'b', '')).toBe('a b')
  })

  it('formats milliseconds and seconds', () => {
    expect(formatMs(0)).toBe('0 ms')
    expect(formatMs(999)).toBe('999 ms')
    expect(formatMs(1000)).toBe('1.0 s')
    expect(formatMs(1550)).toBe('1.6 s')
  })

  it('shortens long queries with an ellipsis', () => {
    expect(shortenQuery('short')).toBe('short')
    expect(shortenQuery('x'.repeat(60))).toHaveLength(47)
    expect(shortenQuery('x'.repeat(60)).endsWith('…')).toBe(true)
    expect(shortenQuery('abcdefghij', 4)).toBe('abcd…')
  })

  it('creates unique ids', () => {
    const a = uid()
    const b = uid()
    expect(a).toContain('-')
    expect(a).not.toBe(b)
  })

  it('formats clock and timestamps', () => {
    expect(formatClock(1700000000000)).toMatch(/\d/)
    expect(formatTimestamp(1700000000000)).toMatch(/\d/)
  })
})
