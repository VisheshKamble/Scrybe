import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Check, Eye, FileText, Link2, MessageSquareText, Rows3, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import RecentList from '../components/RecentList.jsx'
import { PageBanner, W } from '../components/ui.jsx'
import { submitVideo } from '../lib/api.js'
import { saveJobMeta, upsertHistoryEntry } from '../lib/storage.js'
import { extractYoutubeId, isValidYoutubeUrl, youtubeThumbnail } from '../lib/youtube.js'

const OUTPUTS = [
  { tone: 'bg-mark text-ink', icon: FileText, title: 'A transcript', body: 'From captions, or Whisper when there are none.' },
  { tone: 'bg-sky text-ink', icon: Eye, title: 'What was on screen', body: 'Slides, code and charts, read from keyframes.' },
  { tone: 'bg-violet text-white', icon: Rows3, title: 'Chapters', body: 'Real topic breaks, each with a start time.' },
  { tone: 'bg-mint text-ink', icon: ShieldCheck, title: 'Checked claims', body: 'Searched against the web, marked verified or not.' },
  { tone: 'bg-pink text-ink', icon: MessageSquareText, title: 'A chat that cites', body: 'Every answer carries the second it came from.' },
]

const EXAMPLE_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
const EASE = [0.16, 1, 0.3, 1]
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }

export default function Upload() {
  const [params] = useSearchParams()
  const [url, setUrl] = useState(() => params.get('url') ?? '')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // A link pasted on the landing page arrives prefilled but never auto-runs.
  useEffect(() => {
    const incoming = params.get('url')
    if (incoming) setUrl(incoming)
  }, [params])

  const youtubeId = useMemo(() => extractYoutubeId(url), [url])
  const showFormatError = touched && url.trim().length > 0 && !youtubeId

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (!isValidYoutubeUrl(url)) {
      setError('That doesn’t look like a YouTube video link. Paste a full youtube.com or youtu.be URL.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { job_id } = await submitVideo(url)
      saveJobMeta(job_id, { youtubeUrl: url, youtubeId })
      upsertHistoryEntry({ id: job_id, type: 'video', jobId: job_id, youtubeUrl: url, youtubeId, status: 'queued', createdAt: Date.now() })
      navigate(`/app/report/${job_id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageBanner
          tone="blue"
          title={<>Which video should we <W c="mark" tilt={-2}>read</W>?</>}
          sub="Paste a YouTube link. You’ll get the transcript, what was on screen, chapters and checked claims, with a chat that cites the second."
        >
          <form onSubmit={handleSubmit} className={`max-w-2xl rounded-[26px] bg-white border-2 border-ink p-2.5 shadow-[6px_6px_0_0_#12172B] transition-shadow duration-200 ${showFormatError ? 'ring-4 ring-bad/40' : 'focus-within:shadow-[6px_6px_0_0_#FFDD4A]'}`}>
            {youtubeId && (
              <div className="relative rounded-[18px] overflow-hidden bg-ink mb-2.5 aspect-[16/7]">
                <img src={youtubeThumbnail(youtubeId)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-mint text-ink border-2 border-ink text-[12.5px] font-extrabold pl-2 pr-3 py-1"><Check size={13} strokeWidth={3.4} />Link recognised</span>
                <span className="absolute right-3 bottom-3 font-mono text-[11px] text-white/85">{youtubeId}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2.5 px-3.5 min-w-0">
                <Link2 size={16} className="text-faint shrink-0" strokeWidth={2.3} />
                <label htmlFor="video-url" className="sr-only">YouTube link</label>
                <input id="video-url" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => setTouched(true)} placeholder="https://youtube.com/watch?v=…" className="w-full min-w-0 bg-transparent py-3 text-[15px] font-mono text-ink placeholder:text-faint outline-none" required />
              </div>
              <button type="submit" disabled={submitting} className="group inline-flex items-center justify-center gap-2 rounded-[18px] bg-blue text-white text-[15px] font-extrabold px-6 py-3.5 hover:bg-ink transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed shrink-0">
                {submitting ? (<><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Starting</>) : (<>Analyze<ArrowRight size={16} strokeWidth={2.7} className="transition-transform duration-200 group-hover:translate-x-0.5" /></>)}
              </button>
            </div>
          </form>

          {showFormatError && !error && (
            <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-white border-2 border-ink px-3 py-2 text-[13.5px] font-bold text-bad">
              <AlertCircle size={15} className="shrink-0 mt-0.5" strokeWidth={2.4} />That isn’t a YouTube link yet. Use a full youtube.com or youtu.be URL.
            </p>
          )}
          {error && (
            <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-2xl bg-white border-2 border-ink px-4 py-3 max-w-2xl">
              <AlertCircle size={16} className="text-bad shrink-0 mt-0.5" strokeWidth={2.4} />
              <p className="text-[14px] font-semibold text-bad leading-relaxed">{error}</p>
            </div>
          )}
          {!url && (
            <button type="button" onClick={() => { setUrl(EXAMPLE_URL); setTouched(false); setError(null) }} className="mt-4 ml-1 text-[13.5px] font-semibold text-white/90 underline decoration-white/40 underline-offset-4 hover:text-white hover:decoration-white transition-colors">
              No link handy? Use “Me at the zoo”, 19 seconds
            </button>
          )}
        </PageBanner>
      </motion.div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-12 items-start">
        <motion.div variants={item}>
          <RecentList limit={4} layout="grid" title="Pick up where you left off" />
        </motion.div>

        <motion.aside variants={item} className="lg:sticky lg:top-28 rounded-[26px] bg-white border-2 border-ink shadow-pop p-6">
          <h2 className="text-[19px] font-extrabold tracking-[-0.025em] text-ink mb-5">What you’ll get back</h2>
          <ul className="space-y-4">
            {OUTPUTS.map(({ icon: Icon, title, body, tone }, i) => (
              <motion.li key={title} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.25 + i * 0.07 }} className="flex gap-3.5">
                <span className={`w-10 h-10 rounded-xl ${tone} border-2 border-ink flex items-center justify-center shrink-0 ${i % 2 ? 'rotate-[4deg]' : '-rotate-[4deg]'}`}><Icon size={17} strokeWidth={2.5} /></span>
                <div className="pt-0.5">
                  <p className="text-[14.5px] font-extrabold text-ink leading-tight">{title}</p>
                  <p className="text-[13.5px] text-mute leading-snug mt-0.5">{body}</p>
                </div>
              </motion.li>
            ))}
          </ul>
          <p className="mt-6 pt-5 border-t-2 border-dashed border-line2 text-[13px] text-mute leading-relaxed">It runs in the background. Close the tab and come back from History.</p>
        </motion.aside>
      </div>
    </motion.div>
  )
}
