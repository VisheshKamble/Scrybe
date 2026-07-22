import { motion } from 'framer-motion'
import { CheckCircle2, ExternalLink, GitCompare, MessageSquareText, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PipelineProgress from '../components/PipelineProgress.jsx'
import { getCompareStatus } from '../lib/api.js'
import { getJobMeta, upsertHistoryEntry } from '../lib/storage.js'
import { youtubeThumbnail } from '../lib/youtube.js'

// The compare status endpoint returns 'done' / 'failed' once resolved,
// and a raw lowercased Celery state (pending, started, retry...) while
// still in flight -- collapse anything that isn't a terminal state down
// to 'processing' rather than leaking Celery's vocabulary into the UI.
function normalizeStatus(raw) {
  if (raw === 'done') return 'done'
  if (raw === 'failed') return 'failed'
  return 'processing'
}

function VideoResultCard({ report, youtubeId }) {
  const verifiedCount = report.claims?.filter((c) => c.verified).length ?? 0
  const totalClaims = report.claims?.length ?? 0

  return (
    <div className="rounded-2xl border border-lp-line bg-lp-card p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-16 h-11 rounded-lg overflow-hidden shrink-0 border border-lp-line bg-lp-bg">
          {youtubeId && (
            <img src={youtubeThumbnail(youtubeId)} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-lp-faint">{report.video_id}</span>
            {youtubeId && (
              <a
                href={`https://youtube.com/watch?v=${youtubeId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-lp-violet hover:text-lp-ink transition-colors"
              >
                Open on YouTube <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>
      <p className="text-[13.5px] text-lp-ink/90 leading-relaxed line-clamp-4 mb-3">{report.summary}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-mono px-2 py-1 rounded-full bg-lp-violetsoft text-lp-violet">
          {report.chapters?.length ?? 0} chapters
        </span>
        <span className="text-[11px] font-mono px-2 py-1 rounded-full bg-lp-greensoft text-lp-green">
          {verifiedCount}/{totalClaims} claims verified
        </span>
      </div>
      <Link
        to={`/app/chat/${report.video_id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-lp-ink hover:text-lp-violet transition-colors"
      >
        <MessageSquareText size={13} />
        Ask about this video
      </Link>
    </div>
  )
}

export default function CompareResult() {
  const { jobId } = useParams()
  const [status, setStatus] = useState('processing')
  const [result, setResult] = useState(null)
  const startedAtRef = useRef(null)
  const jobMeta = getJobMeta(jobId)

  if (startedAtRef.current === null) {
    startedAtRef.current = jobMeta?.startedAt ?? Date.now()
  }

  useEffect(() => {
    let interval
    let cancelled = false

    async function poll() {
      try {
        const data = await getCompareStatus(jobId)
        if (cancelled) return
        const normalized = normalizeStatus(data.status)
        setStatus(normalized)
        if (normalized === 'done') {
          setResult(data.result)
          clearInterval(interval)
          upsertHistoryEntry({ id: jobId, type: 'compare', jobId, status: 'done' })
        } else if (normalized === 'failed') {
          clearInterval(interval)
          upsertHistoryEntry({ id: jobId, type: 'compare', jobId, status: 'failed' })
        }
      } catch {
        // transient network hiccup -- next poll tick will retry
      }
    }

    poll()
    interval = setInterval(poll, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [jobId])

  if (status === 'failed') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto text-center py-16">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl border border-lp-red/20 bg-lp-redsoft flex items-center justify-center">
          <XCircle size={22} className="text-lp-red" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-lp-ink mb-2">Comparison failed</h1>
        <p className="text-lp-muted text-[14.5px] leading-relaxed mb-8">
          One of the videos in this comparison hit an error partway through processing.
        </p>
        <Link
          to="/app/compare"
          className="inline-flex items-center gap-1.5 bg-lp-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-full hover:bg-lp-violet transition-colors duration-300"
        >
          Try again
        </Link>
      </motion.div>
    )
  }

  if (status !== 'done') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto text-center py-16">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl border border-lp-line bg-lp-card flex items-center justify-center">
          <GitCompare size={22} className="text-lp-violet" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-lp-ink mb-2">Comparing videos</h1>
        <p className="text-lp-muted text-[14.5px] leading-relaxed mb-8">
          Each video runs the full pipeline in parallel, then a synthesis pass compares them
          &mdash; feel free to leave this open, or come back to it from your history later.
        </p>
        <PipelineProgress
          startedAt={startedAtRef.current}
          estimateSeconds={100}
          itemCount={jobMeta?.youtubeUrls?.length || 2}
        />
      </motion.div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <section className="rounded-2xl border border-lp-line bg-lp-card p-6 md:p-8 shadow-card">
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-[3px] h-3.5 rounded-full bg-lp-violet" />
          <h2 className="text-[13px] font-semibold tracking-wide text-lp-ink">Comparison</h2>
        </div>
        <p className="leading-relaxed text-[15px] text-lp-ink/90 whitespace-pre-wrap">{result.comparison}</p>
      </section>

      <div>
        <div className="flex items-center gap-1.5 mb-4">
          <CheckCircle2 size={14} className="text-lp-violet" />
          <h3 className="text-[13px] font-semibold tracking-wide text-lp-ink">Individual reports</h3>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid sm:grid-cols-2 gap-4"
        >
          {result.videos.map((report, i) => (
            <VideoResultCard key={report.video_id} report={report} youtubeId={jobMeta?.youtubeIds?.[i]} />
          ))}
        </motion.div>
      </div>
    </div>
  )
}
