import Reveal from '../components/Reveal'
import DoodleTreeScene from '../components/DoodleTreeScene'
import FlockBirds from '../components/FlockBirds'
import PortfolioImage from '../components/PortfolioImage'
import { portfolioImages } from '../config/portfolioImages'
import { site } from '../config/site'

export function Hero() {
  return (
    <section id="home" className="relative pt-[clamp(80px,11vw,160px)]">
      <div className="shell">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Left column — editorial intro */}
          <div className="flex flex-col justify-start lg:col-span-7">
            {/* Doodle perching scene — sits in the existing empty space above
                the label (absolutely positioned, so nothing else moves). */}
            <div className="relative">
              <div className="pointer-events-none absolute bottom-full left-0 mb-2 h-[clamp(56px,8.5vw,124px)] select-none sm:mb-3">
                <DoodleTreeScene className="h-full w-auto text-[#8f8f8f]" />
                {/* System A — small background birds drifting near the tree.
                    Independent of scroll; pauses when it scrolls offscreen. */}
                <FlockBirds />
              </div>
              <Reveal>
                <p className="label text-muted">Portfolio / 2026</p>
              </Reveal>
            </div>

            <Reveal delay={0.08}>
              <h1 className="display-hero mt-8 text-paper md:mt-10">
                <span className="block">Mohammad</span>
                <span className="block">Sajid.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.18}>
              <p className="mt-8 text-[clamp(15px, 1.3vw, 20px)] font-medium leading-snug tracking-tight text-paper">
                {site.title}
              </p>
            </Reveal>

            <Reveal delay={0.26}>
              <p className="body-copy mt-6 max-w-[46ch] text-paper-dim">{site.intro}</p>
            </Reveal>
          </div>

          {/* Right column — portrait placeholder */}
          <div className="lg:col-span-5">
            <Reveal delay={0.2} y={32} amount={0.05}>
              <PortfolioImage
                src={portfolioImages.hero}
                alt={`Portrait of ${site.name}`}
                aspectRatio="4 / 5"
                placeholderLabel="Hero portrait — image to be added"
                className="w-full"
              />
            </Reveal>
          </div>
        </div>
      </div>

      <div className="shell mt-[clamp(64px,8vw,120px)]">
        <div className="hairline" />
      </div>
    </section>
  )
}

export default Hero
