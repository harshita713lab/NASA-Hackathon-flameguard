import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { SectionImage } from '../data/missionSections'

interface ImageLightboxProps {
  image: SectionImage | null
  onClose: () => void
}

export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!image) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [image, onClose])

  if (!image) return null
  const failed = failedSrc === image.src

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-void/90 p-3 backdrop-blur-md sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${image.figureLabel}: ${image.caption}`}
        className="flex max-h-[92vh] w-full max-w-5xl animate-rise flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="mono-label text-ember-soft/80">Archival figure</p>
            <h2 className="mt-1 truncate font-display text-[15px] font-semibold tracking-tight text-white">
              {image.figureLabel}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close figure"
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-muted transition-colors hover:border-white/20 hover:text-white touch-manipulation"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-black/50 p-2 sm:p-4">
          {failed ? (
            <p className="px-6 py-16 text-center text-sm text-muted">
              This figure could not be loaded from the local archive.
            </p>
          ) : (
            <img
              src={image.src}
              alt={image.caption}
              onError={() => setFailedSrc(image.src)}
              className="mx-auto block max-h-[62vh] w-auto max-w-full rounded-lg object-contain"
            />
          )}
        </div>

        <footer className="border-t border-white/[0.07] px-4 py-3 sm:px-5">
          <p className="text-[12px] leading-relaxed text-ink/80">{image.caption}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
            <span>{image.sourceDoc}</span>
            <span className="text-white/15">/</span>
            <span>{image.credit}</span>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
