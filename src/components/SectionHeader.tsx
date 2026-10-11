import Reveal from './Reveal'

interface SectionHeaderProps {
  /** e.g. "01 / ABOUT" */
  label: string
  /** Editorial heading text */
  title: string
  className?: string
  /** Optional supporting description shown beneath the heading */
  description?: string
  descriptionClassName?: string
}

export function SectionHeader({
  label,
  title,
  className = '',
  description,
  descriptionClassName = '',
}: SectionHeaderProps) {
  return (
    <div className={className}>
      <Reveal>
        <p className="label text-muted">{label}</p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="display-major mt-6 text-paper">{title}</h2>
      </Reveal>
      {description ? (
        <Reveal delay={0.16}>
          <p className={`body-copy mt-8 max-w-[52ch] text-paper-dim ${descriptionClassName}`}>
            {description}
          </p>
        </Reveal>
      ) : null}
    </div>
  )
}

export default SectionHeader
