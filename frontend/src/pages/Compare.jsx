import { motion } from 'framer-motion'
import { CheckCircle2, GitCompare, Link2, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { compareVideos } from '../lib/api.js'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function Compare() {
  const [urls, setUrls] = useState(['', ''])
  const [focus, setFocus] = useState('')
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function updateUrl(i, value) {
    setUrls((prev) => prev.map((u, idx) => (idx === i ? value : u)))
  }

  function removeUrl(i) {
    setUrls((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cleaned = urls.filter(Boolean)
    if (cleaned.length < 2) return
    setSubmitting(true)
    try {
      const res = await compareVideos(cleaned, focus || undefined)
      setStatus(`Comparison started \u2014 job ${res.job_id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl mx-auto">
      <motion.div variants={item} className="mb-6">
        <span className="inline-flex items-center gap-2 border border-lp-line bg-lp-card rounded-full pl-2.5 pr-3.5 py-1.5 text-[12.5px] font-medium text-lp-violet">
          <span className="w-1.5 h-1.5 rounded-full bg-lp-green" />
          Multi-video comparison
        </span>
      </motion.div>

      <motion.h1
        variants={item}
        className="font-sans font-extrabold text-[clamp(2rem,5vw,2.75rem)] leading-[1.05] tracking-[-0.025em] text-lp-ink [text-wrap:balance] mb-3"
      >
        Compare videos
      </motion.h1>
      <motion.p variants={item} className="text-lp-muted text-[15.5px] leading-relaxed mb-9 max-w-md">
        Run two or more videos through the pipeline together and get a single synthesized
        comparison back.
      </motion.p>

      <motion.form variants={item} onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2.5">
          {urls.map((u, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-xl border border-lp-line bg-lp-card pl-3.5 pr-2 py-1 shadow-card focus-within:border-lp-violet/50 transition-colors duration-200"
            >
              <span className="font-mono text-[10.5px] text-lp-faint w-4 shrink-0">{i + 1}</span>
              <Link2 size={14} className="text-lp-faint shrink-0" strokeWidth={2} />
              <input
                value={u}
                onChange={(e) => updateUrl(i, e.target.value)}
                placeholder={`YouTube URL ${i + 1}`}
                className="flex-1 bg-transparent py-2.5 text-[13.5px] font-mono text-lp-ink placeholder:text-lp-faint outline-none min-w-0"
              />
              {urls.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  aria-label="Remove video"
                  className="p-1.5 text-lp-faint hover:text-lp-red transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setUrls((prev) => [...prev, ''])}
          className="w-full inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-lp-muted border border-dashed border-lp-line rounded-xl py-2.5 hover:border-lp-violet/40 hover:text-lp-violet transition-colors duration-200"
        >
          <Plus size={14} />
          Add another video
        </button>

        <div className="rounded-xl border border-lp-line bg-lp-card px-3.5 py-1 shadow-card focus-within:border-lp-violet/50 transition-colors duration-200">
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Optional: what should the comparison focus on?"
            className="w-full bg-transparent py-2.5 text-[13.5px] text-lp-ink placeholder:text-lp-faint outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="group w-full inline-flex items-center justify-center gap-1.5 bg-lp-ink text-white text-[14.5px] font-medium px-5 py-3 rounded-xl hover:bg-lp-violet transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <GitCompare size={15} />
          )}
          {submitting ? 'Starting\u2026' : 'Compare'}
        </button>
      </motion.form>

      {status && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-lp-green/20 bg-lp-greensoft px-3.5 py-2.5"
        >
          <CheckCircle2 size={15} className="text-lp-green shrink-0" strokeWidth={2} />
          <p className="text-[13.5px] font-mono text-lp-green">{status}</p>
        </motion.div>
      )}
    </motion.div>
  )
}
