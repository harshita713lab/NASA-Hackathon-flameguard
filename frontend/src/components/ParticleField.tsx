import { useEffect, useRef } from 'react'

const TINTS = ['255,122,47', '255,179,92', '255,255,255', '79,214,200'] as const

interface Ember {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  size: number
  tint: number
  phase: number
}

function createSprite(rgb: string) {
  const size = 64
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size
  const ctx = sprite.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, `rgba(${rgb},0.95)`)
    gradient.addColorStop(0.28, `rgba(${rgb},0.5)`)
    gradient.addColorStop(0.62, `rgba(${rgb},0.12)`)
    gradient.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return sprite
}

function seedEmbers(count: number): Ember[] {
  return Array.from({ length: count }, () => ({
    x: (Math.random() * 2 - 1) * 0.55,
    y: (Math.random() * 2 - 1) * 0.55,
    z: Math.random() * 640,
    vx: (Math.random() - 0.5) * 0.012,
    vy: (Math.random() - 0.5) * 0.01,
    vz: (Math.random() - 0.5) * 24,
    size: 1.4 + Math.random() * 2.6,
    tint: Math.floor(Math.random() * TINTS.length),
    phase: Math.random() * Math.PI * 2,
  }))
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sprites = TINTS.map(createSprite)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = { x: -9999, y: -9999, targetX: 0, targetY: 0, pushX: 0, pushY: 0 }
    let embers: Ember[] = []
    let width = 0
    let height = 0
    let raf = 0
    let last = 0
    let elapsed = 0

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const target = Math.round(Math.min(80, Math.max(30, (width * height) / 24000)))
      if (embers.length !== target) embers = seedEmbers(target)
    }

    const draw = (delta: number) => {
      elapsed += delta
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height / 2
      const focal = 640

      pointer.pushX += (pointer.targetX - pointer.pushX) * Math.min(1, delta * 2.4)
      pointer.pushY += (pointer.targetY - pointer.pushY) * Math.min(1, delta * 2.4)

      ctx.globalCompositeOperation = 'lighter'

      for (const ember of embers) {
        const sway = Math.sin(elapsed * 0.35 + ember.phase) * 0.00055
        const lift = Math.cos(elapsed * 0.28 + ember.phase * 1.3) * 0.00045
        ember.x += (ember.vx + sway) * delta
        ember.y += (ember.vy + lift) * delta
        ember.z += ember.vz * delta

        if (ember.x > 0.7) ember.x = -0.7
        if (ember.x < -0.7) ember.x = 0.7
        if (ember.y > 0.7) ember.y = -0.7
        if (ember.y < -0.7) ember.y = 0.7
        if (ember.z > 640) ember.z = 0
        if (ember.z < 0) ember.z = 640

        const damp = Math.exp(-delta * 1.6)
        ember.vx *= damp
        ember.vy *= damp

        const depth = 1.15 - ember.z / 900
        const scale = focal / (focal + ember.z)
        const worldX = ember.x * width - pointer.pushX * 30 * depth
        const worldY = ember.y * height - pointer.pushY * 22 * depth
        const sx = cx + worldX * scale
        const sy = cy + worldY * scale

        const dx = sx - pointer.x
        const dy = sy - pointer.y
        const radius = 155 * depth
        const distSq = dx * dx + dy * dy

        if (distSq > 1 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq)
          const force = (1 - dist / radius) ** 2 * 1.6 * delta * depth
          ember.vx += (dx / dist) * force
          ember.vy += (dy / dist) * force
        }

        const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 1.1 + ember.phase)
        const alpha = (0.16 + twinkle * 0.34) * (0.3 + 0.7 * scale)
        const drawSize = ember.size * scale * 5.4

        ctx.globalAlpha = Math.min(0.62, alpha)
        ctx.drawImage(sprites[ember.tint], sx - drawSize / 2, sy - drawSize / 2, drawSize, drawSize)
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000 || 0.016)
      last = now
      draw(delta)
      raf = window.requestAnimationFrame(loop)
    }

    const start = () => {
      window.cancelAnimationFrame(raf)
      if (motion.matches) {
        draw(0.016)
        return
      }
      last = performance.now()
      raf = window.requestAnimationFrame(loop)
    }

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.targetX = (event.clientX / width) * 2 - 1
      pointer.targetY = (event.clientY / height) * 2 - 1
    }

    const onPointerLeave = () => {
      pointer.x = -9999
      pointer.y = -9999
      pointer.targetX = 0
      pointer.targetY = 0
    }

    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf)
      } else {
        start()
      }
    }

    const onMotionChange = () => start()

    resize()
    start()

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)
    motion.addEventListener('change', onMotionChange)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      motion.removeEventListener('change', onMotionChange)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
