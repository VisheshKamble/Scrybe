import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import TimestampCitation from './TimestampCitation.jsx'

function formatTime(seconds) {
  const total = Math.max(0, Math.round(seconds ?? 0))
  const m = Math.floor(total / 60)
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

export default function ChapterList({ chapters = [], claims = [], onSeek, activeSeconds }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section>
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-[3px] h-3.5 rounded-full bg-lp-violet" />
          <h3 className="text-[13px] font-semibold tracking-wide text-lp-ink">Chapters</h3>
          <span className="font-mono text-[11px] text-lp-faint ml-auto">{chapters.length}</span>
        </div>
        <motion.ol
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="space-y-2.5"
        >
          {chapters.map((c, i) => {
            const active =
              activeSeconds != null && activeSeconds >= c.start_seconds && activeSeconds < c.end_seconds
            return (
              <motion.li
                key={i}
                variants={item}
                onClick={() => onSeek?.(c.start_seconds)}
                className={`group rounded-xl border p-3.5 transition-colors duration-200 ${
                  onSeek ? 'cursor-pointer' : ''
                } ${
                  active
                    ? 'border-lp-violet/50 bg-lp-violetsoft/40'
                    : 'border-lp-line bg-lp-card hover:border-lp-violet/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-lp-violetsoft text-lp-violet text-[10.5px] font-mono font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-medium text-[14px] text-lp-ink">{c.title}</span>
                      <TimestampCitation
                        seconds={c.start_seconds}
                        onClick={onSeek ? () => onSeek(c.start_seconds) : undefined}
                      />
                    </div>
                    <p className="text-lp-muted text-[13px] leading-relaxed">{c.summary}</p>
                    <p className="font-mono text-[10.5px] tabular-nums text-lp-faint mt-1.5">
                      {formatTime(c.start_seconds)}&ndash;{formatTime(c.end_seconds)}
                    </p>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </motion.ol>
      </section>

      <section>
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-[3px] h-3.5 rounded-full bg-lp-violet" />
          <h3 className="text-[13px] font-semibold tracking-wide text-lp-ink">Claims</h3>
          <span className="font-mono text-[11px] text-lp-faint ml-auto">{claims.length}</span>
        </div>
        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="space-y-2.5"
        >
          {claims.map((c, i) => (
            <motion.li
              key={i}
              variants={item}
              className="rounded-xl border border-lp-line bg-lp-card p-3.5"
            >
              <div className="flex items-start gap-2.5">
                {c.verified ? (
                  <CheckCircle2 size={15} className="text-lp-green shrink-0 mt-0.5" strokeWidth={2} />
                ) : (
                  <AlertTriangle size={15} className="text-lp-amber shrink-0 mt-0.5" strokeWidth={2} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-lp-ink leading-relaxed">{c.text}</p>
                  {c.verification_note && (
                    <p className="text-[12.5px] text-lp-muted leading-relaxed mt-1">{c.verification_note}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10.5px] font-mono font-medium uppercase tracking-wide rounded-full px-2 py-0.5 ${
                        c.verified ? 'bg-lp-greensoft text-lp-green' : 'bg-lp-ambersoft text-lp-amber'
                      }`}
                    >
                      {c.verified ? 'Verified' : 'Unverified'}
                    </span>
                    {c.timestamp_seconds != null && (
                      <TimestampCitation
                        seconds={c.timestamp_seconds}
                        onClick={onSeek ? () => onSeek(c.timestamp_seconds) : undefined}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </section>
    </div>
  )
}
