import { motion } from 'framer-motion'
import { AlertCircle, Clock3, Eye, FileText, Link2, Rows3, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RecentList from '../components/RecentList.jsx'
import { submitVideo } from '../lib/api.js'
import { saveJobMeta, upsertHistoryEntry } from '../lib/storage.js'
import { extractYoutubeId, isValidYoutubeUrl, youtubeThumbnail } from '../lib/youtube.js'

const STEPS = [
  { icon: FileText, label: 'Transcript' },
  { icon: Eye, label: 'Visual' },
  { icon: Rows3, label: 'Chapters' },
  { icon: Sparkles, label: 'Synthesis' },
]

const EXAMPLE = {
  label: 'Try an example — "Me at the zoo" (19s)',
  url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
}

const EASE = [0.16, 1, 0.3, 1]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

export default function Upload() {
  const [url, setUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const youtubeId = useMemo(() => extractYoutubeId(url), [url])
  const showFormatError = touched && url.trim().length > 0 && !youtubeId

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (!isValidYoutubeUrl(url)) {
      setError('That doesn\u2019t look like a YouTube video link. Paste a full youtube.com or youtu.be URL.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { job_id } = await submitVideo(url)
      saveJobMeta(job_id, { youtubeUrl: url, youtubeId })
      upsertHistoryEntry({
        id: job_id,
        type: 'video',
        jobId: job_id,
        youtubeUrl: url,
        youtubeId,
        status: 'queued',
        createdAt: Date.now(),
      })
      navigate(`/app/report/${job_id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl mx-auto">
      <motion.div variants={item} className="mb-6">
        <span className="inline-flex items-center gap-2 border border-lp-line2 bg-white/[0.03] backdrop-blur-sm rounded-full pl-2.5 pr-3.5 py-1.5 text-[12.5px] font-medium text-lp-violet2">
          <span className="w-1.5 h-1.5 rounded-full bg-lp-cyan animate-pulse-dot" />
          New analysis
        </span>
      </motion.div>

      <motion.h1
        variants={item}
        className="font-display font-semibold text-[clamp(2.25rem,5vw,3rem)] leading-[1.03] tracking-[-0.03em] text-lp-ink [text-wrap:balance] mb-3"
      >
        Analyze <span className="text-gradient italic">a video</span>
      </motion.h1>
      <motion.p variants={item} className="text-lp-muted text-[15.5px] leading-relaxed mb-9 max-w-md">
        Paste a YouTube link. Scrybe watches it, transcribes it, reads what&apos;s on screen, and
        writes a structured, timestamped report.
      </motion.p>

      <motion.form
        variants={item}
        onSubmit={handleSubmit}
        className={`relative rounded-2xl border bg-lp-card/90 backdrop-blur-sm p-2 shadow-card transition-all duration-300 ${
          showFormatError
            ? 'border-lp-red/40'
            : 'border-lp-line2 focus-within:border-lp-violet/50 focus-within:shadow-violet-glow'
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 min-w-0">
            {youtubeId ? (
              <img
                src={youtubeThumbnail(youtubeId)}
                alt=""
                className="w-8 h-6 rounded object-cover shrink-0 border border-lp-line2"
              />
            ) : (
              <Link2 size={16} className="text-lp-faint shrink-0" strokeWidth={2} />
            )}
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full min-w-0 bg-transparent py-3 text-[14.5px] font-mono text-lp-ink placeholder:text-lp-faint outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="group relative inline-flex items-center justify-center gap-1.5 overflow-hidden bg-lp-ink text-lp-bg text-[14.5px] font-semibold px-5 py-3 rounded-xl transition-shadow duration-300 hover:shadow-violet-glow disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet shrink-0"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-lp-violet to-lp-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {submitting ? (
              <span className="relative inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-lp-bg/30 border-t-lp-bg animate-spin" />
                Starting&hellip;
              </span>
            ) : (
              <span className="relative inline-flex items-center gap-1.5">
                Analyze
                <span className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                  &rarr;
                </span>
              </span>
            )}
          </button>
        </div>
      </motion.form>

      {showFormatError && !error && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-lp-red shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-[13px] text-lp-red leading-relaxed">
            Doesn&apos;t look like a YouTube link yet &mdash; make sure it&apos;s a full youtube.com or youtu.be URL.
          </p>
        </motion.div>
      )}

      {!url && (
        <motion.button
          variants={item}
          type="button"
          onClick={() => {
            setUrl(EXAMPLE.url)
            setTouched(false)
            setError(null)
          }}
          className="group mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-lp-violet2 hover:text-lp-ink transition-colors"
        >
          <Clock3 size={12} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-[-25deg]" />
          {EXAMPLE.label}
        </motion.button>
      )}

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

      <motion.div variants={item} className="mt-14">
        <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-4">WHAT HAPPENS NEXT</p>
        <div className="relative">
          <div className="hidden sm:block absolute left-0 right-0 top-[15px] h-px bg-lp-line" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.35 + i * 0.08 }}
                  className="group relative flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-3 rounded-xl border border-lp-line bg-lp-card/80 px-3 py-3 sm:px-3.5 sm:py-3.5 hover:border-lp-violet/40 hover:shadow-violet-glow transition-all duration-300"
                >
                  <span className="relative z-10 shrink-0 w-6 h-6 rounded-full bg-lp-bg border border-lp-line2 flex items-center justify-center font-mono text-[10px] text-lp-faint group-hover:border-lp-violet/50 group-hover:text-lp-violet2 transition-colors duration-300">
                    {i + 1}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={14} className="text-lp-violet2" strokeWidth={2} />
                    <span className="text-[12.5px] font-medium text-lp-ink">{step.label}</span>
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="mt-12">
        <RecentList limit={4} />
      </motion.div>
    </motion.div>
  )
}
