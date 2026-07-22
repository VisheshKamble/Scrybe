import { GitCompare, MessageSquareText, ScrollText } from 'lucide-react'
import { Link, useMatch } from 'react-router-dom'
import { getJobMeta, getVideoMeta } from '../lib/storage.js'
import { youtubeThumbnail } from '../lib/youtube.js'

// The main header nav only ever shows Upload / Compare / History -- once
// you're actually inside a report, a chat thread, or a comparison, there
// was previously nothing anywhere on screen saying which video that was,
// or a one-click way to get from "reading the report" to "asking about
// it" and back. This renders just that, directly under the main nav, and
// only on the routes where there's a "current video" to show.
export default function ContextBar() {
  const reportMatch = useMatch('/app/report/:jobId')
  const chatMatch = useMatch('/app/chat/:videoId')
  const compareMatch = useMatch('/app/compare/:jobId')

  if (reportMatch) {
    const { jobId } = reportMatch.params
    const meta = getJobMeta(jobId)
    if (!meta) return null
    return (
      <Bar
        thumb={meta.youtubeId}
        icon={ScrollText}
        label="Report"
        detail={meta.youtubeId}
        action={
          meta.videoId && (
            <Link
              to={`/app/chat/${meta.videoId}`}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-lp-violet hover:text-lp-ink transition-colors"
            >
              <MessageSquareText size={12} />
              Ask about this video
            </Link>
          )
        }
      />
    )
  }

  if (chatMatch) {
    const { videoId } = chatMatch.params
    const meta = getVideoMeta(videoId)
    if (!meta) return null
    return (
      <Bar
        thumb={meta.youtubeId}
        icon={MessageSquareText}
        label="Chat"
        detail={meta.youtubeId}
        action={
          meta.jobId && (
            <Link
              to={`/app/report/${meta.jobId}`}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-lp-violet hover:text-lp-ink transition-colors"
            >
              <ScrollText size={12} />
              View report
            </Link>
          )
        }
      />
    )
  }

  if (compareMatch) {
    const { jobId } = compareMatch.params
    const meta = getJobMeta(jobId)
    if (!meta) return null
    return (
      <Bar
        thumb={meta.youtubeIds?.[0]}
        icon={GitCompare}
        label="Comparison"
        detail={`${meta.youtubeUrls?.length ?? 0} videos`}
      />
    )
  }

  return null
}

function Bar({ thumb, icon: Icon, label, detail, action }) {
  return (
    <div className="border-b border-lp-line bg-lp-card/60">
      <div className="max-w-5xl mx-auto px-6 h-11 flex items-center gap-2.5">
        <div className="w-7 h-5 rounded overflow-hidden shrink-0 border border-lp-line bg-lp-bg flex items-center justify-center">
          {thumb ? (
            <img src={youtubeThumbnail(thumb)} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon size={11} className="text-lp-faint" />
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-lp-ink shrink-0">
          <Icon size={12} className="text-lp-violet" />
          {label}
        </span>
        {detail && <span className="text-[11.5px] font-mono text-lp-faint truncate">{detail}</span>}
        {action && <span className="ml-auto shrink-0">{action}</span>}
      </div>
    </div>
  )
}
