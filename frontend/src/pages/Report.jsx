import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChapterList from '../components/ChapterList.jsx'
import ExportButton from '../components/ExportButton.jsx'
import { useSSE } from '../hooks/useSSE.js'
import { getJobStatus, getReport } from '../lib/api.js'

export default function Report() {
  const { jobId } = useParams()
  const [status, setStatus] = useState('queued')
  const [videoId, setVideoId] = useState(null)
  const [report, setReport] = useState(null)
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
    if (videoId && done) {
      getReport(videoId).then(setReport)
    }
  }, [videoId, done])

  if (status !== 'done') {
    return (
      <div className="font-mono text-sm text-secondary">
        {status === 'failed'
          ? 'Something went wrong processing this video.'
          : 'Processing\u2026 this runs in the background, feel free to leave this open.'}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm text-secondary mb-2 font-mono">summary</h2>
        <p className="leading-relaxed">
          {text}
          {!done && <span className="animate-pulse">\u258c</span>}
        </p>
      </section>

      {report && (
        <>
          <ChapterList chapters={report.chapters} claims={report.claims} />
          <div className="flex gap-3">
            <Link
              to={`/chat/${videoId}`}
              className="text-sm bg-surface border border-border rounded-md px-4 py-2 hover:border-signal transition-colors"
            >
              Ask about this video
            </Link>
            <ExportButton videoId={videoId} format="pdf" />
            <ExportButton videoId={videoId} format="markdown" />
          </div>
        </>
      )}
    </div>
  )
}
