import { motion } from 'framer-motion'
import { Eye, FileText, Quote, ShieldCheck } from 'lucide-react'
import { W } from '../ui.jsx'
import LinkForm from './LinkForm.jsx'
import MarginDemo from './MarginDemo.jsx'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }

// The same colour-code used everywhere else: said, shown, true, cited.
const PROOF = [
  { icon: FileText, label: 'Reads what’s said', tone: 'bg-mark' },
  { icon: Eye, label: 'Reads what’s on screen', tone: 'bg-sky' },
  { icon: ShieldCheck, label: 'Checks the claims', tone: 'bg-mint' },
  { icon: Quote, label: 'Cites the second', tone: 'bg-pink' },
]
const TOOLS = ['Groq', 'Whisper', 'yt-dlp', 'PySceneDetect', 'LangGraph', 'FAISS', 'Celery', 'Redis']

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-blue rounded-b-[2.5rem] md:rounded-b-[4rem] pt-28 sm:pt-32 lg:pt-36 pb-28 md:pb-32">
      {/* colour field */}
      <div className="absolute inset-0 bg-dots-light opacity-80" aria-hidden="true" />
      <div className="absolute -top-32 -right-24 w-[34rem] h-[34rem] rounded-full bg-pink opacity-90 blur-[2px] animate-drift" aria-hidden="true" />
      <div className="absolute top-1/2 -left-44 w-[28rem] h-[28rem] rounded-full bg-violet animate-drift" style={{ animationDelay: '-6s' }} aria-hidden="true" />
      <div className="absolute -bottom-40 right-1/4 w-[24rem] h-[24rem] rounded-full bg-sky opacity-80 animate-drift" style={{ animationDelay: '-3s' }} aria-hidden="true" />
      <div className="absolute top-28 right-[44%] w-5 h-5 rounded-full bg-mark hidden lg:block" aria-hidden="true" />
      <div className="absolute bottom-40 left-[48%] w-3 h-3 rounded-full bg-mint hidden lg:block" aria-hidden="true" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 grid lg:grid-cols-[1.02fr_1fr] gap-14 lg:gap-14 items-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.p variants={item} className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm pl-1.5 pr-3.5 py-1.5 text-[13px] font-semibold text-white mb-7">
            <span className="rounded-full bg-mark px-2.5 py-0.5 text-[11.5px] font-extrabold text-ink">Open source</span>
            Video intelligence on LangGraph
          </motion.p>

          <h1 className="font-display font-extrabold text-[clamp(2.7rem,6.6vw,4.9rem)] leading-[1.02] tracking-[-0.045em] text-white [text-wrap:balance]">
            <motion.span variants={item} className="block">Paste a video.</motion.span>
            <motion.span variants={item} className="block">Get back what was</motion.span>
            <motion.span variants={item} className="block mt-1">
              <W c="mark" tilt={-2}>said</W>, <W c="sky" tilt={1.5}>shown</W>, and <W c="mint" tilt={-1}>true</W>.
            </motion.span>
          </h1>

          <motion.p variants={item} className="mt-7 text-[18px] leading-[1.55] text-white/85 max-w-[30rem]">
            Scrybe transcribes the audio, reads the slides and code on screen, fact-checks the claims,
            and hands you a chaptered report. Every line points to the second it came from.
          </motion.p>

          <motion.div variants={item} className="mt-9 max-w-[31rem]">
            <LinkForm id="hero-link" dark />
          </motion.div>

          <motion.ul variants={item} className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3.5 max-w-[31rem]">
            {PROOF.map(({ icon: Icon, label, tone }) => (
              <li key={label} className="flex items-center gap-2.5 text-[14px] font-bold text-white">
                <span className={`w-8 h-8 rounded-xl ${tone} text-ink border-2 border-ink flex items-center justify-center shrink-0`}>
                  <Icon size={15} strokeWidth={2.6} />
                </span>
                {label}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }} className="md:px-6">
          <MarginDemo />
        </motion.div>
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 mt-20">
        <p className="text-[14px] font-bold text-white/80 mb-4">Reads videos through</p>
        <ul className="flex flex-wrap gap-2.5">
          {TOOLS.map((t) => (
            <li key={t} className="rounded-full border-2 border-white/40 bg-white/10 px-4 py-1.5 text-[15px] font-extrabold tracking-[-0.01em] text-white hover:bg-white hover:text-ink hover:border-white transition-colors">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
