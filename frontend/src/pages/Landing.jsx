import About from '../components/landing/About.jsx'
import Features from '../components/landing/Features.jsx'
import FinalCta from '../components/landing/FinalCta.jsx'
import Footer from '../components/landing/Footer.jsx'
import Hero from '../components/landing/Hero.jsx'
import Navbar from '../components/landing/Navbar.jsx'
import Pipeline from '../components/landing/Pipeline.jsx'
import Stack from '../components/landing/Stack.jsx'

export default function Landing() {
  return (
    <div className="relative bg-lp-bg text-lp-ink min-h-screen">
      {/* fine film-grain wash across the whole stage, kept very quiet */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-grain opacity-[0.035] mix-blend-overlay" />
      <Navbar />
      <Hero />
      <Features />
      <Pipeline />
      <Stack />
      <About />
      <FinalCta />
      <Footer />
    </div>
  )
}
