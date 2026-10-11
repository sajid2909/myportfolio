import type { ReactNode } from 'react'
import { motion } from 'motion/react'

interface RevealProps {
  children: ReactNode
  /** Delay in seconds — used for gentle staggered text appearance. */
  delay?: number
  /** Initial vertical offset in pixels. */
  y?: number
  className?: string
  /** How much of the element must be visible before it animates in. */
  amount?: number
}

/**
 * Subtle scroll reveal: soft fade-in with a small upward movement.
 * Respects `prefers-reduced-motion` via MotionConfig in App.
 */
export function Reveal({ children, delay = 0, y = 24, className, amount = 0.2 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default Reveal
