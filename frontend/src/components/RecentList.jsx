import { CheckCircle2, Clock3, GitCompare, Loader2, Trash2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHistory, removeHistoryEntry } from '../lib/storage.js'
import { youtubeThumbnail } from '../lib/youtube.js'

const STATUS_META = {
  queued: { label: 'Queued', icon: Clock3, className: 'text-lp-faint' },
  processing: { label: 'Processing', icon: Loader2, className: 'text-lp-violet', spin: true },
  done: { label: 'Ready', icon: CheckCircle2, className: 'text-lp-green' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-lp-red' },
}

function hrefFor(entry) {
  if (entry.type === 'compare') return `/app/compare/${entry.jobId}`
  return `/app/report/${entry.jobId}`
}

/**
 * Renders the locally-persisted history of analyses and comparisons.
 * There's no backend account system in Scrybe, so this is deliberately a
 * browser-local list rather than a synced one -- but a local list beats
 * no list, and it's the difference between every run being throwaway and
 * a user having somewhere to come back to.
 */
export default function RecentList({ limit, showEmpty = true, title = 'RECENT' }) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    setEntries(getHistory())
  }, [])

  function handleRemove(id) {
    removeHistoryEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const visible = limit ? entries.slice(0, limit) : entries

  if (visible.length === 0) {
    if (!showEmpty) return null
    return (
      <div>
        <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-3">{title}</p>
        <div className="rounded-xl border border-dashed border-lp-line px-4 py-6 text-center">
          <p className="text-[13px] text-lp-muted">Nothing here yet &mdash; your analyses will show up as you run them.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint">{title}</p>
        {limit && entries.length > limit && (
          <Link to="/app/history" className="text-[12px] font-medium text-lp-violet hover:text-lp-ink transition-colors">
            View all ({entries.length})
          </Link>
        )}
      </div>
      <ul className="space-y-2">
        {visible.map((entry) => {
          const meta = STATUS_META[entry.status] ?? STATUS_META.queued
          const StatusIcon = meta.icon
          const thumbId = entry.type === 'compare' ? entry.youtubeIds?.[0] : entry.youtubeId

          return (
            <li key={entry.id}>
              <div className="group flex items-center gap-3 rounded-xl border border-lp-line bg-lp-card/80 px-3 py-2.5 hover:border-lp-violet/40 hover:shadow-violet-glow transition-all duration-300">
                <Link to={hrefFor(entry)} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-8 rounded-md overflow-hidden shrink-0 bg-lp-bg border border-lp-line2 flex items-center justify-center">
                    {thumbId ? (
                      <img src={youtubeThumbnail(thumbId)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <GitCompare size={13} className="text-lp-faint" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium text-lp-ink truncate">
                      {entry.type === 'compare'
                        ? `Comparison — ${entry.youtubeUrls?.length ?? 0} videos`
                        : entry.title || entry.youtubeId || 'Video analysis'}
                    </p>
                    <p className="text-[11.5px] text-lp-faint">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${meta.className}`}>
                    <StatusIcon size={12} className={meta.spin ? 'animate-spin' : ''} strokeWidth={2} />
                    {meta.label}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(entry.id)}
                  aria-label="Remove from history"
                  className="p-1.5 text-lp-faint hover:text-lp-red transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
