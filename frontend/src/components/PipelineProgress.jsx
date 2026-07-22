import { motion } from 'framer-motion'
import { Eye, FileText, Rows3, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

// Same four agents, same visual grammar as the landing page's
// PipelineDemo -- the point is that what you see while a real video is
// processing should be recognizably the thing the homepage promised,
// not a downgrade from it.
const AGENTS = [
  { key: 'transcript', label: 'Transcript', icon: FileText, note: 'captions or Whisper' },
  { key: 'visual', label: 'Visual', icon: Eye, note: 'keyframes read by a vision model' },
  { key: 'segmentation', label: 'Segmentation', icon: Rows3, note: 'chapter boundaries' },
  { key: 'synthesis', label: 'Synthesis', icon: Sparkles, note: 'fact-checked, streamed report' },
]

function StatusDot({ state }) {
  if (state === 'done') return <span className="w-2 h-2 rounded-full bg-lp-green shrink-0" />
  if (state === 'active') return <span className="w-2 h-2 rounded-full bg-lp-violet shrink-0 animate-pulse-dot" />
  return <span className="w-2 h-2 rounded-full bg-lp-line shrink-0" />
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Drives an honest-feeling step indicator off real wall-clock time since
 * the job was submitted, since the backend doesn't emit per-agent
 * progress events. We're not pretending to know exactly which agent is
 * running -- `note` under the active step says so -- but "roughly here,
 * roughly this long" beats a bare spinner for a pipeline that can run a
 * minute or more.
 */
export default function PipelineProgress({ startedAt, estimateSeconds = 100, itemCount = 1 }) {
  const [elapsed, setElapsed] = useState(() => (Date.now() - startedAt) / 1000)

  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500)
    return () => clearInterval(id)
  }, [startedAt])

  const totalEstimate = estimateSeconds * itemCount
  const progressRatio = Math.min(0.96, elapsed / totalEstimate)
  const rawStep = Math.floor(progressRatio * AGENTS.length)
  const activeStep = Math.min(AGENTS.length - 1, rawStep)
  const runningLong = elapsed > totalEstimate * 1.3

  return (
    <div className="rounded-2xl border border-lp-line bg-lp-card p-5 md:p-6 text-left">
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint">AGENT PIPELINE</p>
        <span className="font-mono text-[11px] tabular-nums text-lp-muted">{formatElapsed(elapsed)} elapsed</span>
      </div>

      <ul className="space-y-3.5">
        {AGENTS.map((agent, i) => {
          const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending'
          const Icon = agent.icon
          return (
            <li key={agent.key} className="flex items-center gap-3">
              <StatusDot state={state} />
              <Icon size={14} className={state === 'pending' ? 'text-lp-faint' : 'text-lp-violet'} strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <span className={`text-[13.5px] font-medium ${state === 'pending' ? 'text-lp-faint' : 'text-lp-ink'}`}>
                  {agent.label}
                </span>
                {state === 'active' && (
                  <span className="block text-[11.5px] text-lp-muted leading-tight">{agent.note}</span>
                )}
              </div>
              <span className="font-mono text-[10.5px] text-lp-faint shrink-0">
                {state === 'done' ? 'Done' : state === 'active' ? 'Running…' : 'Queued'}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 h-1.5 rounded-full bg-lp-line overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-lp-violet to-lp-violet2"
          animate={{ width: `${progressRatio * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {runningLong && (
        <p className="text-[12px] text-lp-faint leading-relaxed mt-3">
          Longer or unusually formatted videos can take a while longer than this — it&apos;s still working.
        </p>
      )}
    </div>
  )
}
