import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, GitCompare, Layers, Link2, ListChecks, Plus, ScanSearch, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RecentList from '../components/RecentList.jsx'
import { PageBanner, W } from '../components/ui.jsx'
import { compareVideos } from '../lib/api.js'
import { saveJobMeta, upsertHistoryEntry } from '../lib/storage.js'
import { extractYoutubeId, isValidYoutubeUrl, youtubeThumbnail } from '../lib/youtube.js'

const FOCUS_EXAMPLES = ['Which one explains it better', 'Contradicting claims', 'Pricing or numbers mentioned']

const HOW_IT_WORKS = [
  { icon: Layers, label: 'Each video runs the full pipeline', body: 'Transcript, visuals and chapters, separately, for every video you add.' },
  { icon: ScanSearch, label: 'The overlap is lined up', body: 'Shared topics and claims are matched before anything is written.' },
  { icon: ListChecks, label: 'You get one comparison', body: 'Agreements, contradictions and gaps in a single write-up, not N reports.' },
]

const EASE = [0.16, 1, 0.3, 1]
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }

export default function Compare() {
  const [urls, setUrls] = useState(['', ''])
  const [focus, setFocus] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const updateUrl = (i, value) => setUrls((prev) => prev.map((u, idx) => (idx === i ? value : u)))
  const removeUrl = (i) => setUrls((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev))

  async function handleSubmit(e) {
    e.preventDefault()
    const cleaned = urls.map((u) => u.trim()).filter(Boolean)
    if (cleaned.length < 2) {
      setError('Add at least two YouTube links to compare.')
      return
    }
    const invalid = cleaned.find((u) => !isValidYoutubeUrl(u))
    if (invalid) {
      setError(`“${invalid}” doesn’t look like a valid YouTube link.`)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await compareVideos(cleaned, focus || undefined)
      const youtubeIds = cleaned.map(extractYoutubeId)
      saveJobMeta(res.job_id, { youtubeUrls: cleaned, youtubeIds, focus, startedAt: Date.now() })
      upsertHistoryEntry({ id: res.job_id, type: 'compare', jobId: res.job_id, youtubeUrls: cleaned, youtubeIds, status: 'processing', createdAt: Date.now() })
      navigate(`/app/compare/${res.job_id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageBanner tone="violet" title={<>Put two videos <W c="mark" tilt={-2}>side by side</W>.</>} sub="Add two or more links on the same topic. You’ll get one write-up of where they agree, where they don’t, and what only one of them covers." />
      </motion.div>
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-12 items-start">
      <div>
        <motion.form variants={item} onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2.5">
            {urls.map((u, i) => {
              const id = extractYoutubeId(u)
              const invalid = u.trim().length > 0 && !id
              return (
                <div key={i} className={`flex items-center gap-3 rounded-[20px] bg-white border-2 pl-3 pr-2 py-1.5 transition-shadow duration-200 ${invalid ? 'border-bad' : 'border-ink focus-within:shadow-[4px_4px_0_0_#6A3DF0]'}`}>
                  <span className="w-[52px] h-[34px] rounded-lg overflow-hidden shrink-0 bg-violet-soft flex items-center justify-center">
                    {id ? <img src={youtubeThumbnail(id)} alt="" className="w-full h-full object-cover" /> : <span className="font-mono text-[13px] font-bold text-faint">{i + 1}</span>}
                  </span>
                  <label htmlFor={`url-${i}`} className="sr-only">YouTube link {i + 1}</label>
                  <input id={`url-${i}`} value={u} onChange={(e) => updateUrl(i, e.target.value)} placeholder={`YouTube link ${i + 1}`} className="flex-1 bg-transparent py-2.5 text-[14.5px] font-mono text-ink placeholder:text-faint outline-none min-w-0" />
                  {urls.length > 2 && (
                    <button type="button" onClick={() => removeUrl(i)} aria-label={`Remove video ${i + 1}`} className="p-2 rounded-full text-mute hover:text-bad hover:bg-bad-soft transition-colors shrink-0">
                      <X size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <button type="button" onClick={() => setUrls((prev) => [...prev, ''])} className="w-full inline-flex items-center justify-center gap-1.5 text-[14px] font-bold text-ink border-2 border-dashed border-ink/40 rounded-[20px] py-3 hover:border-ink hover:bg-mark transition-colors duration-200">
            <Plus size={15} strokeWidth={2.6} />
            Add another video
          </button>

          <div className="rounded-[20px] bg-white border-2 border-ink px-4 py-0.5 focus-within:shadow-[4px_4px_0_0_#6A3DF0] transition-shadow duration-200">
            <label htmlFor="focus" className="sr-only">Comparison focus</label>
            <input id="focus" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Optional: what should the comparison focus on?" className="w-full bg-transparent py-3 text-[14.5px] text-ink placeholder:text-faint outline-none" />
          </div>

          <div className="flex flex-wrap gap-2">
            {FOCUS_EXAMPLES.map((f) => (
              <button key={f} type="button" onClick={() => setFocus(f)} className="text-[13px] font-bold text-ink border-2 border-ink bg-white rounded-full px-3.5 py-1.5 hover:bg-mint transition-colors">
                {f}
              </button>
            ))}
          </div>

          <button type="submit" disabled={submitting} className="group w-full inline-flex items-center justify-center gap-2 rounded-[20px] bg-violet text-white text-[15px] font-extrabold px-5 py-4 border-2 border-ink shadow-pop hover:bg-ink transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-ink">
            {submitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Starting
              </>
            ) : (
              <>
                <GitCompare size={16} strokeWidth={2.5} />
                Compare these videos
                <ArrowRight size={16} strokeWidth={2.6} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </motion.form>

        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mt-3 flex items-start gap-2.5 rounded-2xl bg-bad-soft border-2 border-bad px-4 py-3">
            <AlertCircle size={16} className="text-bad shrink-0 mt-0.5" strokeWidth={2.4} />
            <p className="text-[14px] font-medium text-bad leading-relaxed">{error}</p>
          </motion.div>
        )}

        <motion.div variants={item} className="mt-12">
          <RecentList limit={4} showEmpty={false} layout="grid" filter="compare" title="Past comparisons" />
        </motion.div>
      </div>

      <motion.aside variants={item} className="lg:sticky lg:top-28 rounded-[26px] bg-white border-2 border-ink shadow-pop p-6">
        <h2 className="text-[19px] font-extrabold tracking-[-0.025em] text-ink mb-5">How it works</h2>
        <ol className="relative space-y-5">
          <div className="absolute left-[15px] top-3 bottom-3 w-px bg-line" aria-hidden="true" />
          {HOW_IT_WORKS.map(({ icon: Icon, label, body }, i) => (
            <motion.li key={label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.25 + i * 0.08 }} className="relative flex gap-3.5">
              <span className="relative z-10 w-[31px] h-[31px] rounded-full bg-mark text-ink border-2 border-ink flex items-center justify-center shrink-0">
                <Icon size={14} strokeWidth={2.4} />
              </span>
              <div className="pt-0.5">
                <p className="text-[14.5px] font-bold text-ink leading-tight">{label}</p>
                <p className="text-[13.5px] text-mute leading-snug mt-0.5">{body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
        <p className="mt-6 pt-5 border-t border-line text-[13px] text-mute leading-relaxed">
          If one video can’t be processed (private, age-restricted, region-locked), the whole comparison fails.
        </p>
      </motion.aside>
      </div>
    </motion.div>
  )
}
