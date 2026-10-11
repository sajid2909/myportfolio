import type { CSSProperties, ReactNode } from 'react'

export interface PortfolioImageProps {
  /** Absolute or relative path to the photograph. Empty string renders a placeholder. */
  src?: string
  /** Accessible description of the photograph. */
  alt?: string
  /** CSS aspect-ratio value, e.g. "4 / 5". */
  aspectRatio?: string
  /** Extra classes applied to the outer container. */
  className?: string
  /** object-position value for responsive cropping, e.g. "50% 20%". */
  objectPosition?: string
  /** Small label shown inside the empty placeholder. */
  placeholderLabel?: string
  /** Optional transparent layer rendered above the photograph, clipped to its bounds. */
  overlay?: ReactNode
}

/**
 * Responsive image container.
 *
 * - `src` empty / undefined → empty dark placeholder with a small label,
 *   correct dimensions preserved, no broken-image icon, no stock photo.
 * - valid `src` → photograph with `object-fit: cover`, responsive cropping,
 *   and a gentle zoom on hover. Layout never changes.
 */
export function PortfolioImage({
  src,
  alt = '',
  aspectRatio = '4 / 5',
  className = '',
  objectPosition = 'center',
  placeholderLabel = 'IMAGE TO BE ADDED',
  overlay,
}: PortfolioImageProps) {
  const hasImage = typeof src === 'string' && src.trim().length > 0

  const containerStyle: CSSProperties = { aspectRatio }

  return (
    <figure
      className={`relative m-0 overflow-hidden border border-line bg-placeholder ${className}`}
      style={containerStyle}
    >
      {hasImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform hover:scale-[1.03]"
          style={{ objectPosition }}
          draggable={false}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center px-6 py-6 text-center"
          aria-hidden="true"
        >
          <span className="label text-muted">{placeholderLabel}</span>
        </div>
      )}
      {hasImage && overlay}
    </figure>
  )
}

export default PortfolioImage
