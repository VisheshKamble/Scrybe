import { motion } from 'framer-motion'
import { Check, Copy, MessageSquareText, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChapterPanel, ClaimPanel, TimelineStrip } from '../components/ChapterList.jsx'
import ExportButton from '../components/ExportButton.jsx'
import PipelineProgress from '../components/PipelineProgress.jsx'
import VideoPlayer from '../components/VideoPlayer.jsx'
import { PageBanner, btn } from '../components/ui.jsx'
import { useSSE } from '../hooks/useSSE.js'
import { getJobStatus, getReport } from '../lib/api.js'
import { getJobMeta, saveJobMeta, saveVideoMeta, upsertHistoryEntry } from '../lib/storage.js'
import { toUiStatus, waitingNotice } from '../lib/status.js'
import { youtubeThumbnail } from '../lib/youtube.js'

function ProcessingState({ status, startedAt, youtubeId, job }) {
  if (status === 'failed') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center py-12">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-bad-soft flex items-center justify-center">
          <XCircle size={24} className="text-bad" strokeWidth={2.3} />
        </div>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink mb-2">We couldn’t process this video</h1>
        <p className="text-mute text-[15.5px] leading-relaxed mb-8">
          {job?.error_message || 'Something went wrong while processing this video.'}
        </p>
        {job?.error_code && <p className="text-faint text-[12px] font-mono mb-6">{job.error_code}</p>}
        <Link to="/app" className={btn.primary}>{job?.retryable ? 'Submit it again' : 'Try another video'}</Link>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-6">
      {youtubeId && (
        <div className="relative rounded-[22px] overflow-hidden bg-ink mb-5 aspect-[16/7] border-2 border-ink shadow-pop">
          <img src={youtubeThumbnail(youtubeId)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        </div>
      )}
      <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink mb-2">Reading your video</h1>
      <p className="text-mute text-[15.5px] leading-relaxed mb-6">It runs in the background. Keep this tab open, or come back from History.</p>
      {waitingNotice(job) && (
        <p role="status" className="mb-5 rounded-xl border-2 border-ink bg-mark px-4 py-3 text-[14px] font-semibold text-ink">{waitingNotice(job)}</p>
      )}
      {job?.stage && <p className="mb-3 text-[13px] font-semibold text-mute">{job.stage}{typeof job.progress === 'number' ? ` · ${job.progress}%` : ''}</p>}
      <PipelineProgress startedAt={startedAt} />
    </motion.div>
  )
}

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'chapters', label: 'Chapters' },
  { key: 'claims', label: 'Claims' },
]

