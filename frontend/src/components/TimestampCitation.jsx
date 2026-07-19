export default function TimestampCitation({ seconds, onClick }) {
  if (seconds == null) return null
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60).toString().padStart(2, '0')
  return (
    <button
      onClick={() => onClick?.(seconds)}
      className="font-mono text-xs text-trace border border-border rounded px-1.5 py-0.5 hover:border-trace transition-colors"
    >
      {m}:{s}
    </button>
  )
}
