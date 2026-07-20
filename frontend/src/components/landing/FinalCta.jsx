import { Link } from 'react-router-dom'
import Reveal from './Reveal.jsx'

export default function FinalCta() {
  return (
    <section className="py-24 md:py-32 border-t border-lp-line relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-lp-violetsoft/60 to-transparent" />
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-[-0.03em] text-lp-ink leading-[1.02] [text-wrap:balance] mb-6">
            Paste a link.{' '}
            <span className="bg-gradient-to-r from-lp-violet to-lp-violet2 bg-clip-text text-transparent">
              Read the video back.
            </span>
          </h2>
          <p className="text-lp-muted text-[16.5px] leading-relaxed mb-10 max-w-lg mx-auto">
            No sign-up walls between you and the report. Drop in a YouTube link and watch four
            agents go to work.
          </p>
          <Link
            to="/app"
            className="group inline-flex items-center gap-1.5 bg-lp-ink text-white text-[15px] font-medium px-6 py-3.5 rounded-full hover:bg-lp-violet transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
          >
            Try it now
            <span className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
