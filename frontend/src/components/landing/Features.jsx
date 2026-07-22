import { motion } from 'framer-motion'
import { Eye, FileStack, GitCompare, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react'
import Reveal from './Reveal.jsx'

const FEATURES = [
  {
    icon: Eye,
    title: 'Watches, not just listens',
    body: "Transcribes the audio and reads the screen separately — slides, code, charts, and on-screen text all get read by a vision model, not guessed at from the soundtrack.",
    span: 'md:col-span-2',
    accent: 'from-lp-violet/15',
  },
  {
    icon: ShieldCheck,
    title: 'Fact-checked, not just summarized',
    body: 'Claims made in the video are checked against live web search before the summary is written, so confident-sounding nonsense gets caught.',
  },
  {
    icon: FileStack,
    title: 'Chapters that make sense',
    body: 'The segmentation agent finds real topic boundaries and builds a navigable chapter list, instead of splitting on fixed time intervals.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask it anything, get a timestamp',
    body: 'Every answer in the chat is grounded in the video via a FAISS index and cites the exact second it came from — click it, jump straight there.',
  },
  {
    icon: GitCompare,
    title: 'Compare videos',
    body: 'Run two or more videos through the pipeline together and get a single synthesized comparison instead of reading two reports side by side.',
  },
  {
    icon: Sparkles,
    title: 'Watch the report write itself',
    body: 'The summary streams in live over SSE as the synthesis agent writes it — then export the finished report as PDF or Markdown in one click.',
    span: 'md:col-span-2',
    accent: 'from-lp-cyan/15',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}

export default function Features() {
  return (
    <section
      id="features"
      className="relative z-10 py-24 md:py-32 rounded-t-[2.5rem] lg:rounded-t-[3rem] border-t border-lp-line2 bg-lp-bg shadow-[0_-40px_80px_-40px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      <div className="absolute top-[5%] left-[15%] w-[420px] h-[420px] bg-lp-violet/[0.05] blur-[130px] -z-10 animate-orb-drift" style={{ animationDelay: '-10s' }} />
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="max-w-xl mb-14">
          <p className="font-mono text-[10px] tracking-[0.14em] text-lp-cyan mb-3">FEATURES</p>
          <h2 className="font-display text-3xl md:text-[2.75rem] font-semibold tracking-[-0.025em] text-lp-ink leading-[1.05] [text-wrap:balance]">
            Everything you'd do manually, done in one pass.
          </h2>
        </Reveal>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid md:grid-cols-3 gap-4"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                variants={item}
                className={`group relative overflow-hidden rounded-2xl border border-lp-line bg-lp-card p-6 hover:border-lp-violet/40 hover:shadow-violet-glow transition-all duration-300 ${f.span ?? ''}`}
              >
                <div
                  className={`pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${f.accent ?? 'from-lp-violet/10'} to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className="relative w-9 h-9 rounded-lg bg-lp-violet/10 border border-lp-violet/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-lp-violet/15 transition-all duration-300">
                  <Icon size={17} className="text-lp-violet2" strokeWidth={2} />
                </div>
                <h3 className="relative text-[15.5px] font-semibold text-lp-ink mb-1.5">{f.title}</h3>
                <p className="relative text-[14px] text-lp-muted leading-relaxed">{f.body}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
