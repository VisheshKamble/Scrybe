import { Link } from 'react-router-dom'
import { Stagger, StaggerItem } from './Reveal.jsx'

export default function FinalCta() {
  return (
    <section className="relative py-28 md:py-40 border-t border-lp-line overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-lp-bg" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full bg-gradient-to-br from-lp-violet/25 via-lp-violet/5 to-transparent blur-[100px] -z-10 animate-orb-drift" />
      <div className="absolute inset-0 -z-10 bg-grid opacity-[0.15]" />

      <div className="max-w-3xl mx-auto px-6 text-center">
        <Stagger amount={0.4} stagger={0.12}>
          <StaggerItem as="h2" className="font-display text-4xl md:text-7xl font-semibold tracking-[-0.03em] text-lp-ink leading-[1.0] [text-wrap:balance] mb-6">
            Paste a link.{' '}
            <span className="text-gradient italic font-bold">Read the video back.</span>
          </StaggerItem>
          <StaggerItem as="p" className="text-lp-muted text-[16.5px] leading-relaxed mb-10 max-w-lg mx-auto">
            No sign-up walls between you and the report. Drop in a YouTube link and watch four
            agents go to work.
          </StaggerItem>
          <StaggerItem>
            <Link
              to="/app"
              className="group relative inline-flex items-center gap-1.5 overflow-hidden bg-lp-ink text-lp-bg text-[15px] font-semibold px-6 py-3.5 rounded-full transition-shadow duration-300 hover:shadow-violet-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-lp-violet to-lp-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">Try it now</span>
              <span className="relative transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  )
}