export default function Report() {
  const { jobId } = useParams()
  const [status, setStatus] = useState('queued')
  const [job, setJob] = useState(null)
  const [videoId, setVideoId] = useState(null)
  const [report, setReport] = useState(null)
  const [copied, setCopied] = useState(false)
  const [seekSeconds, setSeekSeconds] = useState(0)
  const [tab, setTab] = useState('summary')
  const { text, done } = useSSE(videoId)
  const playerRef = useRef(null)

  // The SSE stream gives a nice live-typing effect but can drop without a
  // resume cursor. report.summary comes from an ordinary REST call, so once it
  // has loaded it is the complete source of truth.
  const displaySummary = report?.summary || text
  const summaryStillStreaming = !report && !done

  const jobMeta = getJobMeta(jobId)
  const startedAtRef = useRef(jobMeta?.startedAt ?? Date.now())
  if (!jobMeta?.startedAt) saveJobMeta(jobId, { startedAt: startedAtRef.current })

  useEffect(() => {
    let interval
    let cancelled = false
    async function poll() {
      try {
        const data = await getJobStatus(jobId)
        if (cancelled) return
        const ui = toUiStatus(data.status)
        setJob(data)
        setStatus(ui)
        upsertHistoryEntry({ id: jobId, type: 'video', jobId, status: ui })
        if (ui === 'done') {
          setVideoId(data.video_id)
          saveVideoMeta(data.video_id, { youtubeId: jobMeta?.youtubeId, jobId })
          saveJobMeta(jobId, { videoId: data.video_id })
          clearInterval(interval)
        } else if (ui === 'failed') {
          clearInterval(interval)
        }
      } catch {
        // transient network hiccup: the next poll retries
      }
    }
    poll()
    interval = setInterval(poll, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  useEffect(() => {
    if (videoId) {
      getReport(videoId).then((r) => {
        setReport(r)
        const title = r.summary?.split(/(?<=[.!?])\s/)[0]?.slice(0, 90)
        upsertHistoryEntry({ id: jobId, type: 'video', jobId, videoId, status: 'done', title })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displaySummary)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard denied: it's a nice-to-have
    }
  }

  function handleSeek(seconds) {
    setSeekSeconds(seconds)
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const youtubeId = jobMeta?.youtubeId

  if (status !== 'done') return <ProcessingState status={status} startedAt={startedAtRef.current} youtubeId={youtubeId} job={job} />

  const verified = report?.claims?.filter((c) => c.verified).length ?? 0
  const canSeek = Boolean(youtubeId)

  return (
    <div>
      <PageBanner
        tone="blue"
        title="Your report"
        sub={report ? undefined : 'Pulling the finished report together.'}
        actions={report && (
          <>
            <Link to={`/app/chat/${videoId}`} className={btn.sun}><MessageSquareText size={15} strokeWidth={2.6} />Ask about this video</Link>
            <ExportButton videoId={videoId} format="pdf" />
            <ExportButton videoId={videoId} format="markdown" />
          </>
        )}
      >
        {report && (
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-extrabold">
            <span className="rounded-full bg-violet text-white border-2 border-ink px-3 py-1">{report.chapters?.length ?? 0} chapters</span>
            <span className={`rounded-full border-2 border-ink px-3 py-1 text-ink ${verified === (report.claims?.length ?? 0) ? 'bg-mint' : 'bg-mark'}`}>{verified} of {report.claims?.length ?? 0} claims verified</span>
          </p>
        )}
      </PageBanner>

      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        {/* watch: stays in view while you read */}
        <div className="lg:sticky lg:top-24 space-y-3">
          {youtubeId ? (
            <div ref={playerRef}>
              <VideoPlayer youtubeId={youtubeId} seekSeconds={seekSeconds} autoplayOnSeek />
            </div>
          ) : (
            <div className="rounded-[20px] border-2 border-dashed border-ink/30 bg-white/60 p-8 text-center text-[14px] text-mute">
              The video isn’t available to embed here, but the report below is complete.
            </div>
          )}
          {report ? (
            <TimelineStrip chapters={report.chapters} claims={report.claims} onSeek={canSeek ? handleSeek : undefined} activeSeconds={canSeek ? seekSeconds : undefined} />
          ) : (
            <div className="skeleton animate-shimmer rounded-[20px] h-[88px]" />
          )}
        </div>

        {/* read */}
        <div className="min-w-0">
          <div role="tablist" aria-label="Report sections" className="inline-flex bg-white border-2 border-ink rounded-full p-1 mb-5 shadow-pop">
            {TABS.map((t) => {
              const count = t.key === 'chapters' ? report?.chapters?.length : t.key === 'claims' ? report?.claims?.length : null
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative px-4 py-2 text-[13.5px] font-bold rounded-full transition-colors duration-200 ${tab === t.key ? 'text-white' : 'text-mute hover:text-ink'}`}
                >
                  {tab === t.key && <motion.span layoutId="report-tab" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-violet -z-10" />}
                  {t.label}
                  {count != null && <span className={`ml-1.5 font-mono text-[11px] ${tab === t.key ? 'text-white/70' : 'text-faint'}`}>{count}</span>}
                </button>
              )
            })}
          </div>

          {tab === 'summary' && (
            <section role="tabpanel" className="rounded-[26px] bg-white border-2 border-ink shadow-pop p-6 md:p-7 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-mark via-sky to-mint" aria-hidden="true" />
              <div className="flex items-center justify-between mb-4 pl-2">
                <h2 className="text-[19px] font-extrabold tracking-[-0.025em] text-ink">Summary</h2>
                {displaySummary && (
                  <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-mute hover:text-ink transition-colors">
                    {copied ? <Check size={14} className="text-ok" strokeWidth={3} /> : <Copy size={14} strokeWidth={2.3} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              {displaySummary ? (
                <p className="pl-2 text-[16px] leading-[1.7] text-ink-soft whitespace-pre-wrap max-w-[62ch]">
                  {displaySummary}
                  {summaryStillStreaming && <span className="inline-block w-[2px] h-[1.05em] bg-pink ml-0.5 align-middle animate-caret-blink" />}
                </p>
              ) : (
                <div className="space-y-2.5" aria-label="Summary loading">
                  {[100, 92, 96, 60].map((w, i) => <div key={i} className="skeleton animate-shimmer h-3.5 rounded-full" style={{ width: `${w}%` }} />)}
                </div>
              )}
            </section>
          )}

          {tab === 'chapters' && (report ? <ChapterPanel chapters={report.chapters} onSeek={canSeek ? handleSeek : undefined} activeSeconds={canSeek ? seekSeconds : undefined} /> : <ListSkeleton />)}
          {tab === 'claims' && (report ? <ClaimPanel claims={report.claims} onSeek={canSeek ? handleSeek : undefined} /> : <ListSkeleton />)}
        </div>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <div key={i} className="skeleton animate-shimmer rounded-2xl h-24" />)}
    </div>
  )
}
