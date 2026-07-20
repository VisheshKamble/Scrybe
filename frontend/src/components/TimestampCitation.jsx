import { Clock } from 'lucide-react'

export default function TimestampCitation({ seconds, onClick }) {
  if (seconds == null) return null
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60).toString().padStart(2, '0')
  return (
    <button
      type="button"
      onClick={() => onClick?.(seconds)}
      className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-lp-violet bg-lp-violetsoft border border-transparent rounded-full px-2 py-0.5 hover:bg-lp-violet hover:text-white transition-colors duration-200"
    >
      <Clock size={10} strokeWidth={2.5} />
      {m}:{s}
    </button>
  )
}
