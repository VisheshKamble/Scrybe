import { motion } from 'framer-motion'
import { AlertCircle, GitCompare, Layers, Link2, ListChecks, Plus, ScanSearch, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RecentList from '../components/RecentList.jsx'
import { compareVideos } from '../lib/api.js'
import { saveJobMeta, upsertHistoryEntry } from '../lib/storage.js'
import { extractYoutubeId, isValidYoutubeUrl } from '../lib/youtube.js'

const FOCUS_EXAMPLES = ['Which one explains it better', 'Contradicting claims', 'Pricing or numbers mentioned']

const HOW_IT_WORKS = [
  { icon: Layers, label: 'Each video runs the full pipeline', body: 'Transcript, visuals, and chapters, independently, for every video you add.' },
  { icon: ScanSearch, label: 'Agents line up the overlap', body: 'Shared topics and claims across videos are matched before anything is written.' },
  { icon: ListChecks, label: 'One synthesized comparison', body: 'Agreements, contradictions, and gaps come back as a single report, not N reports.' },
]

const EASE = [0.16, 1, 0.3, 1]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export default function Compare() {
  const [urls, setUrls] = useState(['', ''])
  const [focus, setFocus] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  function updateUrl(i, value) {
    setUrls((prev) => prev.map((u, idx) => (idx === i ? value : u)))
  }

  function removeUrl(i) {
    setUrls((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cleaned = urls.map((u) => u.trim()).filter(Boolean)
    if (cleaned.length < 2) {
      setError('Add at least two YouTube links to compare.')
      return
    }
    const invalid = cleaned.find((u) => !isValidYoutubeUrl(u))
    if (invalid) {
      setError(`"${invalid}" doesn\u2019t look like a valid YouTube link.`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await compareVideos(cleaned, focus || undefined)
      saveJobMeta(res.job_id, {
        youtubeUrls: cleaned,
        youtubeIds: cleaned.map(extractYoutubeId),
        focus,
        startedAt: Date.now(),
      })
      upsertHistoryEntry({
        id: res.job_id,
        type: 'compare',
        jobId: res.job_id,
        youtubeUrls: cleaned,
        youtubeIds: cleaned.map(extractYoutubeId),
        status: 'processing',
        createdAt: Date.now(),
      })
      navigate(`/app/compare/${res.job_id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div variants={container} initial="hidden" animate="show" className="grid lg:grid-cols-[1.15fr_0.85fr] gap-14 lg:gap-10 items-start">
        <div>
          <motion.div variants={item} className="mb-6">
            <span className="inline-flex items-center gap-2 border border-lp-line2 bg-white/[0.03] backdrop-blur-sm rounded-full pl-2.5 pr-3.5 py-1.5 text-[12.5px] font-medium text-lp-violet2">
              <span className="w-1.5 h-1.5 rounded-full bg-lp-cyan animate-pulse-dot" />
              Multi-video comparison
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="font-display font-semibold text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.03] tracking-[-0.03em] text-lp-ink [text-wrap:balance] mb-3"
          >
            Compare <span className="text-gradient italic">videos</span>
          </motion.h1>
          <motion.p variants={item} className="text-lp-muted text-[15.5px] leading-relaxed mb-9 max-w-md">
            Run two or more videos through the pipeline together and get a single synthesized
            comparison back.
          </motion.p>

          <motion.form variants={item} onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2.5">
              {urls.map((u, i) => {
                const invalid = u.trim().length > 0 && !isValidYoutubeUrl(u)
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 rounded-xl border bg-lp-card/90 backdrop-blur-sm pl-3.5 pr-2 py-1 shadow-card transition-all duration-300 ${
                      invalid ? 'border-lp-red/40' : 'border-lp-line2 focus-within:border-lp-violet/50 focus-within:shadow-violet-glow'
                    }`}
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
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setUrls((prev) => [...prev, ''])}
              className="w-full inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-lp-muted border border-dashed border-lp-line2 rounded-xl py-2.5 hover:border-lp-violet/40 hover:text-lp-violet2 hover:bg-white/[0.02] transition-all duration-300"
            >
              <Plus size={14} />
              Add another video
            </button>

            <div className="rounded-xl border border-lp-line2 bg-lp-card/90 backdrop-blur-sm px-3.5 py-1 shadow-card focus-within:border-lp-violet/50 focus-within:shadow-violet-glow transition-all duration-300">
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="Optional: what should the comparison focus on?"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-lp-ink placeholder:text-lp-faint outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FOCUS_EXAMPLES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocus(f)}
                  className="text-[11.5px] font-medium text-lp-muted border border-lp-line2 bg-lp-card rounded-full px-2.5 py-1 hover:border-lp-violet/40 hover:text-lp-violet2 transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full inline-flex items-center justify-center gap-1.5 overflow-hidden bg-lp-ink text-lp-bg text-[14.5px] font-semibold px-5 py-3 rounded-xl transition-shadow duration-300 hover:shadow-violet-glow disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-lp-violet to-lp-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative inline-flex items-center gap-1.5">
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-lp-bg/30 border-t-lp-bg animate-spin" />
                    Starting&hellip;
                  </>
                ) : (
                  <>
                    <GitCompare size={15} />
                    Compare
                  </>
                )}
              </span>
            </button>
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

          <motion.div variants={item} className="mt-14 pt-10 border-t border-lp-line">
            <RecentList limit={4} showEmpty={false} layout="grid" />
          </motion.div>
        </div>

        <motion.div variants={item} className="lg:sticky lg:top-24">
          <div className="relative rounded-2xl border border-lp-line2 bg-lp-card/60 backdrop-blur-sm p-6 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-lp-cyan/10 blur-3xl" />
            <p className="relative font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-6">HOW IT WORKS</p>

            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-lp-violet via-lp-line2 to-transparent" />
              <ul className="space-y-6">
                {HOW_IT_WORKS.map((step, i) => {
                  const Icon = step.icon
                  return (
                    <motion.li
                      key={step.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.3 + i * 0.09 }}
                      className="relative flex gap-3.5"
                    >
                      <span className="relative z-10 shrink-0 w-[31px] h-[31px] rounded-full bg-lp-bg border border-lp-line2 flex items-center justify-center">
                        <Icon size={14} className="text-lp-violet2" strokeWidth={2} />
                      </span>
                      <div className="pt-1">
                        <p className="text-[13.5px] font-semibold text-lp-ink mb-0.5">{step.label}</p>
                        <p className="text-[12.5px] text-lp-muted leading-relaxed">{step.body}</p>
                      </div>
                    </motion.li>
                  )
                })}
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
