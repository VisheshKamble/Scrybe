import { motion } from 'framer-motion'
import { ExternalLink, GitCompare, MessageSquareText, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PipelineProgress from '../components/PipelineProgress.jsx'
import { PageBanner, btn } from '../components/ui.jsx'
import { getCompareStatus } from '../lib/api.js'
import { getJobMeta, upsertHistoryEntry } from '../lib/storage.js'
import { youtubeThumbnail } from '../lib/youtube.js'

// The status endpoint returns 'done' / 'failed' once resolved and a raw
// lowercased Celery state while in flight. Collapse anything non-terminal to
// 'processing' rather than leaking Celery's vocabulary into the UI.
function normalizeStatus(raw) {
  if (raw === 'done') return 'done'
  if (raw === 'failed') return 'failed'
  return 'processing'
}

function VideoResultCard({ report, youtubeId, index }) {
  const verifiedCount = report.claims?.filter((c) => c.verified).length ?? 0
  const totalClaims = report.claims?.length ?? 0

  return (
    <article className={`rounded-[26px] bg-white border-2 border-ink overflow-hidden flex flex-col ${index % 2 ? 'shadow-[6px_6px_0_0_#FF4F8B]' : 'shadow-[6px_6px_0_0_#6A3DF0]'}`}>
      <div className="relative aspect-video bg-ink">
        {youtubeId && <img src={youtubeThumbnail(youtubeId)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <span className="absolute left-3 top-3 w-8 h-8 rounded-lg bg-mark border-2 border-ink text-ink font-mono text-[13px] font-bold flex items-center justify-center">{index + 1}</span>
        {youtubeId && (
          <a href={`https://youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noreferrer" className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white border-2 border-ink text-ink text-[12px] font-extrabold px-2.5 py-1 hover:bg-mark transition-colors">
            YouTube <ExternalLink size={11} strokeWidth={2.6} />
          </a>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-[14.5px] text-ink-soft leading-[1.6] line-clamp-5 mb-4">{report.summary}</p>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[12.5px] font-extrabold px-2 py-1 rounded-md bg-violet text-white">{report.chapters?.length ?? 0} chapters</span>
          <span className={`text-[12.5px] font-bold px-2 py-1 rounded-md ${verifiedCount === totalClaims ? 'bg-mint text-ink' : 'bg-mark text-ink'}`}>
            {verifiedCount} of {totalClaims} claims verified
          </span>
        </div>
        <Link to={`/app/chat/${report.video_id}`} className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-extrabold text-violet hover:text-ink transition-colors">
          <MessageSquareText size={14} strokeWidth={2.5} />
          Ask about this video
        </Link>
      </div>
    </article>
  )
}

export default function CompareResult() {
  const { jobId } = useParams()
  const [status, setStatus] = useState('processing')
  const [result, setResult] = useState(null)
  const startedAtRef = useRef(null)
  const jobMeta = getJobMeta(jobId)

  if (startedAtRef.current === null) startedAtRef.current = jobMeta?.startedAt ?? Date.now()

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
        // transient network hiccup: the next poll retries
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center py-12">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-bad-soft flex items-center justify-center">
          <XCircle size={24} className="text-bad" strokeWidth={2.3} />
        </div>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink mb-2">The comparison failed</h1>
        <p className="text-mute text-[15.5px] leading-relaxed mb-8">One of the videos hit an error partway through, and a comparison needs all of them. Check each link, then try again.</p>
        <Link to="/app/compare" className={btn.primary}>Back to compare</Link>
      </motion.div>
    )
  }

  if (status !== 'done') {
    const ids = jobMeta?.youtubeIds ?? []
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-6">
        {ids.length > 0 && (
          <div className="flex gap-2 mb-5">
            {ids.map((id, i) => (
              <div key={`${id}-${i}`} className="relative flex-1 aspect-video rounded-2xl overflow-hidden bg-ink border-2 border-ink">
                {id && <img src={youtubeThumbnail(id)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
                <span className="absolute left-2 top-2 w-6 h-6 rounded-md bg-mark border-2 border-ink text-ink font-mono text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
              </div>
            ))}
          </div>
        )}
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink mb-2">Comparing your videos</h1>
        <p className="text-mute text-[15.5px] leading-relaxed mb-6">Each video runs the full pipeline, then one pass compares them. Keep this open, or come back from History.</p>
        <PipelineProgress startedAt={startedAtRef.current} estimateSeconds={100} itemCount={jobMeta?.youtubeUrls?.length || 2} />
      </motion.div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageBanner tone="violet" title="The comparison" sub={`${result.videos?.length ?? 0} videos, read together.`} />

      <section className="rounded-[28px] bg-white border-2 border-ink shadow-pop p-6 md:p-8 mb-12">
        <p className="text-[16px] leading-[1.75] text-ink-soft whitespace-pre-wrap max-w-[68ch]">{result.comparison}</p>
      </section>

      <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-ink mb-5">Each video on its own</h2>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid sm:grid-cols-2 gap-5">
        {result.videos.map((report, i) => (
          <VideoResultCard key={report.video_id} report={report} youtubeId={jobMeta?.youtubeIds?.[i]} index={i} />
        ))}
      </motion.div>
    </div>
  )
}
