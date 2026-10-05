import { motion } from 'framer-motion'
import { AlertTriangle, Check } from 'lucide-react'
import { formatTime } from '../lib/time.js'
import { chapterColor } from '../lib/palette.js'
import TimestampCitation from './TimestampCitation.jsx'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }

export function videoLength(chapters = [], claims = []) {
  const ends = chapters.map((c) => c.end_seconds ?? 0)
  const stamps = claims.map((c) => c.timestamp_seconds ?? 0)
  return Math.max(1, ...ends, ...stamps)
}

/** The whole video as one strip. Each chapter keeps its own colour everywhere. */
export function TimelineStrip({ chapters = [], claims = [], onSeek, activeSeconds }) {
  if (!chapters.length) return null
  const total = videoLength(chapters, claims)
  const pct = (t) => `${Math.min(100, (t / total) * 100)}%`
  return (
    <div className="rounded-[22px] bg-white border-2 border-ink px-4 pt-3 pb-3.5 shadow-pop">
      <div className="relative h-6">
        {claims.map((c, i) =>
          c.timestamp_seconds != null ? (
            <button key={i} type="button" onClick={() => onSeek?.(c.timestamp_seconds)}
              title={`${c.verified ? 'Verified' : 'Unverified'} at ${formatTime(c.timestamp_seconds)}: ${c.text}`}
              aria-label={`${c.verified ? 'Verified' : 'Unverified'} claim at ${formatTime(c.timestamp_seconds)}`}
              className={`absolute top-0 -translate-x-1/2 w-[19px] h-[19px] rounded-full border-2 border-ink flex items-center justify-center transition-transform hover:scale-125 ${c.verified ? 'bg-mint text-ink' : 'bg-coral text-ink'}`}
              style={{ left: pct(c.timestamp_seconds) }}>
              {c.verified ? <Check size={10} strokeWidth={3.6} /> : <AlertTriangle size={9} strokeWidth={3} />}
            </button>
          ) : null,
        )}
      </div>
      <div className="relative flex gap-[3px] h-9">
        {chapters.map((c, i) => {
          const k = chapterColor(i)
          const active = activeSeconds != null && activeSeconds >= c.start_seconds && activeSeconds < c.end_seconds
          return (
            <button key={i} type="button" onClick={() => onSeek?.(c.start_seconds)} title={`${c.title} (${formatTime(c.start_seconds)})`} aria-label={`Chapter ${i + 1}: ${c.title}`}
              style={{ width: pct(c.end_seconds - c.start_seconds), minWidth: 8 }}
              className={`rounded-lg text-left px-1.5 font-mono text-[10.5px] font-bold overflow-hidden transition-all duration-150 ${active ? `${k.solid} ring-2 ring-ink` : `${k.soft} hover:brightness-95`}`}>
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between mt-1.5 font-mono text-[10.5px] text-faint tabular-nums"><span>0:00</span><span>{formatTime(total)}</span></div>
    </div>
  )
}

export function ChapterPanel({ chapters = [], onSeek, activeSeconds }) {
  if (!chapters.length) return <p className="text-[14px] text-mute py-6">No chapters were found for this video.</p>
  return (
    <motion.ol variants={container} initial="hidden" animate="show" className="space-y-3">
      {chapters.map((c, i) => {
        const k = chapterColor(i)
        const active = activeSeconds != null && activeSeconds >= c.start_seconds && activeSeconds < c.end_seconds
        return (
          <motion.li key={i} variants={item}>
            <button type="button" onClick={() => onSeek?.(c.start_seconds)} disabled={!onSeek}
              className={`w-full text-left rounded-[20px] border-2 p-4 transition-all duration-150 ${active ? `border-ink ${k.tint} shadow-pop` : 'border-ink/15 bg-white hover:border-ink'} ${onSeek ? 'cursor-pointer' : 'cursor-default'}`}>
              <div className="flex items-start gap-3.5">
                <span className={`mt-0.5 w-8 h-8 shrink-0 rounded-xl border-2 border-ink font-mono text-[13px] font-bold flex items-center justify-center rotate-[-4deg] ${k.solid}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <span className="font-extrabold text-[16px] tracking-[-0.02em] text-ink leading-snug">{c.title}</span>
                    <TimestampCitation seconds={c.start_seconds} active={active} />
                  </div>
                  <p className="text-mute text-[14px] leading-[1.55]">{c.summary}</p>
                  <p className="font-mono text-[11px] tabular-nums text-faint mt-2">{formatTime(c.start_seconds)} to {formatTime(c.end_seconds)}</p>
                </div>
              </div>
            </button>
          </motion.li>
        )
      })}
    </motion.ol>
  )
}

export function ClaimPanel({ claims = [], onSeek }) {
  if (!claims.length) return <p className="text-[14px] text-mute py-6">No checkable claims were found in this video.</p>
  return (
    <motion.ul variants={container} initial="hidden" animate="show" className="space-y-3">
      {claims.map((c, i) => (
        <motion.li key={i} variants={item} className={`rounded-[20px] border-2 border-ink p-4 ${c.verified ? 'bg-mint-soft' : 'bg-coral-soft'}`}>
          <div className="flex items-start gap-3.5">
            <span className={`mt-0.5 w-8 h-8 shrink-0 rounded-full border-2 border-ink flex items-center justify-center ${c.verified ? 'bg-mint text-ink' : 'bg-coral text-ink'}`}>
              {c.verified ? <Check size={15} strokeWidth={3.4} /> : <AlertTriangle size={14} strokeWidth={2.8} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15.5px] font-bold text-ink leading-snug">{c.text}</p>
              {c.verification_note && <p className="text-[13.5px] text-ink-soft/80 leading-[1.55] mt-1">{c.verification_note}</p>}
              <div className="flex items-center gap-2 mt-2.5">
                <span className={`text-[12px] font-extrabold ${c.verified ? 'text-ok' : 'text-warn'}`}>{c.verified ? 'Verified' : 'Unverified'}</span>
                {c.timestamp_seconds != null && <TimestampCitation seconds={c.timestamp_seconds} onClick={onSeek} />}
              </div>
            </div>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  )
}

export default function ChapterList({ chapters = [], claims = [], onSeek, activeSeconds }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section><h3 className="text-[15px] font-extrabold text-ink mb-3">Chapters</h3><ChapterPanel chapters={chapters} onSeek={onSeek} activeSeconds={activeSeconds} /></section>
      <section><h3 className="text-[15px] font-extrabold text-ink mb-3">Claims</h3><ClaimPanel claims={claims} onSeek={onSeek} /></section>
    </div>
  )
}
