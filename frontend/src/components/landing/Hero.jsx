import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
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
  const wrapRef = useRef(null)
  const reduceMotion = useReducedMotion()

  // Scroll budget: the section holds itself pinned in the viewport for an
  // extra beat while the tracker panel travels down, settles, and recedes
  // — then Features rises up and covers the stage, like a curtain.
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start start', 'end end'] })

  // Position/scale/rotation only — never opacity. Content that's supposed to
  // be visible on load must not depend on a scroll-progress calculation that
  // could momentarily be wrong (e.g. before layout settles); the worst case
  // for a transform glitch is a slight offset, not a blank hero.
  const trackY = useTransform(scrollYProgress, [0, 1], [0, 260])
  const trackScale = useTransform(scrollYProgress, [0, 1], [1, 0.8])
  const trackRotate = useTransform(scrollYProgress, [0, 1], [-1, 4])
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60])

  const trackStyle = reduceMotion ? undefined : { y: trackY, scale: trackScale, rotate: trackRotate }
  const textStyle = reduceMotion ? undefined : { y: textY }

  return (
    <section id="top" ref={wrapRef} className="relative lg:h-[175vh]">
      <div className="lg:sticky lg:top-0 lg:h-screen flex items-center overflow-hidden pt-28 pb-14">
        {/* stage dressing: grid + glow orbs, contained to the hero stage */}
        <div className="absolute inset-0 -z-10 bg-grid mask-fade-b opacity-40" />
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[720px] max-h-[720px] rounded-full bg-lp-violet/20 blur-[120px] -z-10 animate-orb-drift" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-lp-cyan/10 blur-[120px] -z-10 animate-orb-drift" style={{ animationDelay: '-8s' }} />

        <div className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-10 items-start w-full">
          <motion.div variants={container} initial="hidden" animate="show" style={textStyle}>
            <motion.div variants={item} className="mb-5">
              <span className="inline-flex items-center gap-2 border border-lp-line2 bg-white/[0.03] backdrop-blur-sm rounded-full pl-2.5 pr-3.5 py-1.5 text-[12.5px] font-medium text-lp-violet2">
                <span className="w-1.5 h-1.5 rounded-full bg-lp-cyan animate-pulse-dot" />
                Multi-agent pipeline · LangGraph + Groq
              </span>
            </motion.div>

            <h1 className="font-display font-semibold text-[clamp(2.5rem,6.2vw,4.25rem)] leading-[0.98] tracking-[-0.03em] text-lp-ink [text-wrap:balance] mb-5">
              <motion.span variants={item} className="block">
                Understand any video
              </motion.span>
              <motion.span variants={item} className="block">
                with{' '}
                <span className="text-gradient font-bold italic">5 AI agents.</span>
              </motion.span>
            </h1>

            <motion.p variants={item} className="text-lp-muted text-[16px] md:text-[17px] leading-relaxed max-w-md mb-7">
              Paste a YouTube link. Scrybe transcribes it, reads what&apos;s on screen, checks the
              claims, and writes a structured, timestamped report — while you chat with it live.
            </motion.p>

            <motion.div variants={item} className="flex flex-wrap items-center gap-3 mb-10">
              <Link
                to="/app"
                className="group relative inline-flex items-center gap-1.5 overflow-hidden bg-lp-ink text-lp-bg text-[14.5px] font-semibold px-5 py-3 rounded-full transition-shadow duration-300 hover:shadow-violet-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-lp-violet to-lp-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative">Try it now</span>
                <span className="relative transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </Link>
              <a
                href="#pipeline"
                className="inline-flex items-center gap-1.5 border border-lp-line2 text-lp-ink text-[14.5px] font-medium px-5 py-3 rounded-full hover:border-lp-violet/50 hover:bg-white/[0.03] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
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

          <motion.div style={trackStyle} className="lg:pt-2">
            <PipelineDemo />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
