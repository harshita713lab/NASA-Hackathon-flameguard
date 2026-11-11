import { useEffect, useRef } from 'react'

const TINTS = [
  '255,255,255',
  '255,255,255',
  '214,232,255',
  '255,255,255',
  '255,214,170',
  '79,214,200',
  '255,255,255',
  '176,202,255',
] as const

const CURSOR_MAX = 240

interface Star {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  size: number
  tint: number
  phase: number
  sparkle: boolean
}

interface CursorParticle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  ttl: number
  size: number
  tint: number
  sparkle: boolean
}

function createDotSprite(rgb: string) {
  const size = 64
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size
  const ctx = sprite.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, `rgba(${rgb},1)`)
    gradient.addColorStop(0.3, `rgba(${rgb},0.68)`)
    gradient.addColorStop(0.6, `rgba(${rgb},0.16)`)
    gradient.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return sprite
}

function createSparkleSprite(rgb: string) {
  const size = 64
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size
  const ctx = sprite.getContext('2d')
  if (ctx) {
    const half = size / 2
    const core = ctx.createRadialGradient(half, half, 0, half, half, half * 0.42)
    core.addColorStop(0, `rgba(${rgb},1)`)
    core.addColorStop(0.35, `rgba(${rgb},0.4)`)
    core.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = core
    ctx.fillRect(0, 0, size, size)

    ctx.translate(half, half)
    for (const rotate of [0, Math.PI / 2]) {
      ctx.save()
      ctx.rotate(rotate)
      const wrap = ctx.createLinearGradient(-half, 0, half, 0)
      wrap.addColorStop(0, `rgba(${rgb},0)`)
      wrap.addColorStop(0.36, `rgba(${rgb},0.34)`)
      wrap.addColorStop(0.5, `rgba(${rgb},0.95)`)
      wrap.addColorStop(0.64, `rgba(${rgb},0.34)`)
      wrap.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = wrap
      ctx.fillRect(-half, -0.85, size, 1.7)
      ctx.restore()
    }
  }
  return sprite
}

function seedStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: Math.random() * 2 - 1,
    vx: 0,
    vy: 0,
    vz: 0.012 + Math.random() * 0.055,
    size: 1.3 + Math.random() * 1.9,
    tint: Math.floor(Math.random() * TINTS.length),
    phase: Math.random() * Math.PI * 2,
    sparkle: Math.random() < 0.16,
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

    const dots = TINTS.map(createDotSprite)
    const sparkles = TINTS.map(createSparkleSprite)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = {
      x: -9999,
      y: -9999,
      px: 0,
      py: 0,
      targetX: 0,
      targetY: 0,
      moveX: 0,
      moveY: 0,
      active: false,
    }
    const cursorParticles: CursorParticle[] = []
    let stars: Star[] = []
    let width = 0
    let height = 0
    let raf = 0
    let last = 0
    let elapsed = 0

    const spawnCursorParticle = (x: number, y: number, spread: number, energy: number) => {
      if (cursorParticles.length >= CURSOR_MAX) cursorParticles.shift()
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 30 * energy
      cursorParticles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        z: Math.random() * 2 - 1,
        vx: Math.cos(angle) * speed + pointer.moveX * 0.09,
        vy: Math.sin(angle) * speed + pointer.moveY * 0.09,
        vz: (Math.random() - 0.5) * 0.55,
        life: 0,
        ttl: 0.65 + Math.random() * 1.05,
        size: 0.8 + Math.random() * 2.6,
        tint: Math.floor(Math.random() * TINTS.length),
        sparkle: Math.random() < 0.24,
      })
    }

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const target = Math.round(Math.min(560, Math.max(140, (width * height) / 2600)))
      if (stars.length !== target) stars = seedStars(target)
    }

    const draw = (delta: number) => {
      elapsed += delta
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height / 2
      const halfW = width * 0.56
      const halfH = height * 0.56

      pointer.px += (pointer.targetX - pointer.px) * Math.min(1, delta * 2.2)
      pointer.py += (pointer.targetY - pointer.py) * Math.min(1, delta * 2.2)
      pointer.moveX *= 0.88
      pointer.moveY *= 0.88

      const angleY = elapsed * 0.05
      const angleX = Math.sin(elapsed * 0.09) * 0.08
      const cosY = Math.cos(angleY)
      const sinY = Math.sin(angleY)
      const cosX = Math.cos(angleX)
      const sinX = Math.sin(angleX)
      const parallaxX = pointer.px * 34
      const parallaxY = pointer.py * 26

      ctx.globalCompositeOperation = 'lighter'

      // Cursor halo — a soft 3D glow that follows the pointer.
      if (pointer.active) {
        const pulse = 0.13 + 0.045 * Math.sin(elapsed * 2.1)
        ctx.globalAlpha = pulse
        ctx.drawImage(dots[4], pointer.x - 105, pointer.y - 105, 210, 210)
      }

      for (const star of stars) {
        star.z += star.vz * delta
        if (star.z > 1) {
          star.z = -1
          star.x = Math.random() * 2 - 1
          star.y = Math.random() * 2 - 1
        }

        const rx = star.x * cosY - star.z * sinY
        const rz1 = star.x * sinY + star.z * cosY
        const ry = star.y * cosX - rz1 * sinX
        const rz = star.y * sinX + rz1 * cosX

        const depth = (rz + 1) * 0.5
        const scale = 1.6 / (2.05 - rz)
        const sx = cx + rx * halfW * scale + parallaxX * scale
        const sy = cy + ry * halfH * scale + parallaxY * scale

        const dx = sx - pointer.x
        const dy = sy - pointer.y
        const radius = 170 * scale
        const distSq = dx * dx + dy * dy

        if (distSq > 1 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq)
          const force = (1 - dist / radius) ** 2 * 120 * delta
          star.vx += (dx / dist) * force
          star.vy += (dy / dist) * force
        }

        const damp = Math.exp(-delta * 2.6)
        star.vx *= damp
        star.vy *= damp
        const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy)
        if (speed > 30) {
          star.vx *= 30 / speed
          star.vy *= 30 / speed
        }

        const px = sx + star.vx
        const py = sy + star.vy
        const margin = 40
        if (px < -margin || px > width + margin || py < -margin || py > height + margin) continue

        const twinkle = 0.6 + 0.4 * Math.sin(elapsed * 1.35 + star.phase)
        const alpha = Math.min(0.92, (0.24 + depth * 0.56) * twinkle)
        const drawSize = star.size * scale * 3.5
        const sprite = star.sparkle ? sparkles[star.tint] : dots[star.tint]

        ctx.globalAlpha = alpha
        ctx.drawImage(sprite, px - drawSize / 2, py - drawSize / 2, drawSize, drawSize)
      }

      // Ambient 3D particles keep orbiting the cursor while it rests.
      if (pointer.active && Math.random() < delta * 34) {
        spawnCursorParticle(pointer.x, pointer.y, 34, 0.4)
      }

      for (let i = cursorParticles.length - 1; i >= 0; i -= 1) {
        const particle = cursorParticles[i]
        particle.life += delta
        if (particle.life >= particle.ttl) {
          cursorParticles.splice(i, 1)
          continue
        }

        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.z += particle.vz * delta
        if (particle.z > 1 || particle.z < -1) particle.vz *= -1

        const damp = Math.exp(-delta * 2.4)
        particle.vx *= damp
        particle.vy *= damp

        if (particle.x < -60 || particle.x > width + 60 || particle.y < -60 || particle.y > height + 60) {
          cursorParticles.splice(i, 1)
          continue
        }

        const lifeRatio = particle.life / particle.ttl
        const depth = (particle.z + 1) * 0.5
        const scale = 1.55 / (2.05 - particle.z)
        const fade = Math.min(1, lifeRatio * 6) * (1 - lifeRatio) ** 1.6
        const twinkle = 0.75 + 0.25 * Math.sin(elapsed * 3.4 + particle.life * 9)
        const drawSize = particle.size * scale * 5.4
        const sprite = particle.sparkle ? sparkles[particle.tint] : dots[particle.tint]

        ctx.globalAlpha = Math.min(0.95, fade * (0.4 + depth * 0.6) * twinkle)
        ctx.drawImage(
          sprite,
          particle.x - drawSize / 2,
          particle.y - drawSize / 2,
          drawSize,
          drawSize,
        )
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
      draw(0.016)
      if (motion.matches) return
      last = performance.now()
      raf = window.requestAnimationFrame(loop)
    }

    const onPointerMove = (event: PointerEvent) => {
      const nextX = event.clientX
      const nextY = event.clientY
      if (pointer.active) {
        const dx = nextX - pointer.x
        const dy = nextY - pointer.y
        pointer.moveX = dx
        pointer.moveY = dy
        const speed = Math.hypot(dx, dy)
        const bursts = Math.min(6, 1 + Math.floor(speed / 14))
        for (let i = 0; i < bursts; i += 1) {
          spawnCursorParticle(nextX, nextY, 22, 0.7 + Math.min(1.4, speed / 40))
        }
      }
      pointer.x = nextX
      pointer.y = nextY
      pointer.targetX = (nextX / width) * 2 - 1
      pointer.targetY = (nextY / height) * 2 - 1
      pointer.active = true
    }

    const onPointerLeave = () => {
      pointer.x = -9999
      pointer.y = -9999
      pointer.targetX = 0
      pointer.targetY = 0
      pointer.moveX = 0
      pointer.moveY = 0
      pointer.active = false
      cursorParticles.length = 0
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
