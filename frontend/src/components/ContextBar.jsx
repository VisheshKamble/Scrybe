import { GitCompare, MessageSquareText, ScrollText } from 'lucide-react'
import { Link, useMatch } from 'react-router-dom'
import { getJobMeta, getVideoMeta } from '../lib/storage.js'
import { youtubeThumbnail } from '../lib/youtube.js'

// Once you're inside a report, chat or comparison the main nav no longer says
// which video you're on. This strip does, and offers the one-click hop between
// "reading the report" and "asking about it".
export default function ContextBar() {
  const reportMatch = useMatch('/app/report/:jobId')
  const chatMatch = useMatch('/app/chat/:videoId')
  const compareMatch = useMatch('/app/compare/:jobId')

  if (reportMatch) {
    const meta = getJobMeta(reportMatch.params.jobId)
    if (!meta) return null
    return (
      <Bar
        thumb={meta.youtubeId}
        icon={ScrollText}
        label="Report"
        detail={meta.youtubeId}
        action={
          meta.videoId && (
            <Link to={`/app/chat/${meta.videoId}`} className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-mark hover:text-white transition-colors">
              <MessageSquareText size={13} strokeWidth={2.4} />
              Ask about this video
            </Link>
          )
        }
      />
    )
  }

  if (chatMatch) {
    const meta = getVideoMeta(chatMatch.params.videoId)
    if (!meta) return null
    return (
      <Bar
        thumb={meta.youtubeId}
        icon={MessageSquareText}
        label="Chat"
        detail={meta.youtubeId}
        action={
          meta.jobId && (
            <Link to={`/app/report/${meta.jobId}`} className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-mark hover:text-white transition-colors">
              <ScrollText size={13} strokeWidth={2.4} />
              View report
            </Link>
          )
        }
      />
    )
  }

  if (compareMatch) {
    const meta = getJobMeta(compareMatch.params.jobId)
    if (!meta) return null
    return <Bar thumb={meta.youtubeIds?.[0]} icon={GitCompare} label="Comparison" detail={`${meta.youtubeUrls?.length ?? 0} videos`} />
  }

  return null
}

function Bar({ thumb, icon: Icon, label, detail, action }) {
  return (
    <div className="border-b-2 border-ink bg-violet text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-12 flex items-center gap-3">
        <div className="w-9 h-6 rounded-md overflow-hidden shrink-0 bg-white/20 border border-white/40 flex items-center justify-center">
          {thumb ? <img src={youtubeThumbnail(thumb)} alt="" className="w-full h-full object-cover" /> : <Icon size={12} className="text-faint" />}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-white shrink-0">
          <Icon size={13} className="text-mark" strokeWidth={2.6} />
          {label}
        </span>
        {detail && <span className="text-[12px] font-mono text-white/60 truncate">{detail}</span>}
        {action && <span className="ml-auto shrink-0">{action}</span>}
      </div>
    </div>
  )
}
