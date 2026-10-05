import { motion } from 'framer-motion'
import { Check, Eye, FileText, Rows3, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

// Same four agents as the landing page's pipeline, so what you watch while a
// real video processes is recognisably what the site promised.
const AGENTS = [
  { key: 'transcript', label: 'Hearing it', who: 'Transcript agent', icon: FileText, tone: 'bg-mark text-ink', note: 'Captions, or Whisper if there are none' },
  { key: 'visual', label: 'Seeing it', who: 'Visual agent', icon: Eye, tone: 'bg-sky text-ink', note: 'Keyframes read by a vision model' },
  { key: 'segmentation', label: 'Chaptering it', who: 'Segmentation agent', icon: Rows3, tone: 'bg-violet text-white', note: 'Finding the real topic breaks' },
  { key: 'synthesis', label: 'Checking and writing it', who: 'Synthesis agent', icon: Sparkles, tone: 'bg-mint text-ink', note: 'Fact-checking, then the report' },
]

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * The backend emits no per-agent progress, so this runs off wall-clock time
 * since submission. The copy says "roughly here", not "exactly here", which
 * still beats a bare spinner for a job that can run a minute or more.
 */
export default function PipelineProgress({ startedAt, estimateSeconds = 100, itemCount = 1 }) {
  const [elapsed, setElapsed] = useState(() => (Date.now() - startedAt) / 1000)

  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500)
    return () => clearInterval(id)
  }, [startedAt])

  const totalEstimate = estimateSeconds * itemCount
  const progressRatio = Math.min(0.96, elapsed / totalEstimate)
  const activeStep = Math.min(AGENTS.length - 1, Math.floor(progressRatio * AGENTS.length))
  const runningLong = elapsed > totalEstimate * 1.3

  return (
    <div className="rounded-[26px] border-2 border-ink bg-white p-5 md:p-6 text-left shadow-pop">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[14px] font-bold text-ink">Working through the video</p>
        <span className="font-mono text-[12px] tabular-nums font-semibold text-ink bg-mark border border-ink rounded-md px-2 py-1">{formatElapsed(elapsed)}</span>
      </div>

      <ol className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-line" aria-hidden="true" />
        {AGENTS.map((agent, i) => {
          const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending'
          const Icon = agent.icon
          return (
            <li key={agent.key} className="relative flex items-start gap-3.5 py-2.5">
              <span
                className={`relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300 ${
                  state === 'done' ? 'bg-ink border-ink text-white' : state === 'active' ? `${agent.tone} border-ink scale-110` : 'bg-white border-line2 text-faint'
                }`}
              >
                {state === 'done' ? <Check size={15} strokeWidth={3} /> : <Icon size={14} strokeWidth={2.3} className={state === 'active' ? 'animate-pulse-dot' : ''} />}
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-[14.5px] font-bold leading-tight ${state === 'pending' ? 'text-faint' : 'text-ink'}`}>{agent.label}</p>
                <p className={`text-[12.5px] leading-snug mt-0.5 ${state === 'active' ? 'text-mute' : 'text-faint'}`}>
                  {state === 'active' ? agent.note : agent.who}
                </p>
              </div>
              <span className={`text-[12px] font-semibold pt-1 shrink-0 ${state === 'done' ? 'text-ink' : state === 'active' ? 'text-violet' : 'text-faint'}`}>
                {state === 'done' ? 'Done' : state === 'active' ? 'Running' : 'Waiting'}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 h-3 rounded-full bg-sunk border-2 border-ink overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-mark via-sky to-mint" animate={{ width: `${progressRatio * 100}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
      </div>

      {runningLong && (
        <p className="text-[13px] text-mute leading-relaxed mt-3">Longer or unusually formatted videos take more time than this. It’s still working.</p>
      )}
    </div>
  )
}
