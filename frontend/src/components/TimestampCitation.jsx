import { Play } from 'lucide-react'
import { formatTime } from '../lib/time.js'

// A timecode "tape label": the unit of citation across the whole product.
export default function TimestampCitation({ seconds, onClick, active = false }) {
  if (seconds == null) return null
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick: () => onClick(seconds), 'aria-label': `Jump to ${formatTime(seconds)}` } : {})}
      className={`group inline-flex items-center gap-1 font-mono text-[11.5px] font-semibold tabular-nums rounded-md px-1.5 py-0.5 border border-ink transition-colors duration-150 ${
        active ? 'bg-ink text-mark' : 'bg-mark text-ink'
      } ${onClick ? 'hover:bg-ink hover:text-mark cursor-pointer' : ''}`}
    >
      {onClick && <Play size={8} fill="currentColor" strokeWidth={0} className="opacity-70 group-hover:opacity-100" />}
      {formatTime(seconds)}
    </Tag>
  )
}
