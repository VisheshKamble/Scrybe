import { motion, useReducedMotion } from 'framer-motion'
import { Download, Eye, FileText, Radio, Rows3, Sparkles } from 'lucide-react'
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
    return <span className="w-1.5 h-1.5 rounded-full bg-lp-cyan shrink-0 shadow-[0_0_8px_rgba(34,231,208,0.8)]" />
  }
  if (state === 'active') {
    return <span className="w-1.5 h-1.5 rounded-full bg-lp-violet shrink-0 animate-pulse-dot shadow-[0_0_8px_rgba(124,92,255,0.9)]" />
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-lp-line2 shrink-0" />
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
          : { opacity: 1, y: [0, -10, 0], rotate: -1.4, scale: 1 }
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
      {/* halo: soft rotating conic glow behind the panel */}
      <div className="absolute -inset-10 -z-10 opacity-70">
        <div
          className="w-full h-full animate-spin-slow blur-3xl"
          style={{
            background:
              'conic-gradient(from 90deg, rgba(124,92,255,0.35), rgba(34,231,208,0.25), transparent 40%, rgba(124,92,255,0.35))',
          }}
        />
      </div>
      <div className="absolute -inset-6 bg-gradient-to-tr from-lp-violet/25 via-lp-cyan/10 to-transparent blur-3xl -z-10" />

      <div className="relative rounded-[26px] border border-lp-line2 bg-lp-card/90 backdrop-blur-xl shadow-card-lg overflow-hidden">
        {/* scanning beam — reinforces "watches", not just "listens" */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden opacity-0 sm:opacity-100">
          <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-lp-cyan/25 via-lp-cyan/5 to-transparent animate-scanline" />
        </div>

        {/* title bar */}
        <div className="relative flex items-center gap-2 px-4 py-3 border-b border-lp-line bg-white/[0.02]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]/90" />
          <span className="mx-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-lp-faint tracking-wide">
            <Radio size={10} className="text-lp-cyan" />
            scrybe — agentic video intelligence
          </span>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_1.15fr]">
          {/* left: input + pipeline */}
          <div className="p-5 border-b sm:border-b-0 sm:border-r border-lp-line">
            <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-2">VIDEO URL</p>
            <div className="rounded-lg border border-lp-line2 bg-black/30 px-3 py-2.5 mb-5">
              <span className="font-mono text-[12px] text-lp-muted">
                youtube.com/watch?v=<span className="text-lp-ink">a1B2c…</span>
                <span className="inline-block w-[6px] h-[13px] bg-lp-cyan/80 align-middle ml-0.5 animate-pulse" />
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
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border border-lp-violet/30 bg-lp-violet/10 text-lp-violet2">
                {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} elapsed
              </span>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border border-lp-violet/30 bg-lp-violet/10 text-lp-violet2">
                4 agents
              </span>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border border-lp-cyan/30 bg-lp-cyan/10 text-lp-cyan">
                timestamp-grounded
              </span>
            </div>

            <div className="space-y-3.5">
              {SECTIONS.map((section, i) => {
                const revealed = allDone || i < step
                return (
                  <div key={section.title}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-[3px] h-3 rounded-full bg-gradient-to-b from-lp-violet to-lp-cyan" />
                      <span className="text-[12.5px] font-semibold text-lp-ink">{section.title}</span>
                    </div>
                    <div className="space-y-1 pl-[9px]">
                      {section.lines.map((w, li) => (
                        <div key={li} className="h-[5px] rounded-full bg-lp-line overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            initial={false}
                            animate={{ width: revealed ? `${w}%` : '0%' }}
                            style={{
                              backgroundImage: revealed
                                ? 'linear-gradient(90deg, #7C5CFF, #22E7D0)'
                                : 'none',
                            }}
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
                    ? 'border-lp-cyan/40 text-lp-cyan bg-lp-cyan/10'
                    : 'border-lp-line2 text-lp-faint'
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
