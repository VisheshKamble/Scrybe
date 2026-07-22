import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import RecentList from '../components/RecentList.jsx'

export default function History() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-xl mx-auto"
    >
      <div className="mb-9">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-[3px] h-3.5 rounded-full bg-lp-violet" />
          <h1 className="text-xl font-semibold tracking-tight text-lp-ink">History</h1>
        </div>
        <p className="text-lp-muted text-[14.5px] leading-relaxed">
          Every video and comparison you&apos;ve run in this browser, saved locally so you can get back to it.
          There&apos;s no account system here &mdash; this list lives on this device only.
        </p>
      </div>

      <RecentList title="ALL ANALYSES" />

      <div className="mt-10 flex gap-3">
        <Link
          to="/app"
          className="text-[13.5px] font-medium text-lp-violet hover:text-lp-ink transition-colors"
        >
          Analyze a new video &rarr;
        </Link>
      </div>
    </motion.div>
  )
}
