import { W } from '../ui.jsx'
import LinkForm from './LinkForm.jsx'

export default function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue via-violet to-pink rounded-t-[2.5rem] md:rounded-t-[4rem] -mt-10 pt-28 pb-28 md:pt-36 md:pb-36">
      <div className="absolute inset-0 bg-dots-light opacity-70" aria-hidden="true" />
      <div className="absolute -left-20 top-10 w-72 h-72 rounded-full bg-mark animate-drift" aria-hidden="true" />
      <div className="absolute -right-16 bottom-0 w-80 h-80 rounded-full bg-mint animate-drift" style={{ animationDelay: '-7s' }} aria-hidden="true" />
      <div className="relative max-w-3xl mx-auto px-5 sm:px-6 text-center">
        <h2 className="font-display font-extrabold text-[clamp(2.6rem,7.4vw,5.6rem)] leading-[1] tracking-[-0.05em] text-white [text-wrap:balance]">
          Paste a link.<br />Read the video <W c="mark" tilt={-2}>back</W>.
        </h2>
        <p className="mt-7 text-[18px] leading-[1.6] text-white/90 max-w-md mx-auto">No sign-up between you and the report.</p>
        <div className="mt-10 max-w-xl mx-auto text-left"><LinkForm id="cta-link" dark /></div>
      </div>
    </section>
  )
}
