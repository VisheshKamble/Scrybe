import { motion, useReducedMotion } from 'framer-motion'
import { Download, Eye, FileText, Rows3, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

const AGENTS = [
  { key: 'transcript', label: 'Transcript', icon: FileText, note: 'captions + Whisper' },
  { key: 'visual', label: 'Visual', icon: Eye, note: 'keyframes → vision model' },
  { key: 'segmentation', label: 'Segmentation', icon: Rows3, note: 'chapter boundaries' },
  { key: 'synthesis', label: 'Synthesis', icon: Sparkles, note: 'fact-checked summary' },
]

const SECTIONS = [
  { title: 'Executive Summary', lines: [92, 68] },
  { title: 'Chapters', lines: [80, 55, 40] },
  { title: 'Visual Highlights', lines: [70, 88] },
  { title: 'Fact-Checked Claims', lines: [60, 76, 48] },
]

const STEP_MS = 1600
const HOLD_MS = 1800

function StatusDot({ state }) {
  if (state === 'done') {
    return <span className="w-1.5 h-1.5 rounded-full bg-lp-green shrink-0" />
  }
  if (state === 'active') {
    return <span className="w-1.5 h-1.5 rounded-full bg-lp-blue shrink-0 animate-pulse-dot" />
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-lp-line shrink-0" />
}

export default function PipelineDemo() {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(0) // 0..AGENTS.length -> AGENTS.length means "all done"
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (reduceMotion) {
      setStep(AGENTS.length)
      setElapsed(87)
      return
    }
    let cancelled = false
    let timeoutId

    function tick(current) {
      if (cancelled) return
      setStep(current)
      setElapsed(current === 0 ? 0 : Math.min(87, current * 22 + 8))
      const wait = current > AGENTS.length ? HOLD_MS : STEP_MS
      timeoutId = setTimeout(() => {
        const next = current >= AGENTS.length ? 0 : current + 1
        tick(next)
      }, wait)
    }

    tick(0)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [reduceMotion])

  const allDone = step >= AGENTS.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: 0, scale: 0.97 }}
      animate={
        reduceMotion
          ? { opacity: 1, y: 0, rotate: -1, scale: 1 }
          : { opacity: 1, y: [0, -12, 0], rotate: -1.2, scale: 1 }
      }
      transition={
        reduceMotion
          ? { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
          : {
              opacity: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
              rotate: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 6, ease: 'easeInOut', repeat: Infinity, delay: 0.7 },
            }
      }
      className="relative w-full max-w-[620px] mx-auto"
    >
      <div className="absolute -inset-6 bg-gradient-to-tr from-lp-violet/20 via-lp-violet2/10 to-transparent blur-3xl -z-10" />

      <div className="rounded-2xl border border-lp-line bg-lp-card shadow-[0_30px_60px_-15px_rgba(20,10,40,0.18)] overflow-hidden">
        {/* title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-lp-line bg-lp-bg/60">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          <span className="mx-auto font-mono text-[11px] text-lp-faint tracking-wide">
            scrybe — agentic video intelligence
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.15fr]">
          {/* left: input + pipeline */}
          <div className="p-5 border-b sm:border-b-0 sm:border-r border-lp-line">
            <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-2">VIDEO URL</p>
            <div className="rounded-lg border border-lp-line bg-lp-bg px-3 py-2.5 mb-5">
              <span className="font-mono text-[12px] text-lp-muted">
                youtube.com/watch?v=<span className="text-lp-ink">a1B2c…</span>
                <span className="inline-block w-[6px] h-[13px] bg-lp-violet/70 align-middle ml-0.5 animate-pulse" />
              </span>
            </div>

            <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-2.5">AGENT PIPELINE</p>
            <ul className="space-y-2.5">
              {AGENTS.map((agent, i) => {
                const state = allDone || i < step ? 'done' : i === step ? 'active' : 'pending'
                const Icon = agent.icon
                return (
                  <li key={agent.key} className="flex items-center gap-2.5">
                    <StatusDot state={state} />
                    <Icon size={13} className={state === 'pending' ? 'text-lp-faint' : 'text-lp-ink'} strokeWidth={2} />
                    <span className={`text-[13px] font-medium ${state === 'pending' ? 'text-lp-faint' : 'text-lp-ink'}`}>
                      {agent.label}
                    </span>
                    <span className="ml-auto font-mono text-[10.5px] text-lp-faint">
                      {state === 'done' ? 'Done' : state === 'active' ? 'Running…' : 'Queued'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* right: live stats + report preview */}
          <div className="p-5">
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-lp-violetsoft text-lp-violet">
                {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} elapsed
              </span>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-lp-violetsoft text-lp-violet">
                4 agents
              </span>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-lp-violetsoft text-lp-violet">
                timestamp-grounded
              </span>
            </div>

            <div className="space-y-3.5">
              {SECTIONS.map((section, i) => {
                const revealed = allDone || i < step
                return (
                  <div key={section.title}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-[3px] h-3 rounded-full bg-lp-violet" />
                      <span className="text-[12.5px] font-semibold text-lp-ink">{section.title}</span>
                    </div>
                    <div className="space-y-1 pl-[9px]">
                      {section.lines.map((w, li) => (
                        <div key={li} className="h-[5px] rounded-full bg-lp-line overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-lp-line"
                            initial={false}
                            animate={{ width: revealed ? `${w}%` : '0%' }}
                            style={{ backgroundColor: revealed ? '#DCD3F7' : 'transparent' }}
                            transition={{ duration: 0.5, delay: li * 0.08, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <span
                className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium px-3 py-1.5 rounded-full border transition-colors duration-500 ${
                  allDone
                    ? 'border-lp-violet text-lp-violet'
                    : 'border-lp-line text-lp-faint'
                }`}
              >
                <Download size={12} />
                Export PDF
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
