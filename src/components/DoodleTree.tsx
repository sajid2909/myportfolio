import type { SVGProps } from 'react'

interface DoodleTreeProps extends SVGProps<SVGSVGElement> {
  branchTipX: number
  branchTipY: number
}

export function DoodleTree({
  branchTipX,
  branchTipY,
  ...rest
}: DoodleTreeProps) {
  return (
    <svg
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      {/* trunk */}
      <path
        d="M60 132 L56 92 L64 92 L60 132 Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* roots / base */}
      <path
        d="M56 132 L44 138 M64 132 L76 138"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* branches */}
      <path
        d="M60 98 L36 80 L30 70"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M60 90 L86 74 L92 64"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* selected branch — the one the bird perches on */}
      <path
        d="M60 104 L26 100 L18 92"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="doodle-tree-branch"
      />
      <path
        d="M60 104 L96 104 L104 96"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* foliage clusters (doodle circles) */}
      <circle cx="30" cy="66" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="44" cy="60" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="70" cy="58" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="86" cy="70" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="84" cy="96" r="5" stroke="currentColor" strokeWidth="2" fill="none" />

      {/* branch tip marker used by the bird for perching */}
      <circle
        cx={branchTipX}
        cy={branchTipY}
        r="1.6"
        fill="currentColor"
        className="doodle-tree-tip"
      />
    </svg>
  )
}

export default DoodleTree
