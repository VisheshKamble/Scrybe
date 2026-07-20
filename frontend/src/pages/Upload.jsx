import { motion } from 'framer-motion'
import { AlertCircle, Eye, FileText, Link2, Rows3, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitVideo } from '../lib/api.js'

const STEPS = [
  { icon: FileText, label: 'Transcript' },
  { icon: Eye, label: 'Visual' },
  { icon: Rows3, label: 'Chapters' },
  { icon: Sparkles, label: 'Synthesis' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}

export default function Upload() {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { job_id } = await submitVideo(url)
      navigate(`/app/report/${job_id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl mx-auto">
      <motion.div variants={item} className="mb-6">
        <span className="inline-flex items-center gap-2 border border-lp-line bg-lp-card rounded-full pl-2.5 pr-3.5 py-1.5 text-[12.5px] font-medium text-lp-violet">
          <span className="w-1.5 h-1.5 rounded-full bg-lp-green" />
          New analysis
        </span>
      </motion.div>

      <motion.h1
        variants={item}
        className="font-sans font-extrabold text-[clamp(2rem,5vw,2.75rem)] leading-[1.05] tracking-[-0.025em] text-lp-ink [text-wrap:balance] mb-3"
      >
        Analyze a video
      </motion.h1>
      <motion.p variants={item} className="text-lp-muted text-[15.5px] leading-relaxed mb-9 max-w-md">
        Paste a YouTube link. Scrybe watches it, transcribes it, reads what&apos;s on screen, and
        writes a structured, timestamped report.
      </motion.p>

      <motion.form
        variants={item}
        onSubmit={handleSubmit}
        className="rounded-2xl border border-lp-line bg-lp-card p-2 shadow-card focus-within:border-lp-violet/50 focus-within:shadow-violet-glow transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3.5">
            <Link2 size={16} className="text-lp-faint shrink-0" strokeWidth={2} />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-transparent py-3 text-[14.5px] font-mono text-lp-ink placeholder:text-lp-faint outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex items-center justify-center gap-1.5 bg-lp-ink text-white text-[14.5px] font-medium px-5 py-3 rounded-xl hover:bg-lp-violet transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet shrink-0"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Starting&hellip;
              </>
            ) : (
              <>
                Analyze
                <span className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                  &rarr;
                </span>
              </>
            )}
          </button>
        </div>
      </motion.form>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-start gap-2 rounded-xl border border-lp-red/20 bg-lp-redsoft px-3.5 py-2.5"
        >
          <AlertCircle size={15} className="text-lp-red shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-[13.5px] text-lp-red leading-relaxed">{error}</p>
        </motion.div>
      )}

      <motion.div variants={item} className="mt-12">
        <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-3">WHAT HAPPENS NEXT</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={step.label}
                className="flex items-center gap-2 rounded-xl border border-lp-line bg-lp-card px-3 py-2.5"
              >
                <span className="font-mono text-[10px] text-lp-faint">{i + 1}</span>
                <Icon size={14} className="text-lp-violet" strokeWidth={2} />
                <span className="text-[12.5px] font-medium text-lp-ink">{step.label}</span>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
