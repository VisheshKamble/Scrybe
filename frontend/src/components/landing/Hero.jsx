import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import PipelineDemo from './PipelineDemo.jsx'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

const CATEGORIES = ['Lectures', 'Product demos', 'Interviews', 'Conference talks', 'Tutorials']

export default function Hero() {
  return (
    <section id="top" className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-8 items-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-6">
            <span className="inline-flex items-center gap-2 border border-lp-line bg-white/70 rounded-full pl-2.5 pr-3.5 py-1.5 text-[12.5px] font-medium text-lp-violet">
              <span className="w-1.5 h-1.5 rounded-full bg-lp-green" />
              Multi-agent pipeline · LangGraph + Groq
            </span>
          </motion.div>

          <h1 className="font-sans font-extrabold text-[clamp(2.75rem,8vw,4.75rem)] leading-[0.98] tracking-[-0.03em] text-lp-ink [text-wrap:balance] mb-6">
            <motion.span variants={item} className="block">
              Understand any video
            </motion.span>
            <motion.span variants={item} className="block">
              with{' '}
              <span className="bg-gradient-to-r from-lp-violet to-lp-violet2 bg-clip-text text-transparent">
                5 AI agents.
              </span>
            </motion.span>
          </h1>

          <motion.p variants={item} className="text-lp-muted text-[16.5px] md:text-lg leading-relaxed max-w-md mb-9">
            Paste a YouTube link. Scrybe transcribes it, reads what&apos;s on screen, checks the
            claims, and writes a structured, timestamped report — while you chat with it live.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap items-center gap-3 mb-12">
            <Link
              to="/app"
              className="group inline-flex items-center gap-1.5 bg-lp-ink text-white text-[14.5px] font-medium px-5 py-3 rounded-full hover:bg-lp-violet transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
            >
              Try it now
              <span className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
            <a
              href="#pipeline"
              className="inline-flex items-center gap-1.5 border border-lp-line text-lp-ink text-[14.5px] font-medium px-5 py-3 rounded-full hover:border-lp-ink transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
            >
              Explore the pipeline
            </a>
          </motion.div>

          <motion.div variants={item}>
            <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-3">WORKS WELL FOR</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span
                  key={c}
                  className="text-[12.5px] font-medium text-lp-muted border border-lp-line rounded-full px-3 py-1.5"
                >
                  {c}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <div>
          <PipelineDemo />
        </div>
      </div>
    </section>
  )
}
