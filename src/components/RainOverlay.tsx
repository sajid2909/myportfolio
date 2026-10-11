import { useEffect, useRef } from 'react'

interface RainOverlayProps {
  className?: string
}

interface Bead {
  x: number
  y: number
  r: number
  vy: number
  slide: boolean
  phase: number
  wobble: number
  grow: number
  shrink: number
  trailTimer: number
}

/** A rivulet: a winding wet trail with a moving head that flows down the glass. */
interface Stream {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  pts: number[] // flat [x0,y0, x1,y1, …] from tail to head
  dist: number
  maxLen: number
  active: boolean
  fade: number
  phase: number
  age: number
}

const SPRITE_SIZE = 64
const SPRITE_PAD = 5
const SPRITE_FILL = (SPRITE_SIZE - SPRITE_PAD * 2) / SPRITE_SIZE
/** Hard ceiling so merging can never grow a bubble-sized sphere. */
const MAX_BEAD_R = 4.6

/**
 * Pre-render one droplet look as an IRREGULAR blob (14-point perturbed
 * outline) — deliberately not a circle. Interior is nearly transparent with a
 * dark wet edge and one tiny sharp catchlight, so beads read as moisture
 * clinging to glass rather than glossy floating spheres.
 */
function makeDropletSprite(variant: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const g = canvas.getContext('2d')
  if (!g) return canvas

  const R = SPRITE_SIZE / 2 - SPRITE_PAD
  const N = 14
  const pts: [number, number][] = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const wob =
      0.84 +
      0.16 *
        (0.5 + 0.5 * Math.sin(i * 2.3 + variant * 1.9)) *
        (0.55 + 0.45 * Math.sin(i * 0.8 + variant * 3.1 + 1.2))
    pts.push([Math.cos(a) * R * wob, Math.sin(a) * R * wob])
  }

  const trace = () => {
    g.beginPath()
    const mid = (i: number): [number, number] => {
      const a = pts[((i % N) + N) % N]
      const b = pts[(((i + 1) % N) + N) % N]
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    }
    const [mx, my] = mid(N - 1)
    g.moveTo(mx, my)
    for (let i = 0; i < N; i++) {
      const p = pts[i]
      const [cx, cy] = mid(i)
      g.quadraticCurveTo(p[0], p[1], cx, cy)
    }
    g.closePath()
  }

  // Faint wet sheen inside the bead (raised liquid surface catches light).
  let grad = g.createRadialGradient(0, R * 0.2, 0, 0, R * 0.2, R)
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)')
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  g.fillStyle = grad
  trace()
  g.fill()

  // Gentle meniscus shadow low inside the droplet — the curved liquid
  // surface bends light away from its lower interior.
  grad = g.createRadialGradient(0, R * 0.72, 0, 0, R * 0.72, R * 0.5)
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.14)')
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  g.fillStyle = grad
  trace()
  g.fill()

  // Dark irregular wet edge — the surface-tension outline, not a sphere rim.
  trace()
  g.strokeStyle = 'rgba(0, 0, 0, 0.48)'
  g.lineWidth = 3
  g.stroke()

  // Reflective highlight along the upper-left edge so beads stay readable
  // against dark photo areas — mirror-like rim, still transparent inside.
  g.beginPath()
  g.arc(0, 0, R * 0.84, Math.PI * 0.92, Math.PI * 1.95)
  g.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  g.lineWidth = 1.2
  g.stroke()

  // Dark-grey edge shading on the opposite (lower-right) side — the raised
  // droplet blocks the light source from that edge.
  g.beginPath()
  g.arc(0, 0, R * 0.86, Math.PI * -0.08, Math.PI * 0.95)
  g.strokeStyle = 'rgba(0, 0, 0, 0.3)'
  g.lineWidth = 1.6
  g.stroke()

  // Soft silver-white specular highlight (upper-left), gently graded.
  grad = g.createRadialGradient(-R * 0.34, -R * 0.4, 0, -R * 0.34, -R * 0.4, R * 0.28)
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
  grad.addColorStop(0.3, 'rgba(245, 245, 245, 0.4)')
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  g.fillStyle = grad
  trace()
  g.fill()

  // Refraction glint low on the bead.
  grad = g.createRadialGradient(R * 0.08, R * 0.52, 0, R * 0.08, R * 0.52, R * 0.3)
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.42)')
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  g.fillStyle = grad
  trace()
  g.fill()

  return canvas
}

