import { AlertTriangle, CheckCircle2, SearchX } from 'lucide-react'

// Tells the reader how much to trust an answer, in plain words, before they
// read it. Mirrors the backend verifier: high/medium = grounded, low = caveat,
// none = nothing found in the video.
const META = {
  high: { Icon: CheckCircle2, label: 'Verified against the video', cls: 'bg-mint-soft text-ok border-ok/40' },
  medium: { Icon: CheckCircle2, label: 'Supported by the video', cls: 'bg-sky-soft text-blue-deep border-blue/30' },
  low: { Icon: AlertTriangle, label: 'Low confidence: check the sources', cls: 'bg-warn-soft text-warn border-warn/40' },
  none: { Icon: SearchX, label: 'Not found in this video', cls: 'bg-sunk text-mute border-line2' },
}

export default function ConfidenceBadge({ confidence }) {
  const m = META[confidence]
  if (!m) return null
  const { Icon } = m
  return (
    <span className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${m.cls}`}>
      <Icon size={12} aria-hidden="true" /> {m.label}
    </span>
  )
}
