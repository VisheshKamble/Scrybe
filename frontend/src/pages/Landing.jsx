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
    <div className="bg-lp-bg text-lp-ink min-h-screen [background-image:radial-gradient(circle_at_top_right,rgba(139,92,246,0.08),transparent_45%)]">
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
