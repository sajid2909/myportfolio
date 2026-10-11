import Reveal from '../components/Reveal'
import SectionHeader from '../components/SectionHeader'
import PortfolioImage from '../components/PortfolioImage'
import { portfolioImages } from '../config/portfolioImages'

const focusAreas = [
  'Modern web technologies',
  'Artificial intelligence & machine learning',
  'Cloud computing',
  'DevOps practices',
]

export function About() {
  return (
    <section id="about" className="section-y">
      <div className="shell">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Left column — heading, intro, focus areas */}
          <div className="lg:col-span-7">
            <SectionHeader label="01 / About" title="A little about me." />

            <Reveal delay={0.16} className="mt-10 max-w-[54ch] space-y-6">
              <p className="body-copy text-paper-dim">
                I'm Mohammad Sajid, an aspiring software developer based in Hyderabad, with a strong
                interest in modern web technologies, artificial intelligence, machine learning, cloud
                computing, and DevOps.
              </p>
              <p className="body-copy text-paper-dim">
                I enjoy exploring new technologies, strengthening my programming skills, and
                building practical solutions that combine thoughtful design with reliable
                functionality.
              </p>
            </Reveal>

            <Reveal delay={0.24} className="mt-14">
              <p className="label text-muted">Focus areas</p>
              <ul className="mt-6 grid grid-cols-1 border-t border-line sm:grid-cols-2">
                {focusAreas.map((area) => (
                  <li
                    key={area}
                    className="body-copy border-b border-line py-5 pr-6 text-paper transition-colors duration-300 hover:text-hover"
                  >
                    {area}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Right column — portrait placeholder */}
          <div className="lg:col-span-5">
            <Reveal y={32} amount={0.05}>
              <PortfolioImage
                src={portfolioImages.about}
                alt="Portrait of Mohammad Sajid"
                aspectRatio="4 / 5"
                placeholderLabel="About portrait — image to be added"
                className="w-full"
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
