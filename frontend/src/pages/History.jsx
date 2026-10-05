import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import RecentList from '../components/RecentList.jsx'
import { PageBanner, btn } from '../components/ui.jsx'

const FILTERS = [
  { key: 'all', label: 'Everything' },
  { key: 'video', label: 'Videos' },
  { key: 'compare', label: 'Comparisons' },
]

export default function History() {
  const [filter, setFilter] = useState('all')
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <PageBanner
        tone="mint"
        title="History"
        sub="Every video and comparison you’ve run, kept in this browser. There are no accounts, so clearing site data clears this list."
        actions={
          <div role="group" aria-label="Filter history" className="inline-flex bg-white border-2 border-ink rounded-full p-1 shadow-pop">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`relative px-4 py-2 text-[13.5px] font-extrabold rounded-full transition-colors duration-200 ${filter === f.key ? 'text-ink' : 'text-mute hover:text-ink'}`}>
                {filter === f.key && <motion.span layoutId="history-filter" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-mark -z-10" />}
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <RecentList title="All analyses" layout="grid" filter={filter} />

      <div className="mt-10">
        <Link to="/app" className={btn.sun}>
          Analyze a new video
          <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
      </div>
    </motion.div>
  )
}
