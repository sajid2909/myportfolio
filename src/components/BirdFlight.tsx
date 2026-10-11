import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------------------------------------------------ *
 * Geometry — all measured from the live DOM at runtime.
 * ------------------------------------------------------------------ */

/** Landing point inside the rendered Objective photograph (fraction of the
 *  cover-cropped frame). Measured from the source image: the open palm sits
 *  at ~79% width / ~50.5% height. The photo itself is never modified. */
const PALM = { x: 0.79, y: 0.505 }

/** Point of the bird artwork that touches perch/palm (between the feet). */
const ANCHOR = { x: 0.5, y: 0.815 }

/** Scroll-progress landmarks (fraction of the ScrollTrigger range). */
const TAKEOFF_END = 0.05 // bird is fully airborne
const LANDING_START = 0.88 // final approach / deceleration begins
const SETTLED = 0.985 // seated, wings folded

/** Horizontal safe padding (fraction of viewport) the bird keeps while flying. */
const SAFE_PAD = 0.08

/** Facing hysteresis — ignore sub-threshold jitter so the bird never flickers
 *  when the scroll direction wobbles around a reversal. */
const FACE_DEAD = 0.25 // px of horizontal movement required to consider a turn
const FACE_HOLD = 2 // consecutive frames of agreement before flipping

/** rAF interpolation factor toward the scroll target (responsiveness vs smoothness). */
const FOLLOW = 0.22

type Pt = { x: number; y: number }

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v)
const smoothstep = (u: number) => {
  const t = clamp(u, 0, 1)
  return t * t * (3 - 2 * t)
}

/** Document-space layout box of an element, ignoring CSS transforms.
 *  Entrypoints wrapped in scroll-reveal animations carry a transient
 *  translateY; measuring via getBoundingClientRect would make the bird's
 *  target shift as the reveal plays. offsetTop/Left are layout-based. */
