import { motion } from 'framer-motion'
import { Check, Copy, Loader2, MessageSquareText, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChapterList from '../components/ChapterList.jsx'
import ExportButton from '../components/ExportButton.jsx'
import { useSSE } from '../hooks/useSSE.js'
import { getJobStatus, getReport } from '../lib/api.js'

function ProcessingState({ status }) {
  const failed = status === 'failed'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto text-center py-16"
    >
      <div
        className={`mx-auto mb-6 w-14 h-14 rounded-2xl border flex items-center justify-center ${
          failed ? 'border-lp-red/20 bg-lp-redsoft' : 'border-lp-line bg-lp-card'
        }`}
      >
        {failed ? (
          <XCircle size={22} className="text-lp-red" strokeWidth={2} />
        ) : (
          <Loader2 size={22} className="text-lp-violet animate-spin" strokeWidth={2} />
        )}
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-lp-ink mb-2">
        {failed ? 'Something went wrong' : 'Processing your video'}
      </h1>
      <p className="text-lp-muted text-[14.5px] leading-relaxed mb-8">
        {failed
          ? 'The pipeline hit an error partway through. Try submitting the video again.'
          : "This runs in the background \u2014 feel free to leave this tab open, or come back to it later."}
      </p>
      {!failed && (
        <div className="flex items-center justify-center gap-2">
          {['queued', 'processing'].map((s) => {
            const active = status === s
            const complete = s === 'queued' && status === 'processing'
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1.5 border transition-colors duration-300 ${
                  active
                    ? 'border-lp-violet/30 bg-lp-violetsoft text-lp-violet'
                    : complete
                    ? 'border-lp-green/20 bg-lp-greensoft text-lp-green'
                    : 'border-lp-line text-lp-faint'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    active ? 'bg-lp-violet animate-pulse-dot' : complete ? 'bg-lp-green' : 'bg-lp-line'
                  }`}
                />
                {s === 'queued' ? 'Queued' : 'Processing'}
              </span>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

export default function Report() {
  const { jobId } = useParams()
  const [status, setStatus] = useState('queued')
  const [videoId, setVideoId] = useState(null)
  const [report, setReport] = useState(null)
  const [copied, setCopied] = useState(false)
  const { text, done } = useSSE(videoId)

  useEffect(() => {
    let interval
    async function poll() {
      const data = await getJobStatus(jobId)
      setStatus(data.status)
      if (data.status === 'done') {
        setVideoId(data.video_id)
        clearInterval(interval)
      }
    }
    poll()
    interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [jobId])

  useEffect(() => {
    if (videoId) {
      getReport(videoId).then(setReport)
    }
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

  if (status !== 'done') {
    return <ProcessingState status={status} />
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
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
          <ChapterList chapters={report.chapters} claims={report.claims} />

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
