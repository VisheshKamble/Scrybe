import { CheckCircle2, Clock3, GitCompare, Loader2, Trash2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHistory, removeHistoryEntry } from '../lib/storage.js'
import { youtubeThumbnail } from '../lib/youtube.js'

const STATUS_META = {
  queued: { label: 'Queued', icon: Clock3, className: 'text-ink bg-mark' },
  processing: { label: 'Processing', icon: Loader2, className: 'text-white bg-blue', spin: true },
  done: { label: 'Ready', icon: CheckCircle2, className: 'text-ink bg-mint' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-white bg-bad' },
}

function hrefFor(entry) {
  return entry.type === 'compare' ? `/app/compare/${entry.jobId}` : `/app/report/${entry.jobId}`
}

function titleFor(entry) {
  return entry.type === 'compare' ? `Comparison of ${entry.youtubeUrls?.length ?? 0} videos` : entry.title || entry.youtubeId || 'Video analysis'
}

function Status({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.queued
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-extrabold ${meta.className}`}>
      <Icon size={11} className={meta.spin ? 'animate-spin' : ''} strokeWidth={2.6} />
      {meta.label}
    </span>
  )
}

/**
 * Browser-local history of analyses and comparisons. There's no account
 * system, so this list is the way back to a past run.
 */
export default function RecentList({ limit, showEmpty = true, title = 'Recent', layout = 'list', filter = 'all' }) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    setEntries(getHistory())
  }, [])

  function handleRemove(id) {
    removeHistoryEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const filtered = filter === 'all' ? entries : entries.filter((e) => (filter === 'compare' ? e.type === 'compare' : e.type !== 'compare'))
  const visible = limit ? filtered.slice(0, limit) : filtered

  const heading = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[19px] font-extrabold tracking-[-0.025em] text-ink">{title}</h2>
      {limit && filtered.length > limit && (
        <Link to="/app/history" className="text-[13px] font-extrabold text-violet hover:text-ink transition-colors">
          View all {filtered.length}
        </Link>
      )}
    </div>
  )

  if (visible.length === 0) {
    if (!showEmpty) return null
    return (
      <div>
        {heading}
        <div className="rounded-2xl border-2 border-dashed border-ink/30 bg-white/60 px-5 py-10 text-center">
          <p className="text-[14.5px] font-semibold text-ink mb-1">Nothing here yet</p>
          <p className="text-[13.5px] text-mute">Analyses you run will show up here, with a link back in.</p>
        </div>
      </div>
    )
  }

  if (layout === 'grid') {
    return (
      <div>
        {heading}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {visible.map((entry) => {
            const thumbId = entry.type === 'compare' ? entry.youtubeIds?.[0] : entry.youtubeId
            return (
              <div key={entry.id} className="group relative">
                <Link to={hrefFor(entry)} className="block rounded-2xl border-2 border-ink bg-white overflow-hidden shadow-pop hover:-translate-y-1 transition-transform duration-200">
                  <div className="relative aspect-video bg-sunk flex items-center justify-center overflow-hidden">
                    {thumbId ? <img src={youtubeThumbnail(thumbId)} alt="" className="w-full h-full object-cover" /> : <GitCompare size={20} className="text-faint" />}
                    {entry.type === 'compare' && (
                      <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-violet text-white text-[10.5px] font-bold px-1.5 py-0.5">
                        <GitCompare size={10} strokeWidth={2.6} /> Compare
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[13.5px] font-bold text-ink leading-snug line-clamp-2 mb-2 min-h-[2.5em]">{titleFor(entry)}</p>
                    <Status status={entry.status} />
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(entry.id)}
                  aria-label="Remove from history"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface/90 backdrop-blur-sm text-mute hover:text-bad transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {heading}
      <ul className="space-y-2">
        {visible.map((entry) => {
          const thumbId = entry.type === 'compare' ? entry.youtubeIds?.[0] : entry.youtubeId
          return (
            <li key={entry.id}>
              <div className="group flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-3 py-2.5 shadow-pop">
                <Link to={hrefFor(entry)} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-14 h-9 rounded-lg overflow-hidden shrink-0 bg-sunk flex items-center justify-center">
                    {thumbId ? <img src={youtubeThumbnail(thumbId)} alt="" className="w-full h-full object-cover" /> : <GitCompare size={14} className="text-faint" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-ink truncate">{titleFor(entry)}</p>
                    <p className="text-[12px] text-faint">{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <Status status={entry.status} />
                </Link>
                <button type="button" onClick={() => handleRemove(entry.id)} aria-label="Remove from history" className="p-1.5 text-mute hover:text-bad transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