/**
 * Transparent wet-glass rain overlay for a positioned image container.
 *
 * Three water elements, exactly as on a real windowpane:
 *  A. hundreds of tiny irregular stationary moisture beads (condensation),
 *  B. small/medium droplets sliding down under gravity (size = speed),
 *  C. thin winding rivulets with moving heads that leave fading wet trails —
 *     spawned continuously and whenever droplets merge.
 *
 * requestAnimationFrame with elapsed-time physics; IntersectionObserver
 * pauses offscreen; `prefers-reduced-motion` renders a static wet frame.
 * `pointer-events: none`; the photograph underneath is never touched.
 */
export function RainOverlay({ className = '' }: RainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const context = canvasEl.getContext('2d')
    if (!context) return
    // Non-nullable aliases: nested closures capture declared types, so the
    // null guards live here once instead of inside every function.
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = context

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let sprites: HTMLCanvasElement[] = []
    let beads: Bead[] = []
    let streams: Stream[] = []
    let w = 0
    let h = 0
    let seeded = false
    let running = false
    let rafId = 0
    let last = 0
    let elapsed = 0
    let spawnAcc = 0
    let streamSpawnAcc = 0
    let mergeCount = 0
    let trailCount = 0
    let streamCount = 0
    let lastTelemetry = -1

    const rand = (min: number, max: number) => min + Math.random() * (max - min)

    // ── Density knobs (content-driven, scale with the image area) ─────────
    const maxBeads = () => Math.min(460, Math.max(60, Math.round((w * h) / 700)))
    const sliderTarget = () => Math.max(8, Math.min(20, Math.round((w * h) / 22000)))
    const spawnRate = () => Math.max(6, Math.min(22, (w * h) / 16000)) // beads/s
    // Spec target: 20–40 visible flowing trails. The raw cap sits above the
    // visible target (a few linger fully faded) so the spawn gate never
    // saturates — bursts at the cap would synchronize cohorts and make the
    // wet-glass density visibly oscillate.
    const maxStreams = () => Math.max(12, Math.min(48, Math.round((w * h) / 7500)))
    const streamRate = () => Math.max(3, Math.min(13, (w * h) / 26000)) // streams/s
    /** All water speeds scale with rendered height (700px spec reference). */
    const speedScale = () => h / 700

    function makeBead(x: number, y: number, r: number, trail = false): Bead {
      return {
        x,
        y,
        r,
        vy: 0,
        slide: false,
        phase: rand(0, Math.PI * 2),
        wobble: rand(1.2, 2.8),
        grow: trail ? rand(0.03, 0.09) : rand(0.015, 0.11),
        shrink: trail ? rand(0.02, 0.05) : rand(0.004, 0.012),
        trailTimer: rand(0.04, 0.1),
      }
    }

    function spawnStream(x: number, y: number, width?: number): Stream {
      const s: Stream = {
        x,
        y,
        vx: rand(-4, 4),
        vy: rand(60, 140),
        w: width ?? rand(0.7, 2.2),
        pts: [x, y],
        dist: 0,
        maxLen: rand(150, 480),
        active: true,
        fade: 1,
        phase: rand(0, Math.PI * 2),
        age: 0,
      }
      streams.push(s)
      streamCount++
      return s
    }

    /** Advance one rivulet: gravity, winding path, tail recording, fade-out. */
    function updateStream(s: Stream, dt: number) {
      s.age += dt
      if (s.active) {
        // Heavy, fast water: thick streams race (~200–400 px/s at the 700px
        // reference height); all motion is downward (gravity only).
        const cap = (240 + s.w * 75) * speedScale()
        s.vy = Math.min(cap, s.vy + 320 * speedScale() * dt)
        s.y += s.vy * dt
        // Winding lateral drift; frequent direction changes.
        s.vx += Math.sin(s.age * 1.6 + s.phase) * 46 * dt
        s.vx *= 1 - Math.min(1, 1.6 * dt)
        if (Math.random() < dt * 0.5) s.phase += rand(-2.5, 2.5)
        s.x += s.vx * dt
        if (s.x < 2) {
          s.x = 2
          s.vx = Math.abs(s.vx) * 0.5
        }
        if (s.x > w - 2) {
          s.x = w - 2
          s.vx = -Math.abs(s.vx) * 0.5
        }

        // Record the path, then trim the tail to maxLen.
        const n = s.pts.length
        const dx = s.x - s.pts[n - 2]
        const dy = s.y - s.pts[n - 1]
        const d = Math.hypot(dx, dy)
        if (d >= 2.2) {
          s.pts.push(s.x, s.y)
          s.dist += d
          while (s.dist > s.maxLen && s.pts.length > 4) {
            const seg = Math.hypot(s.pts[2] - s.pts[0], s.pts[3] - s.pts[1])
            s.pts.splice(0, 2)
            s.dist -= seg
          }
        }
        if (s.y - s.w > h) s.active = false
      } else {
        // The wet trail lingers, then fades so it can reform elsewhere.
        // (Slower fade per spec: trails should be longer and noticeable.)
        s.fade -= dt * 0.6
      }
    }

    function seed() {
      beads = []
      streams = []
      const cap = maxBeads()
      for (let i = 0; i < cap * 0.7; i++) {
        beads.push(makeBead(rand(0, w), rand(0, h), rand(0.55, 1.4)))
      }
      for (let i = 0; i < cap * 0.2; i++) {
        beads.push(makeBead(rand(0, w), rand(0, h), rand(1.4, 2.6)))
      }
      // A few larger drops sitting on the glass; the heavy ones let go and
      // slide soon after (spec: a few larger, naturally irregular drops).
      for (let i = 0; i < Math.max(6, Math.round(cap * 0.03)); i++) {
        beads.push(makeBead(rand(0, w), rand(0, h), rand(2.8, 4)))
      }
      for (let i = 0; i < sliderTarget(); i++) {
        const b = makeBead(rand(0, w), rand(0, h), rand(2.2, 4.2))
        b.slide = true
        beads.push(b)
      }
      // Prime a few rivulets mid-flow so the glass starts wet. Stop at 72%
      // height so fast streams stay active — a full lifetime inside the
      // priming loop would fade them out before the first frame.
      for (let i = 0; i < 8; i++) {
        const s = spawnStream(rand(w * 0.1, w * 0.9), rand(h * 0.05, h * 0.5))
        for (let k = 0; k < 40 && s.active && s.y < h * 0.72; k++) updateStream(s, 0.1)
      }
      seeded = true
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      if (cw === 0 || ch === 0) return
      const prevW = w
      const prevH = h
      w = cw
      h = ch
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!seeded) {
        seed()
      } else if (prevW > 0 && prevH > 0) {
        // Keep the composition when the container resizes.
        const sx = w / prevW
        const sy = h / prevH
        for (const b of beads) {
          b.x *= sx
          b.y *= sy
        }
        for (const s of streams) {
          s.x *= sx
          s.y *= sy
          for (let i = 0; i < s.pts.length; i++) {
            s.pts[i] *= i % 2 === 0 ? sx : sy
          }
        }
      }
      if (!running) draw()
    }

    function step(dt: number) {
      elapsed += dt

      // ── A. Continuous droplet formation — never visibly resets ───────────
      spawnAcc += dt * spawnRate()
      while (spawnAcc >= 1 && beads.length < maxBeads()) {
        spawnAcc -= 1
        const asMedium = Math.random() < 0.12
        beads.push(makeBead(rand(0, w), rand(0, h), asMedium ? rand(1.7, 2.8) : rand(0.5, 1.4)))
      }
      if (spawnAcc > 4) spawnAcc = 4

      // Heavy beads eventually let go and start sliding.
      if (countSliders() < sliderTarget() && Math.random() < dt * 2.5) {
        const candidates = beads.filter((b) => !b.slide && b.r > 1.9)
        if (candidates.length > 0) {
          candidates[Math.floor(Math.random() * candidates.length)].slide = true
        }
      }

      // ── B. Bead physics: condensation, evaporation, sliding, merging ─────
      for (let i = beads.length - 1; i >= 0; i--) {
        const b = beads[i]

        if (!b.slide) {
          b.r += (b.grow - b.shrink) * dt
          if (b.r > MAX_BEAD_R) b.r = MAX_BEAD_R
          if (b.r < 0.35) beads.splice(i, 1)
          continue
        }

        // Size-dependent speed: medium drops ~60–130 px/s, large 130–260
        // px/s at the 700px reference height, with lively acceleration.
        const gravity = (30 + b.r * 18) * speedScale()
        const base = 55 + b.r * 24
        const big = 60 * Math.max(0, b.r - 3.2) ** 2
        const terminal = Math.min(260, base + big) * speedScale()
        b.vy = Math.min(terminal, b.vy + gravity * dt)
        b.y += b.vy * dt
        b.x += Math.sin(elapsed * 2.6 * (1 + b.phase * 0.14) + b.phase) * b.wobble * dt
        b.r -= 0.015 * dt

        // Water left behind beads up into a fading micro-trail.
        b.trailTimer -= dt
        if (b.trailTimer <= 0 && b.r > 1.4 && beads.length < maxBeads() + 60) {
          b.trailTimer = rand(0.03, 0.07)
          beads.push(makeBead(b.x + rand(-b.r * 0.35, b.r * 0.35), b.y - b.r * 0.7, b.r * rand(0.3, 0.55), true))
          b.r -= 0.02
          trailCount++
        }

        // Merging: absorb beads and other sliders on contact.
        for (let j = beads.length - 1; j >= 0; j--) {
          if (j === i) continue
          const o = beads[j]
          const dx = b.x - o.x
          const dy = b.y - o.y
          if (dx * dx + dy * dy < ((b.r + o.r) * 0.68) ** 2) {
            if (o.slide) {
              const m1 = b.r * b.r
              const m2 = o.r * o.r
              b.vy = (b.vy * m1 + o.vy * m2) / (m1 + m2)
            }
            b.r = Math.min(MAX_BEAD_R, Math.sqrt(b.r * b.r + o.r * o.r * 0.8))
            beads.splice(j, 1)
            mergeCount++
            // Merges nucleate rivulets — real water runs when drops combine.
            if (b.slide && b.r >= 2.3 && Math.random() < 0.45 && streams.length < maxStreams() + 2) {
              spawnStream(b.x, b.y, rand(0.8, Math.min(2.2, b.r * 0.5)))
            }
            if (j < i) i--
          }
        }

        if (b.y - b.r > h) {
          beads.splice(i, 1)
          continue
        }
        if (b.r < 1.3) {
          // Too small to keep moving — settles as an ordinary bead.
          b.slide = false
          b.shrink = rand(0.03, 0.06)
        }
      }

      // ── C. Rivulets: flow, fade, and reform continuously ─────────────────
      for (let i = streams.length - 1; i >= 0; i--) {
        const s = streams[i]
        updateStream(s, dt)
        if (!s.active && s.fade <= 0) streams.splice(i, 1)
      }
      streamSpawnAcc += dt * streamRate()
      while (streamSpawnAcc >= 1) {
        streamSpawnAcc -= 1
        if (streams.length < maxStreams()) {
          spawnStream(rand(w * 0.06, w * 0.94), rand(-24, h * 0.38))
        }
      }
      if (streamSpawnAcc > 3) streamSpawnAcc = 3
    }

    function countSliders() {
      let n = 0
      for (const b of beads) if (b.slide) n++
      return n
    }

    function drawBead(b: Bead) {
      const idx = Math.abs(Math.floor(b.phase * 10)) % sprites.length
      const sprite = sprites[idx]
      if (!sprite) return
      const size = (b.r * 2) / SPRITE_FILL
      const elong = b.slide ? Math.min(1.25, 1 + b.vy / 300) : 1
      const alpha = Math.min(0.88, (b.slide ? 0.5 : 0.46) + b.r * 0.13)
      ctx.globalAlpha = alpha
      ctx.drawImage(sprite, b.x - size / 2, b.y - (size * elong) / 2, size, size * elong)
      ctx.globalAlpha = 1
    }

    /** Stroke one path range with a per-x offset (used for the wet glint). */
    function strokeRange(s: Stream, from: number, to: number, dx: number, style: string, lw: number) {
      ctx.beginPath()
      ctx.moveTo(s.pts[from * 2] + dx, s.pts[from * 2 + 1])
      for (let i = from + 1; i <= to; i++) {
        ctx.lineTo(s.pts[i * 2] + dx, s.pts[i * 2 + 1])
      }
      ctx.strokeStyle = style
      ctx.lineWidth = lw
      ctx.stroke()
    }

    /**
     * A rivulet: four alpha/width buckets from fading tail to bright head,
     * drawn twice — a wide dark wet-streak pass, then a hairline silver glint
     * offset sideways. Reads as water running down glass, not a white line.
     */
    function drawStream(s: Stream) {
      const n = s.pts.length / 2
      if (n >= 2) {
        const total = n - 1
        for (let b = 0; b < 4; b++) {
          const start = Math.floor((total * b) / 4)
          const end = Math.floor((total * (b + 1)) / 4)
          if (end <= start) continue
          const from = b > 0 ? start - 1 : start
          const t = (b + 1) / 4 // 0.25 (tail) → 1 (head)
          const dark = Math.min(0.32, s.fade * (0.13 + 0.18 * t))
          const lw = s.w * (0.55 + 0.45 * t)
          strokeRange(s, from, end, 0, `rgba(4, 4, 6, ${dark})`, lw * 1.7)
          const glint = Math.min(0.26, s.fade * (0.07 + 0.13 * t))
          strokeRange(s, from, end, 0.6, `rgba(250, 250, 250, ${glint})`, Math.max(0.5, lw * 0.4))
        }
      }
      // The moving head carries a small leading bead.
      if (s.active && s.fade > 0) {
        const sprite = sprites[1]
        if (sprite) {
          const size = (2 * s.w * 1.3) / SPRITE_FILL
          ctx.globalAlpha = Math.min(0.85, 0.42 + s.w * 0.18) * s.fade
          ctx.drawImage(sprite, s.x - size / 2, s.y - size / 2, size, size)
          ctx.globalAlpha = 1
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)
      for (const b of beads) drawBead(b)
      for (const s of streams) drawStream(s)
      ctx.globalAlpha = 1
    }

    function tick(now: number) {
      rafId = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      step(dt)
      draw()
      // Observability for tests, written at most 4×/s so running stays cheap.
      if (elapsed - lastTelemetry > 0.25) {
        lastTelemetry = elapsed
        canvas.dataset.merges = String(mergeCount)
        canvas.dataset.trails = String(trailCount)
        canvas.dataset.streams = String(streamCount)
        let speedSum = 0
        let speedN = 0
        for (const s of streams) {
          if (s.active) {
            speedSum += s.vy
            speedN++
          }
        }
        canvas.dataset.streamSpeed = String(
          Math.round(speedN > 0 ? speedSum / speedN : 0),
        )
      }
    }

    function start() {
      if (running) return
      running = true
      canvas.dataset.rainState = 'running'
      last = performance.now()
      rafId = requestAnimationFrame(tick)
    }

    function stop() {
      if (running) {
        running = false
        cancelAnimationFrame(rafId)
      }
      // Tag every time, so an overlay born offscreen reports "paused" too.
      canvas.dataset.rainState = 'paused'
    }

    function renderStatic() {
      stop()
      if (!seeded) seed()
      draw()
      canvas.dataset.rainState = 'static'
    }

    let observer: IntersectionObserver | null = null

    function applyMode() {
      if (observer) {
        observer.disconnect()
        observer = null
      }
      if (reduceMotion.matches) {
        renderStatic()
        return
      }
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) start()
            else stop()
          }
        },
        { threshold: 0.05 },
      )
      observer.observe(canvas)
      // A mode switch while visible wouldn't re-fire the observer — check now.
      const rect = canvas.getBoundingClientRect()
      const visible = rect.bottom > 0 && rect.top < window.innerHeight
      if (visible) start()
    }

    sprites = [makeDropletSprite(0), makeDropletSprite(1), makeDropletSprite(2)]

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    reduceMotion.addEventListener('change', applyMode)
    applyMode()

    return () => {
      stop()
      resizeObserver.disconnect()
      observer?.disconnect()
      reduceMotion.removeEventListener('change', applyMode)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-rain-state="init"
      className={`pointer-events-none absolute inset-0 block h-full w-full ${className}`}
    />
  )
}

export default RainOverlay
