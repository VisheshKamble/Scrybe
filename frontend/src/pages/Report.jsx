import { motion } from 'framer-motion'
import { Check, Copy, MessageSquareText, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChapterList from '../components/ChapterList.jsx'
import ExportButton from '../components/ExportButton.jsx'
import PipelineProgress from '../components/PipelineProgress.jsx'
import VideoPlayer from '../components/VideoPlayer.jsx'
import { useSSE } from '../hooks/useSSE.js'
import { getJobStatus, getReport } from '../lib/api.js'
import { getJobMeta, saveJobMeta, saveVideoMeta, upsertHistoryEntry } from '../lib/storage.js'

function ProcessingState({ status, startedAt }) {
  const failed = status === 'failed'

  if (failed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto text-center py-16"
      >
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl border border-lp-red/20 bg-lp-redsoft flex items-center justify-center">
          <XCircle size={22} className="text-lp-red" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-lp-ink mb-2">Something went wrong</h1>
        <p className="text-lp-muted text-[14.5px] leading-relaxed mb-8">
          The pipeline hit an error partway through. This can happen with age-restricted, private,
          or region-locked videos &mdash; try a different link, or submit this one again.
        </p>
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 bg-lp-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-full hover:bg-lp-violet transition-colors duration-300"
        >
          Try again
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto text-center py-16"
    >
      <h1 className="text-xl font-semibold tracking-tight text-lp-ink mb-2">Processing your video</h1>
      <p className="text-lp-muted text-[14.5px] leading-relaxed mb-8">
        This runs in the background &mdash; feel free to leave this tab open, or come back to it
        from your history later.
      </p>
      <PipelineProgress startedAt={startedAt} />
    </motion.div>
  )
}

export default function Report() {
  const { jobId } = useParams()
  const [status, setStatus] = useState('queued')
  const [videoId, setVideoId] = useState(null)
  const [report, setReport] = useState(null)
  const [copied, setCopied] = useState(false)
  const [seekSeconds, setSeekSeconds] = useState(0)
  const { text, done } = useSSE(videoId)
  const playerRef = useRef(null)

  const jobMeta = getJobMeta(jobId)
  const startedAtRef = useRef(jobMeta?.startedAt ?? Date.now())
  if (!jobMeta?.startedAt) {
    saveJobMeta(jobId, { startedAt: startedAtRef.current })
  }

  useEffect(() => {
    let interval
    let cancelled = false
    async function poll() {
      try {
        const data = await getJobStatus(jobId)
        if (cancelled) return
        setStatus(data.status)
        upsertHistoryEntry({ id: jobId, type: 'video', jobId, status: data.status })
        if (data.status === 'done') {
          setVideoId(data.video_id)
          saveVideoMeta(data.video_id, { youtubeId: jobMeta?.youtubeId, jobId })
          saveJobMeta(jobId, { videoId: data.video_id })
          clearInterval(interval)
        } else if (data.status === 'failed') {
          clearInterval(interval)
        }
      } catch {
        // transient network hiccup -- next poll tick retries
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
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard access denied -- silently ignore, it's a nice-to-have
    }
  }

  function handleSeek(seconds) {
    setSeekSeconds(seconds)
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (status !== 'done') {
    return <ProcessingState status={status} startedAt={startedAtRef.current} />
  }

  const youtubeId = jobMeta?.youtubeId

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {youtubeId && (
        <div ref={playerRef}>
          <VideoPlayer youtubeId={youtubeId} seekSeconds={seekSeconds} />
        </div>
      )}

      <section className="rounded-2xl border border-lp-line bg-lp-card p-6 md:p-8 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-[3px] h-3.5 rounded-full bg-lp-violet" />
            <h2 className="text-[13px] font-semibold tracking-wide text-lp-ink">Summary</h2>
          </div>
          {text && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-lp-muted hover:text-lp-ink transition-colors"
            >
              {copied ? <Check size={13} className="text-lp-green" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
        <p className="leading-relaxed text-[15px] text-lp-ink/90 whitespace-pre-wrap">
          {text}
          {!done && <span className="inline-block w-[2px] h-[1em] bg-lp-violet ml-0.5 align-middle animate-caret-blink" />}
        </p>
      </section>

      {report ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <ChapterList
            chapters={report.chapters}
            claims={report.claims}
            onSeek={youtubeId ? handleSeek : undefined}
            activeSeconds={youtubeId ? seekSeconds : undefined}
          />

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to={`/app/chat/${videoId}`}
              className="group inline-flex items-center gap-1.5 bg-lp-ink text-white text-[13.5px] font-medium px-5 py-2.5 rounded-full hover:bg-lp-violet transition-colors duration-300"
            >
              <MessageSquareText size={14} />
              Ask about this video
            </Link>
            <ExportButton videoId={videoId} format="pdf" />
            <ExportButton videoId={videoId} format="markdown" />
          </div>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2.5">
              {[0, 1, 2].map((j) => (
                <div key={j} className="skeleton animate-shimmer rounded-xl h-20 border border-lp-line" />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
