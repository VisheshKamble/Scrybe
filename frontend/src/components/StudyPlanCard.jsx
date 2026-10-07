import TimestampCitation from './TimestampCitation.jsx'
import { formatTime } from '../lib/time.js'

// Days are built server-side from real chapters; minutes are computed there too.
export default function StudyPlanCard({ plan, onSeek }) {
  return (
    <ol className="mt-3 grid gap-2.5">
      {plan.map((d, i) => (
        <li key={i} className="lift rounded-xl border-2 border-ink/15 bg-white p-3.5">
          <p className="text-[14.5px] font-extrabold text-ink">Day {d.day ?? i + 1}{d.title ? `: ${d.title}` : ''}</p>
          <p className="text-[12.5px] font-semibold text-mute mb-2">about {d.watch_minutes} min of video</p>
          {d.focus?.length > 0 && <p className="text-[13.5px] text-ink-soft mb-2">Focus: {d.focus.join(', ')}</p>}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {d.sections.map((s) => (
              <span key={s.evidence_id} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                {s.title} <TimestampCitation seconds={s.start_seconds} onClick={onSeek} />
                <span className="text-faint">→ {formatTime(s.end_seconds)}</span>
              </span>
            ))}
          </div>
          {d.activities?.length > 0 && (
            <ul className="list-disc pl-5 text-[13.5px] text-ink-soft">{d.activities.map((a, j) => <li key={j}>{a}</li>)}</ul>
          )}
        </li>
      ))}
    </ol>
  )
}
