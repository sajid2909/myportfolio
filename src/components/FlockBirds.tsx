import { useEffect, useRef, useState } from 'react'

/* ------------------------------------------------------------------ *
 * System A — background flock.
 *
 * A few small doodle birds that drift gently around the hero tree. They are
 * fully independent of the scroll-controlled main bird (<BirdFlight />): their
 * motion is driven entirely by CSS keyframes (GPU transforms only) with
 * deliberately different paths, durations and delays so they never sync up.
 *
 * They stay in a compact area around the tree, pause when that area scrolls
 * out of view, and freeze entirely under prefers-reduced-motion.
 * ------------------------------------------------------------------ */

interface FlockBird {
  id: number
  /** top-left position as a percentage of the flock area */
  pos: { left: string; top: string }
  /** rendered width in px */
  width: number
}

const FLOCK: FlockBird[] = [
  // Two birds gently circling the canopy…
  { id: 1, pos: { left: '10%', top: '30%' }, width: 17 },
  { id: 2, pos: { left: '60%', top: '12%' }, width: 15 },
  // One more glides through a shallow arc lower down.
  { id: 3, pos: { left: '34%', top: '54%' }, width: 13 },
]

/** A tiny, thin hand-drawn side-profile bird. Muted warm greys stay visible
 *  on the black background without being colourful or cartoonish. */
function FlockBirdSvg() {
  return (
    <svg viewBox="0 0 26 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* tail */}
      <path
        d="M6.5 8 L1 5.4 L4 8 L1 10.8 Z"
        fill="#b4ab99"
        stroke="#28231d"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* body */}
      <path
        d="M5 8 C 7 5.2 12 4.6 16 6 C 19 7 21 7.6 22.6 8 C 21 10 18 11.2 14 11.2 C 10 11.2 6.4 10.2 5 8 Z"
        fill="#cbc2b0"
        stroke="#28231d"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* beak */}
      <path d="M22.4 7.4 L25.6 8 L22.4 8.9 Z" fill="#d9971f" stroke="#28231d" strokeWidth="0.4" strokeLinejoin="round" />
      {/* eye */}
      <circle cx="20" cy="7.5" r="0.65" fill="#221d17" />
      {/* flapping wing */}
      <g className="flock-wing">
        <path
          d="M12.5 7.6 C 10.5 4.4 7.5 2.4 4.4 2.4 C 6.2 5.2 8.4 7 11.4 9 Z"
          fill="#ddd4c1"
          stroke="#28231d"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

export function FlockBirds({ className = '' }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  // Pause the looping animations whenever the flock leaves the viewport so we
  // don't burn cycles animating something nobody can see.
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), {
      threshold: 0,
    })
    io.observe(root)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={rootRef}
      className={`bird-flock pointer-events-none select-none ${paused ? 'is-paused' : ''} ${className}`}
      aria-hidden="true"
    >
      {FLOCK.map((b) => (
        <div
          key={b.id}
          className={`flock-bird flock-bird--${b.id}`}
          style={{ left: b.pos.left, top: b.pos.top, width: `${b.width}px` }}
        >
          <FlockBirdSvg />
        </div>
      ))}
    </div>
  )
}

export default FlockBirds
