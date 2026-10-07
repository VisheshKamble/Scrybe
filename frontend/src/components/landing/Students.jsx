import { motion } from 'framer-motion'
import { BadgeCheck, GraduationCap, Route, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'

const PROBLEMS = [
  { Icon: Timer, tone: 'bg-mark', problem: 'The lecture is 2 hours long', fix: 'Ask for the five minutes you need and jump straight to them.' },
  { Icon: GraduationCap, tone: 'bg-mint', problem: 'Watching feels like learning. It isn’t.', fix: 'Get quizzed on the video itself. Questions come from what was actually said.' },
  { Icon: BadgeCheck, tone: 'bg-sky', problem: 'AI answers you can’t trust', fix: 'Every answer is checked against the transcript and shows its sources.' },
  { Icon: Route, tone: 'bg-pink', problem: 'No idea what to review', fix: 'Missed questions link to the exact second to rewatch, then become a study plan.' },
]
// Counts below are literal facts about the product, not performance claims.
const FACTS = [['5', 'ways to learn', 'ask · teach · quiz · plan · compare'], ['4', 'agent tools', 'retrieve · time-travel · chapters · metadata'], ['1', 'rule', 'no timestamp without evidence']]

export default function Students() {
  return (
    <section aria-labelledby="students-h" className="relative px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 font-mono text-[12px] font-bold uppercase tracking-widest text-blue">Built for students</p>
        <h2 id="students-h" className="max-w-3xl font-display text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[1.05] tracking-tight">
          Turn any study video into a <span className="gradient-text">practice exam</span>.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PROBLEMS.map(({ Icon, tone, problem, fix }, i) => (
            <motion.article key={problem} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: i * 0.07 }}
              className="lift rounded-2xl border-2 border-ink bg-white p-5">
              <span className={`mb-3 grid h-10 w-10 place-items-center rounded-xl border-2 border-ink ${tone}`}><Icon size={20} aria-hidden="true" /></span>
              <h3 className="font-display text-[1.15rem] font-extrabold text-ink-soft line-through decoration-pink decoration-2">{problem}</h3>
              <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">{fix}</p>
            </motion.article>
          ))}
        </div>
        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          {FACTS.map(([n, label, sub]) => (
            <div key={label} className="glass rounded-2xl p-4">
              <dt className="font-display text-4xl font-extrabold gradient-text">{n}<span className="ml-2 text-[15px] font-extrabold text-ink">{label}</span></dt>
              <dd className="mt-1 font-mono text-[11.5px] text-mute">{sub}</dd>
            </div>
          ))}
        </dl>
        <Link to="/app/study" className="shine mt-8 inline-flex min-h-[52px] items-center gap-2 rounded-full border-2 border-ink bg-mark px-7 text-[15px] font-extrabold shadow-pop">Test yourself on a video →</Link>
      </div>
    </section>
  )
}