function layoutRect(el: HTMLElement) {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

/** Document-space position + size (for the SVG perch marker). */
function docRect(el: Element) {
  const r = el.getBoundingClientRect()
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
}

/**
 * Maps raw scroll progress → route progress with a gentle, eased take-off
 * (slow lift) and a decelerating landing. Pure function → fully reversible.
 */
function shapeProgress(p: number): number {
  if (p <= TAKEOFF_END) {
    const u = p / TAKEOFF_END
    return TAKEOFF_END * Math.pow(u, 1.8)
  }
  if (p >= LANDING_START) {
    const u = (p - LANDING_START) / (1 - LANDING_START)
    return LANDING_START + (1 - LANDING_START) * (1 - (1 - u) * (1 - u))
  }
  return p
}

/* ------------------------------------------------------------------ *
 * Component — System B: the scroll-controlled main bird.
 * ------------------------------------------------------------------ */

/**
 * Scroll-controlled bird doodle flight (the "main bird").
 *
 * The bird rests on the miniature tree in the hero, weaves a curved route
 * through every section, and lands on the open palm in the Objective
 * photograph — then reverses exactly when scrolling up.
 *
 * Orientation is derived from the bird's ACTUAL movement between frames (not
 * the forward path tangent), so it always faces its direction of travel —
 * including when scrolling upward. A dead-zone + hold counter adds directional
 * hysteresis so the bird never flickers at reversal points.
 *
 * A single normalized scroll-progress controller feeds one requestAnimationFrame
 * loop that lerps toward the target — responsive, smooth, and jump-free on fast
 * scrolls. No competing scroll listeners, no per-scroll timelines.
 */
export function BirdFlight() {
  const birdRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const birdEl = birdRef.current
    if (!birdEl) return

    const setX = gsap.quickSetter(birdEl, 'x', 'px')
    const setY = gsap.quickSetter(birdEl, 'y', 'px')
    const setRotation = gsap.quickSetter(birdEl, 'rotation', 'deg')
    const setScaleX = gsap.quickSetter(birdEl, 'scaleX')
    const setScaleY = gsap.quickSetter(birdEl, 'scaleY')

    let waypoints: Pt[] = []
    let fracs: number[] = []
    let birdW = 0
    let birdH = 0

    // Orientation state (actual-movement based + hysteresis).
    let prevPt: Pt | null = null
    let facing: 1 | -1 = 1
    let pendingFace: 1 | -1 = 1
    let faceAgree = 0
    let smoothTilt = 0

    let wingState = ''
    const setWingState = (next: string) => {
      if (next !== wingState) {
        wingState = next
        birdEl.className = `bird-fly ${next}`
      }
    }

    const perchEl = document.querySelector('.doodle-tree-tip')
    if (!perchEl) {
      birdEl.style.opacity = '0'
      return
    }
    const perchNode: Element = perchEl

    /** Sample the route at progress t ∈ [0,1]. Y is linear between waypoints
     *  (so it tracks scroll and stays in view); X eases via smoothstep (so it
     *  weaves naturally). */
    const sample = (t: number): Pt => {
      const n = waypoints.length
      if (n === 0) return { x: 0, y: 0 }
      if (n === 1) return waypoints[0]
      const tc = clamp(t, 0, 1)
      let i = 0
      while (i < n - 2 && fracs[i + 1] < tc) i++
      const f0 = fracs[i]
      const f1 = fracs[i + 1]
      const local = f1 > f0 ? clamp((tc - f0) / (f1 - f0), 0, 1) : 0
      const a = waypoints[i]
      const b = waypoints[i + 1]
      return {
        x: a.x + (b.x - a.x) * smoothstep(local),
        y: a.y + (b.y - a.y) * local,
      }
    }

    /** Re-measures the DOM and rebuilds the route.
     *  Returns the scroll position where the landing is complete. */
    const rebuild = (): number => {
      const vw = window.innerWidth
      const vh = window.innerHeight

      birdW = birdEl.offsetWidth
      birdH = birdEl.offsetHeight

      const perch = docRect(perchNode)
      const perchPt = { x: perch.x + perch.w / 2, y: perch.y + perch.h / 2 }

      const figure = document.querySelector<HTMLElement>('#objective figure')
      if (!figure) {
        birdEl.style.opacity = '0'
        return 1
      }
      const fr = layoutRect(figure)
      const palm = { x: fr.x + fr.w * PALM.x, y: fr.y + fr.h * PALM.y }

      // Sections between hero and objective, discovered dynamically.
      const all = Array.from(document.querySelectorAll<HTMLElement>('main > section[id]'))
      const startIdx = all.findIndex((s) => s.id === 'home')
      const endIdx = all.findIndex((s) => s.id === 'objective')
      const sections = startIdx >= 0 && endIdx > startIdx ? all.slice(startIdx + 1, endIdx) : []

      // Horizontal safe band — keeps the whole bird inside the viewport with
      // ~8% padding on each side (Task 6), never at the extreme screen edges.
      const halfBird = birdW / 2
      const padL = vw * SAFE_PAD + halfBird
      const padR = vw * (1 - SAFE_PAD) - halfBird
      // Weave band sits comfortably inside the safe padding, so the bird
      // explores without hugging the edges or covering too much text.
      const bandL = Math.max(padL, vw * 0.15)
      const bandR = Math.min(padR, vw * 0.85)

      const pts: Pt[] = [perchPt]
      // Lift-off arc: swing right across the hero with a gentle rise.
      pts.push({ x: perchPt.x + vw * 0.16, y: perchPt.y + vh * 0.02 })
      pts.push({ x: perchPt.x + vw * 0.3, y: perchPt.y + vh * 0.12 })
      // One waypoint per section, alternating across the weave band → smooth
      // S-curves that stay inside the safe horizontal padding.
      sections.forEach((sec, i) => {
        const top = layoutRect(sec).y
        pts.push({ x: i % 2 === 0 ? bandL : bandR, y: top - 34 })
      })
      // Final approach: descend from the upper-left toward the open palm.
      pts.push({ x: palm.x - Math.min(230, vw * 0.22), y: palm.y - vh * 0.26 })
      pts.push({ x: palm.x - 80, y: palm.y - 90 })
      pts.push(palm)

      // Force Y to be strictly increasing (protects against any overlap).
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].y <= pts[i - 1].y) pts[i].y = pts[i - 1].y + 1
      }

      // Progress fraction of each waypoint = its share of the total drop, so
      // route progress maps ~1:1 onto scroll and the bird stays in view.
      const span = pts[pts.length - 1].y - pts[0].y
      fracs = pts.map((p) => (span > 0 ? (p.y - pts[0].y) / span : 0))
      fracs[0] = 0
      fracs[fracs.length - 1] = 1
      waypoints = pts

      birdEl.style.opacity = '1'

      // Landing completes when the palm reaches ~55% of the viewport.
      return Math.max(1, palm.y - vh * 0.55)
    }

    /** Draws the bird at a given raw scroll progress (0 → 1). */
    const render = (rawP: number) => {
      if (!waypoints.length || !birdW) return
      const p = clamp(rawP, 0, 1)
      const t = shapeProgress(p)

      const here = sample(t)

      // --- Actual movement since the last frame (document space == screen X). ---
      const mdx = prevPt ? here.x - prevPt.x : 0
      const mdy = prevPt ? here.y - prevPt.y : 0
      prevPt = { x: here.x, y: here.y }

      // Facing from real travel direction, with dead-zone + hold hysteresis so
      // it never flickers when the scroll wobbles around a reversal.
      if (Math.abs(mdx) > FACE_DEAD) {
        const want: 1 | -1 = mdx > 0 ? 1 : -1
        if (want === pendingFace) faceAgree++
        else {
          pendingFace = want
          faceAgree = 1
        }
        if (faceAgree >= FACE_HOLD && pendingFace !== facing) {
          facing = pendingFace
          faceAgree = 0
        }
      }

      const takeoff = smoothstep(p / TAKEOFF_END)
      const land = smoothstep((p - LANDING_START) / (1 - LANDING_START))
      const flight = takeoff * (1 - land)

      // Tilt from actual movement: nose-down when descending, nose-up when
      // climbing. Mirrored by `facing` so it stays correct in both directions.
      const tiltTarget = clamp((Math.atan2(mdy, Math.abs(mdx)) * 180) / Math.PI, -32, 32) * flight
      smoothTilt += (tiltTarget - smoothTilt) * 0.15

      // Gentle bobbing — a pure function of route progress, so it reverses
      // exactly when scrolling up.
      const bob = Math.sin(t * 150) * 3.2 * flight
      const scale = 0.86 + 0.14 * takeoff - 0.08 * land

      setX(here.x - birdW * ANCHOR.x)
      setY(here.y + bob - birdH * ANCHOR.y)
      setRotation(smoothTilt)
      setScaleX(facing * scale)
      setScaleY(scale)

      setWingState(
        p < 0.012
          ? 'is-perched'
          : p < TAKEOFF_END
            ? 'is-takingoff'
            : p < LANDING_START
              ? 'is-flying'
              : p < SETTLED
                ? 'is-landing'
                : 'is-landed',
      )
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let st: ScrollTrigger | null = null
    let rafId = 0
    let running = false
    let targetP = 0
    let currentP = 0

    // One normalized rAF loop: lerps current → target progress and renders.
    // Sleeps once settled, wakes on scroll. Prevents jumps on fast scrolling.
    const loop = () => {
      const diff = targetP - currentP
      if (Math.abs(diff) < 0.0004) {
        currentP = targetP
        render(currentP)
        running = false
        rafId = 0
        return
      }
      currentP += diff * FOLLOW
      render(currentP)
      rafId = requestAnimationFrame(loop)
    }
    const wake = () => {
      if (!running) {
        running = true
        rafId = requestAnimationFrame(loop)
      }
    }

    /** Reduced motion: bird simply sits on its branch (document space, so it
     *  stays glued to the tree with no flight and no scroll listeners). */
    const parkOnBranch = () => {
      const r = docRect(perchNode)
      setWingState('is-perched')
      birdEl.style.opacity = '1'
      setX(r.x + r.w / 2 - birdW * ANCHOR.x)
      setY(r.y + r.h / 2 - birdH * ANCHOR.y)
      setRotation(0)
      setScaleX(0.86)
      setScaleY(0.86)
      return () => {}
    }

    const startFlight = () => {
      st = ScrollTrigger.create({
        start: 0,
        // Re-measured on every refresh (resize, fonts, image loads).
        end: () => rebuild(),
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          targetP = self.progress
          wake()
        },
        onRefresh: (self) => {
          targetP = self.progress
          currentP = self.progress
          prevPt = null
          render(currentP)
        },
      })
      render(currentP)
    }

    let disposePark: (() => void) | null = null
    const applyMode = () => {
      st?.kill()
      st = null
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
      running = false
      disposePark?.()
      disposePark = null
      if (prefersReduced.matches) {
        disposePark = parkOnBranch()
      } else {
        startFlight()
      }
    }
    applyMode()
    prefersReduced.addEventListener('change', applyMode)

    // Keep the route aligned with the live layout.
    let refreshTimer = 0
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150)
    }
    const ro = new ResizeObserver(scheduleRefresh)
    ro.observe(document.body)
    window.addEventListener('resize', scheduleRefresh)
    window.addEventListener('load', scheduleRefresh)
    document.fonts?.ready.then(scheduleRefresh).catch(() => {})
    document.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', scheduleRefresh, { once: true })
    })

    return () => {
      prefersReduced.removeEventListener('change', applyMode)
      ro.disconnect()
      window.removeEventListener('resize', scheduleRefresh)
      window.removeEventListener('load', scheduleRefresh)
      if (refreshTimer) clearTimeout(refreshTimer)
      if (rafId) cancelAnimationFrame(rafId)
      disposePark?.()
      st?.kill()
    }
  }, [])

  return (
    <div ref={birdRef} className="bird-fly is-perched" style={{ opacity: 0 }} aria-hidden="true">
      <svg viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g className="bird-torso">
          {/* far wing — behind the body */}
          <g className="bird-wing-far">
            <path
              d="M46 28 C 44 18 38 8 30 6 C 31 16 37 24 44 31 Z"
              fill="#cbb894"
              stroke="#2b2620"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </g>

          {/* tail feathers */}
          <path
            d="M27 32 L5 20 L12 31 L4 36 L24 38 Z"
            fill="#dcc9a4"
            stroke="#2b2620"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* body */}
          <path
            d="M25 33 C 27 23 40 19 50 22 C 60 25 63 34 58 41 C 52 48 34 48 27 41 C 24 38 24 36 25 33 Z"
            fill="#f0e3ca"
            stroke="#2b2620"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* belly shade */}
          <path d="M31 41 C 38 46 50 46 56 40 C 50 45 37 46 31 41 Z" fill="#d8c49b" opacity="0.85" />

          {/* near wing — in front of the body */}
          <g className="bird-wing-near">
            <path
              d="M44 30 C 40 18 30 8 18 8 C 22 18 30 28 40 34 Z"
              fill="#e6d6b2"
              stroke="#2b2620"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M23 13 L28 23 M31 12 L35 22 M38 16 L41 25"
              stroke="#2b2620"
              strokeWidth="0.8"
              opacity="0.45"
              strokeLinecap="round"
            />
          </g>

          {/* head */}
          <g className="bird-head">
            <path
              d="M54 16 q 1.5 -4.5 5 -3.5 M58 15.4 q 2 -4 5 -2.4"
              stroke="#2b2620"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <circle cx="58" cy="24" r="9" fill="#f0e3ca" stroke="#2b2620" strokeWidth="1.6" />
            <g className="bird-eye">
              <circle cx="60.5" cy="22" r="2.2" fill="#221d17" />
              <circle cx="61.3" cy="21.2" r="0.75" fill="#ffffff" opacity="0.9" />
            </g>
            <path d="M66 22 L75 25 L66 28 Z" fill="#e8a317" stroke="#2b2620" strokeWidth="1.1" strokeLinejoin="round" />
          </g>

          {/* feet */}
          <g className="bird-feet" stroke="#d9971f" strokeWidth="1.7" strokeLinecap="round" fill="none">
            <path d="M37 46 L36 51.4 M36 51.4 L32.6 52.6 M36 51.4 L39.4 52.8" />
            <path d="M45 46 L45.5 51.4 M45.5 51.4 L42.4 52.8 M45.5 51.4 L48.9 52.5" />
          </g>

          {/* motion trail */}
          <g className="bird-trail" stroke="#a0906f" strokeWidth="1.4" strokeLinecap="round" fill="none">
            <path d="M16 27 q -7 -1 -11 2" />
            <path d="M18 36 q -8 1 -12 5" />
          </g>
        </g>
      </svg>
    </div>
  )
}

export default BirdFlight
