import Reveal from '../components/Reveal'
import { portfolioVideos } from '../config/portfolioImages'

export function Creative() {
  return (
    <section id="creative" className="bg-ink-deep py-[clamp(44px,5vw,90px)]">
      <div className="shell">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Oversized statement */}
          <div className="flex flex-col justify-center lg:col-span-7">
            <Reveal>
              <h2 className="display-major text-paper">
                <span className="block">Curiosity drives</span>
                <span className="block italic">progress.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="body-copy mt-10 max-w-[40ch] text-paper-dim">
                Always learning, exploring, and improving through technology.
              </p>
            </Reveal>
          </div>

          {/* Dramatic tall video — stacks vertically on mobile, offset on desktop */}
          <div className="lg:col-span-5">
            <Reveal delay={0.15} y={40} amount={0.05}>
              <video
                style={{ aspectRatio: '4 / 5' }}
                className="w-full h-full object-cover transition-transform duration-700 ease-out will-change-transform hover:scale-[1.03]"
                src={portfolioVideos.creative}
                poster="/images/creative.jpg"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onCanPlayCapture={(e) => {
                  const v = e.currentTarget
                  if (v.paused) v.play().catch(() => {})
                }}
                aria-label="Creative portrait of Mohammad Sajid with rain on glass"
                tabIndex={-1}
                role="img"
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Creative
