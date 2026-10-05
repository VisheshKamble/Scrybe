import FinalCta from '../components/landing/FinalCta.jsx'
import Footer from '../components/landing/Footer.jsx'
import Hero from '../components/landing/Hero.jsx'
import Limits from '../components/landing/Limits.jsx'
import Marquee from '../components/landing/Marquee.jsx'
import Navbar from '../components/landing/Navbar.jsx'
import Pipeline from '../components/landing/Pipeline.jsx'
import Reads from '../components/landing/Reads.jsx'
import RunIt from '../components/landing/RunIt.jsx'
import Stats from '../components/landing/Stats.jsx'
import UseCases from '../components/landing/UseCases.jsx'

export default function Landing() {
  return (
    <div className="relative bg-paper text-ink min-h-screen overflow-x-clip">
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Reads />
        <Stats />
        <UseCases />
        <Pipeline />
        <RunIt />
        <Limits />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
