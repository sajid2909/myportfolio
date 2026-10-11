import { MotionConfig } from 'motion/react'
import BirdFlight from './components/BirdFlight'
import Footer from './components/Footer'
import Hero from './sections/Hero'
import About from './sections/About'
import Expertise from './sections/Expertise'
import Skills from './sections/Skills'
import Creative from './sections/Creative'
import Strengths from './sections/Strengths'
import Objective from './sections/Objective'
import Contact from './sections/Contact'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[60] focus:border focus:border-line focus:bg-ink focus:px-5 focus:py-3 focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest focus:text-paper"
      >
        Skip to content
      </a>

      <div className="min-h-screen bg-ink text-paper">
        <main id="main-content">
          <Hero />
          <About />
          <Expertise />
          <Skills />
          <Creative />
          <Strengths />
          <Objective />
          <Contact />
        </main>
        <Footer />
        <BirdFlight />
      </div>
    </MotionConfig>
  )
}
