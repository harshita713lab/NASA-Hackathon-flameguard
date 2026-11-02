import type { ReactNode } from 'react'

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'how',
  'does',
  'did',
  'what',
  'when',
  'where',
  'which',
  'that',
  'this',
  'these',
  'those',
  'from',
  'into',
  'during',
  'between',
  'about',
  'are',
  'was',
  'were',
  'been',
  'being',
  'has',
  'have',
  'had',
  'can',
  'could',
  'would',
  'should',
  'under',
  'over',
  'than',
  'then',
  'also',
  'more',
  'most',
  'some',
  'such',
  'there',
  'their',
  'they',
  'its',
  'our',
  'you',
  'your',
])

export function queryTerms(query: string): string[] {
  const seen = new Set<string>()
  return query
    .toLowerCase()
    .split(/[^a-z0-9%°]+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    .filter((word) => {
      if (seen.has(word)) return false
      seen.add(word)
      return true
    })
    .slice(0, 6)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightTerms(text: string, terms: string[]): ReactNode {
  if (!terms.length) return text
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)
  if (parts.length === 1) return text

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="query-hit">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

const PARAMETER_PATTERNS = [
  /\b\d+(?:\.\d+)?\s?%/g,
  /\b\d+(?:\.\d+)?\s?(?:kPa|hPa|Pa|atm|bar|psi)\b/gi,
  /\b\d+(?:\.\d+)?\s?(?:mm\/s|cm\/s|m\/s)\b/gi,
  /\b\d+(?:\.\d+)?\s?°C\b/g,
  /\b\d+(?:\.\d+)?\s?K\b/g,
  /\b\d+(?:\.\d+)?\s?ppm\b/gi,
]

export function extractParameters(text: string, limit = 8): string[] {
  const found: string[] = []
  const seen = new Set<string>()

  for (const pattern of PARAMETER_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0].replace(/\s+/g, ' ').trim()
      const key = value.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      found.push(value)
      if (found.length >= limit) return found
    }
  }

  return found
}
