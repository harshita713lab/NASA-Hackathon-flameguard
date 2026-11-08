import { useState } from 'react'
import type { ImgHTMLAttributes, ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ImageOff } from 'lucide-react'
import { cn } from '../lib/format'

const API_BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

function resolveImageUrl(raw?: string): string {
  let src = raw?.trim() ?? ''
  if (!src) return ''

  // The model sometimes emits repo-relative paths instead of the served URL,
  // or turns a relative /static_images path into a fake host.
  src = src.replace(/^(?:\.\/)?data\/images\//i, '/static_images/')
  src = src.replace(/^https?:\/\/static_images(?=\/)/i, '/static_images')

  if (API_BASE) {
    src = src.replace(/^https?:\/\/(?:127\.0\.0\.1|localhost):8000(?=\/)/i, API_BASE)
  }

  if (src.startsWith('//')) {
    src = `https:${src}`
  } else if (!/^[a-z][a-z0-9+.-]*:/i.test(src)) {
    if (src.startsWith('/')) {
      if (API_BASE) src = `${API_BASE}${src}`
    } else {
      src = `${API_BASE}/${src}`
    }
  }

  return safeEncode(src)
}

function safeEncode(value: string): string {
  try {
    return encodeURI(decodeURI(value))
  } catch {
    return value.replace(/ /g, '%20')
  }
}

function normalizeImageUrls(source: string): string {
  return source.replace(/!\[([^\]]*)\]\(([^)\n]+)\)/g, (_match, alt: string, destination: string) => {
    const trimmed = destination.trim()

    const angle = trimmed.match(/^<([^>]*)>(?:\s+("[^"]*"|'[^']*'))?$/)
    if (angle) {
      const title = angle[2] ? ` ${angle[2]}` : ''
      return `![${alt}](<${safeEncode(angle[1])}>${title})`
    }

    const titled = trimmed.match(/^(\S+)\s+("[^"]*"|'[^']*')$/)
    const url = titled ? titled[1] : trimmed
    const title = titled ? ` ${titled[2]}` : ''
    return `![${alt}](${safeEncode(url)}${title})`
  })
}

type MarkdownImageProps = ImgHTMLAttributes<HTMLImageElement>

function MarkdownImage({ src, alt, title, className, ...rest }: MarkdownImageProps) {
  const resolved = resolveImageUrl(typeof src === 'string' ? src : undefined)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const caption = alt?.trim()

  if (!resolved || failedSrc === resolved) {
    return (
      <span className="my-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-3 text-[11px] text-dim">
        <ImageOff className="size-3.5 shrink-0" />
        <span className="min-w-0 break-words">{caption || 'Figure unavailable'}</span>
      </span>
    )
  }

  return (
    <span className="my-5 block">
      <a
        href={resolved}
        target="_blank"
        rel="noreferrer noopener"
        className="block"
        aria-label={`Open figure${caption ? `: ${caption}` : ''} in a new tab`}
      >
        <img
          {...rest}
          src={resolved}
          alt={alt ?? ''}
          title={title}
          loading="eager"
          decoding="async"
          onError={() => setFailedSrc(resolved)}
          className={cn(
            'mx-auto block h-auto max-h-[520px] w-auto max-w-full rounded-xl border border-white/10 bg-black/30 object-contain shadow-[0_28px_70px_-30px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.04]',
            className,
          )}
        />
      </a>
      {caption ? (
        <span className="mt-2 block text-center font-mono text-[9.5px] uppercase tracking-[0.12em] text-dim">
          {caption}
        </span>
      ) : null}
    </span>
  )
}

function ScrollTable({ children, ...props }: { children?: ReactNode; className?: string }) {
  return (
    <div
      role="region"
      aria-label="Scrollable data table"
      tabIndex={0}
      className="my-4 w-full max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20"
    >
      <table {...props} className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
        {children}
      </table>
    </div>
  )
}

const components: Components = {
  img: ({ node: _node, ...props }) => <MarkdownImage {...props} />,
  table: ({ node: _node, ...props }) => <ScrollTable {...props} />,
  th: ({ node: _node, ...props }) => (
    <th
      {...props}
      className="whitespace-nowrap border-b border-white/10 bg-white/[0.05] px-3 py-2.5 font-display text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink/90"
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td {...props} className="border-b border-white/[0.06] px-3 py-2.5 align-top text-ink/75" />
  ),
  tr: ({ node: _node, ...props }) => <tr {...props} className="even:bg-white/[0.015]" />,
  a: ({ node: _node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer noopener"
      className="text-ember-soft underline decoration-ember/40 underline-offset-2 hover:text-ember"
    />
  ),
  blockquote: ({ node: _node, ...props }) => <blockquote {...props} className="si-quote" />,
  pre: ({ node: _node, ...props }) => (
    <pre
      {...props}
      className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[12px] leading-relaxed text-ink/85"
    />
  ),
}

export function Markdown({
  text,
  compact = false,
  className,
}: {
  text: string
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('si-prose min-w-0 max-w-none', compact && 'si-prose-sm', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {normalizeImageUrls(text)}
      </ReactMarkdown>
    </div>
  )
}
