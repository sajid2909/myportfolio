import DoodleTree from './DoodleTree'

interface DoodleTreeSceneProps {
  className?: string
}

/**
 * Stationary hero doodle: a small patch of grass with a miniature tree
 * growing out of it. Hand-drawn monochrome styling that complements the
 * dark theme.
 *
 * The bird perches on the tree's selected branch tip. <BirdFlight />
 * discovers that point at runtime through the `.doodle-tree-tip` marker
 * rendered by <DoodleTree />.
 */
export function DoodleTreeScene({ className = '' }: DoodleTreeSceneProps) {
  return (
    <div
      className={`pointer-events-none relative inline-block select-none ${className}`}
      aria-hidden="true"
    >
      {/* grass patch — sits at the base of the tree, slightly wider */}
      <svg
        className="absolute bottom-0 left-1/2 w-[128%] -translate-x-1/2"
        viewBox="0 0 160 24"
        fill="none"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke="#6f6f6f"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        >
          {/* left tuft */}
          <path d="M10 23 q 1 -9 6 -13" />
          <path d="M14 23 q -1 -7 -5 -10" />
          <path d="M22 23 q 3 -8 9 -11" />
          {/* middle tuft */}
          <path d="M66 23 q 1 -11 7 -15" />
          <path d="M72 23 q -1 -8 -6 -11" />
          <path d="M80 23 q 3 -9 10 -12" />
          <path d="M88 23 q 0 -6 4 -9" />
          {/* right tuft */}
          <path d="M128 23 q 2 -10 8 -13" />
          <path d="M134 23 q -1 -8 -6 -10" />
          <path d="M144 23 q 2 -7 7 -9" />
        </g>
        {/* soft ground line */}
        <path
          d="M4 23.4 q 40 1.4 76 0 q 40 -1.4 76 0"
          stroke="#5a5a5a"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* miniature tree — the selected branch (left, mid-height) is the perch */}
      <DoodleTree
        branchTipX={18}
        branchTipY={92}
        className="relative block h-full w-auto"
      />
    </div>
  )
}

export default DoodleTreeScene
