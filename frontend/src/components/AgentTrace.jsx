import { motion } from 'framer-motion'
import { BookOpenCheck, Brain, Database, Route, ShieldCheck, ShieldX, Zap } from 'lucide-react'

const ICON = { plan: Route, retrieve: Database, reason: Brain, verify: ShieldCheck, fallback: ShieldX, cache: Zap }
const LABEL = { plan: 'Plan', retrieve: 'Retrieve', reason: 'Reason', verify: 'Verify', fallback: 'Safe fallback', cache: 'Cache' }

// Makes the agent's work visible: every step the graph really ran, its time,
// and a one-line detail. Rendered from the server's trace, never invented.
export default function AgentTrace({ trace }) {
  if (!trace?.length) return null
  const total = trace.reduce((a, t) => a + (t.ms || 0), 0)
  return (
    <details className="group mt-2.5 rounded-xl border-2 border-ink/10 bg-ink text-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[12.5px] font-extrabold select-none">
        <span className="inline-flex items-center gap-1.5"><BookOpenCheck size={14} aria-hidden="true" /> How Scrybe answered · {trace.length} steps · {Math.round(total)} ms</span>
        <span className="text-white/60 group-open:hidden">show</span>
      </summary>
      <ol className="grid gap-0 border-t border-white/15 p-3">
        {trace.map((t, i) => {
          const Icon = ICON[t.step] || Brain
          const bad = t.step === 'fallback' || /rejected|failed/.test(t.detail)
          return (
            <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.09 }}
              className="relative flex gap-3 pb-3 last:pb-0">
              {i < trace.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-0.5 bg-white/20" aria-hidden="true" />}
              <span className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink ${bad ? 'bg-pink' : 'bg-mark'} text-ink`}><Icon size={14} aria-hidden="true" /></span>
              <div className="min-w-0 text-[12.5px] leading-snug">
                <p className="font-extrabold">{LABEL[t.step] || t.step} <span className="font-mono font-medium text-white/50">{t.ms} ms</span></p>
                <p className="text-white/75">{t.detail}</p>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </details>
  )
}
