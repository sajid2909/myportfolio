import Reveal from '../components/Reveal'
import PortfolioImage from '../components/PortfolioImage'
import { portfolioImages } from '../config/portfolioImages'

export function Objective() {
  return (
    <section id="objective" className="pb-[clamp(44px,5vw,90px)]">
      <div className="shell">
        <div className="grid grid-cols-1 items-center gap-14 pt-[clamp(44px,5vw,90px)] lg:grid-cols-12 lg:gap-16">
          {/* Left column — editorial statement */}
          <div className="lg:col-span-7">
            <Reveal>
              <p className="label text-muted">My objective</p>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="display-section mt-10 max-w-[24ch] text-paper">
                My objective is to grow as a software developer by building{' '}
                <span className="italic">reliable applications</span>, strengthening my expertise in
                modern technologies, and contributing to{' '}
                <span className="italic">meaningful software solutions</span>.
              </p>
            </Reveal>
          </div>

          {/* Right column — vertical portrait */}
          <div className="lg:col-span-5">
            <Reveal delay={0.15} y={32} amount={0.05}>
              <PortfolioImage
                src={portfolioImages.objective}
                alt="Portrait of Mohammad Sajid"
                aspectRatio="4 / 5"
                objectPosition="center"
                placeholderLabel="Objective portrait — image to be added"
                className="mx-auto w-full max-w-[380px] lg:max-w-none"
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Objective
