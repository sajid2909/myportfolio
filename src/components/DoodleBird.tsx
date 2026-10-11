import type { SVGProps } from 'react'

interface DoodleBirdProps extends SVGProps<SVGSVGElement> {
  /** When true, bird is in flight (wings up). When false, perched. */
  flying?: boolean
  /** Optional perching offset so bird sits on a branch tip. */
  perchOffsetX?: number
  perchOffsetY?: number
}

export function DoodleBird({
  flying = false,
  perchOffsetX = 0,
  perchOffsetY = 0,
  ...rest
}: DoodleBirdProps) {
  // Wing rotation is driven by CSS class on the bird root element.
  return (
    <svg
      viewBox="0 0 80 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `translate(${perchOffsetX}px, ${perchOffsetY}px)` }}
      {...rest}
    >
      {/* body */}
      <path
        d="M12 34 C 16 26, 30 24, 44 28 C 52 30, 56 34, 52 38 C 46 40, 30 40, 18 38 C 14 36, 12 36, 12 34 Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* tail */}
      <path
        d="M12 34 L2 26 L6 32 Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* head */}
      <circle cx="54" cy="24" r="6" stroke="currentColor" strokeWidth="2.2" fill="none" />
      {/* beak */}
      <path
        d="M59 23 L64 24.5 L59 26"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* eye */}
      <circle cx="55.5" cy="22.5" r="0.9" fill="currentColor" />

      {/* left wing (upper in flight) */}
      <g className="doodle-bird-wing-left" style={{ transformOrigin: '30px 28px' }}>
        <path
          d="M30 28 C 24 18, 14 14, 6 20 C 12 22, 22 26, 28 30 Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="doodle-bird-wing"
        />
      </g>

      {/* right wing (lower in flight) */}
      <g className="doodle-bird-wing-right" style={{ transformOrigin: '48px 28px' }}>
        <path
          d="M48 28 C 54 18, 64 14, 72 20 C 66 22, 56 26, 50 30 Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="doodle-bird-wing"
        />
      </g>

      {/* feet (visible only when perched) */}
      {!flying && (
        <>
          <path
            d="M30 40 L28 46 M30 40 L32 46"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="doodle-bird-feet"
          />
          <path
            d="M46 40 L44 46 M46 40 L48 46"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="doodle-bird-feet"
          />
        </>
      )}

      {/* decorative motion line when flying */}
      {flying && (
        <path
          d="M8 30 q -8 -2 -12 2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.6"
          className="doodle-bird-trail"
        />
      )}
    </svg>
  )
}

export default DoodleBird
