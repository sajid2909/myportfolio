import Reveal from '../components/Reveal'
import SectionHeader from '../components/SectionHeader'

const strengths = [
  'Problem-solving',
  'Analytical thinking',
  'Continuous learning',
  'Team collaboration',
  'Adaptability',
  'Communication',
  'Attention to detail',
]

export function Strengths() {
  return (
    <section id="strengths" className="section-y">
      <div className="shell">
        <SectionHeader label="05 / Strengths" title="Beyond the code." />

        <div className="mt-16 border-t border-line md:mt-24">
          {strengths.map((strength, index) => (
            <Reveal key={strength} delay={0.04 * index}>
              <div className="group flex items-baseline justify-between gap-8 border-b border-line py-7 md:py-9">
                <h3 className="display-row text-paper transition-colors duration-300 group-hover:text-hover">
                  <span className="inline-block transition-transform duration-500 ease-out group-hover:translate-x-2">
                    {strength}
                  </span>
                </h3>
                <span className="label shrink-0 text-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Strengths
