import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import RecentList from '../components/RecentList.jsx'

export default function History() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto"
    >
      <div className="mb-10">
        <span className="inline-flex items-center gap-2 border border-lp-line2 bg-white/[0.03] backdrop-blur-sm rounded-full pl-2.5 pr-3.5 py-1.5 text-[12.5px] font-medium text-lp-violet2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-lp-cyan" />
          Local to this browser
        </span>
        <h1 className="font-display font-semibold text-[clamp(2rem,4vw,2.75rem)] leading-[1.05] tracking-[-0.03em] text-lp-ink [text-wrap:balance] mb-3">
          History
        </h1>
        <p className="text-lp-muted text-[15px] leading-relaxed max-w-lg">
          Every video and comparison you&apos;ve run, saved locally so you can get back to it.
          There&apos;s no account system here &mdash; this list lives on this device only.
        </p>
      </div>

      <RecentList title="ALL ANALYSES" layout="grid" />

      <div className="mt-10">
        <Link
          to="/app"
          className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium text-lp-violet2 hover:text-lp-ink transition-colors"
        >
          Analyze a new video
          <span className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
            &rarr;
          </span>
        </Link>
      </div>
    </motion.div>
  )
}
