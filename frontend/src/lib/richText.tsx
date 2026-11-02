import type { ReactNode } from 'react'

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let match: RegExpExecArray | null
  let index = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${index}`}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<code key={`${keyPrefix}-c${index}`}>{token.slice(1, -1)}</code>)
    }
    last = match.index + token.length
    index += 1
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'h'; text: string }

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let quote: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'p', lines: paragraph })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list && list.items.length) {
      blocks.push(list.ordered ? { kind: 'ol', items: list.items } : { kind: 'ul', items: list.items })
    }
    list = null
  }
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ kind: 'quote', lines: quote })
      quote = []
    }
  }
  const flushAll = () => {
    flushParagraph()
    flushList()
    flushQuote()
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (!line.trim()) {
      flushAll()
      continue
    }

    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      flushAll()
      blocks.push({ kind: 'h', text: heading[1] })
      continue
    }

    const quoted = line.match(/^>\s?(.*)$/)
    if (quoted) {
      flushParagraph()
      flushList()
      quote.push(quoted[1])
      continue
    }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/)

    if (bullet || ordered) {
      flushParagraph()
      flushQuote()
      const isOrdered = Boolean(ordered)
      if (!list || list.ordered !== isOrdered) {
        flushList()
        list = { ordered: isOrdered, items: [] }
      }
      list.items.push((bullet ?? ordered)![1])
      continue
    }

    flushList()
    flushQuote()
    paragraph.push(line.trim())
  }

  flushAll()
  return blocks
}

export function RichText({ text }: { text: string }) {
  const blocks = parseBlocks(text)

  return (
    <div className="si-prose">
      {blocks.map((block, i) => {
        if (block.kind === 'h') {
          return <h3 key={i}>{renderInline(block.text, `h${i}`)}</h3>
        }
        if (block.kind === 'p') {
          return <p key={i}>{renderInline(block.lines.join(' '), `p${i}`)}</p>
        }
        if (block.kind === 'quote') {
          return (
            <blockquote key={i} className="si-quote">
              {renderInline(block.lines.join(' '), `q${i}`)}
            </blockquote>
          )
        }
        const ListTag = block.kind === 'ol' ? 'ol' : 'ul'
        return (
          <ListTag key={i}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item, `l${i}-${j}`)}</li>
            ))}
          </ListTag>
        )
      })}
    </div>
  )
}
