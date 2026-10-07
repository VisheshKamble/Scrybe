import { ChevronDown } from 'lucide-react'
import TimestampCitation from './TimestampCitation.jsx'

// "Show your work": the exact passages an answer was built from. Native
// <details> keeps it keyboard- and screen-reader-accessible with no JS state.
export default function EvidenceList({ citations, onSeek }) {
  const items = (citations || []).filter((c) => c.snippet)
  if (items.length === 0) return null
  return (
    <details className="group mt-2.5 rounded-xl border-2 border-ink/10 bg-white/60 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[12.5px] font-extrabold text-ink select-none">
        <span>Sources ({items.length})</span>
        <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="grid gap-2 border-t-2 border-ink/10 p-3">
        {items.map((c) => (
          <li key={c.evidence_id} className="text-[13px] leading-relaxed text-ink-soft">
            <TimestampCitation seconds={c.start_seconds} onClick={onSeek} />
            <span className="ml-2">&ldquo;{c.snippet}{c.snippet.length >= 240 ? '…' : ''}&rdquo;</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
