import { motion, useReducedMotion } from 'framer-motion'
import { Eye, FileText, Link2, MessageSquareText, Rows3, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// This content really is a sequence, so the numbering earns its place.
const STEPS = [
  { color: 'bg-white text-ink', icon: Link2, who: 'You', title: 'Paste a link', body: 'A YouTube URL is all it takes. The job runs in the background, so nothing waits on an open connection.', model: 'POST /api/videos' },
  { color: 'bg-mark text-ink', icon: FileText, who: 'Transcript agent', title: 'Hears it', body: 'Uses captions when they exist and falls back to Whisper when they don’t.', model: 'whisper-large-v3-turbo' },
  { color: 'bg-sky text-ink', icon: Eye, who: 'Visual agent', title: 'Sees it', body: 'Samples keyframes at scene changes and reads slides, code and charts with a vision model.', model: 'qwen/qwen3.6-27b' },
  { color: 'bg-violet text-white', icon: Rows3, who: 'Segmentation agent', title: 'Chapters it', body: 'Finds real topic boundaries from the transcript and the visual notes.', model: 'openai/gpt-oss-20b' },
  { color: 'bg-mint text-ink', icon: Sparkles, who: 'Synthesis agent', title: 'Checks and writes it', body: 'Fact-checks claims with live web search, then streams the summary as it’s written.', model: 'groq/compound' },
]

const LOG = [
  ['00:00', 'queued', 'job accepted'],
  ['00:03', 'transcript', 'captions found, 412 lines'],
  ['00:19', 'visual', '14 scene changes, 14 frames read'],
  ['00:41', 'segmentation', '5 chapters'],
  ['00:58', 'synthesis', '9 claims found, 7 verified'],
  ['01:12', 'done', 'report ready, chat online'],
]

function JobLog() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const [count, setCount] = useState(reduce ? LOG.length : 0)

  useEffect(() => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    let timer
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        let n = 0
        timer = setInterval(() => {
          n += 1
          setCount(n)
          if (n >= LOG.length) clearInterval(timer)
        }, 520)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearInterval(timer)
    }
  }, [reduce])

  return (
    <div ref={ref} className="rounded-2xl bg-night-2 border border-night-line overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-night-line">
        <p className="text-[12.5px] font-semibold text-night-text">Example job log</p>
        <span className="font-mono text-[11px] text-night-mute">job_7f3a</span>
      </div>
      <ol className="p-4 font-mono text-[12.5px] leading-[1.9] min-h-[196px]">
        {LOG.slice(0, count).map(([t, tag, msg], i) => (
          <li key={t} className="flex gap-3 animate-pop-in">
            <span className="text-night-mute tabular-nums">{t}</span>
            <span className={`w-[104px] shrink-0 ${i === LOG.length - 1 ? 'text-[#5EE0A8]' : 'text-[#9CA8FF]'}`}>{tag}</span>
            <span className="text-night-text/90">{msg}</span>
          </li>
        ))}
        {count < LOG.length && (
          <li className="text-night-mute">
            <span className="inline-block w-[7px] h-[14px] bg-night-mute align-middle animate-caret-blink" />
          </li>
        )}
      </ol>
    </div>
  )
}

export default function Pipeline() {
  const reduce = useReducedMotion()
  return (
    <section id="pipeline" className="relative bg-night text-night-text py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-dots-night opacity-80" />
      <div className="absolute -top-40 -right-32 w-[30rem] h-[30rem] rounded-full bg-violet/30 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-32 w-[26rem] h-[26rem] rounded-full bg-blue/30 blur-3xl" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display font-extrabold text-[clamp(1.9rem,4vw,3rem)] leading-[1.04] tracking-[-0.035em] text-white [text-wrap:balance]">
            Scrybe runs the video. Four agents do the reading.
          </h2>
          <p className="mt-4 text-[16.5px] leading-[1.6] text-night-mute max-w-xl">
            Every video goes through the same LangGraph pipeline, in order. A fifth agent stays on
            call afterwards for your questions.
          </p>
        </div>

        <ol className="mt-14 grid md:grid-cols-5 gap-x-5 gap-y-10 relative">
          {/* the rail the job travels along */}
          <div className="hidden md:block absolute left-[22px] right-[22px] top-[23px] h-[3px] rounded-full bg-night-line" aria-hidden="true">
            <motion.div
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'left', background: 'linear-gradient(90deg,#FFDD4A,#33B5FF,#6A3DF0,#14D3A0)' }}
              className="h-full rounded-full"
            />
          </div>

          {STEPS.map(({ color, icon: Icon, who, title, body, model }, i) => (
            <li key={title} className="relative">
              <span className={`relative z-10 w-12 h-12 rounded-2xl ${color} border-2 border-white/90 flex items-center justify-center mb-5 rotate-[-4deg]`}>
                <Icon size={18} strokeWidth={2.2} />
                <span className="absolute -top-2 -right-2 w-[20px] h-[20px] rounded-full bg-ink text-white border border-white/70 font-mono text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </span>
              <p className="text-[13px] font-semibold text-night-mute mb-0.5">{who}</p>
              <h3 className="text-[19px] font-extrabold tracking-[-0.025em] text-white mb-2">{title}</h3>
              <p className="text-[14px] leading-[1.55] text-night-mute mb-3">{body}</p>
              <code className="inline-block font-mono text-[11px] text-[#B3BCFF] bg-night-3 border border-night-line rounded-md px-2 py-1 break-all">
                {model}
              </code>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid lg:grid-cols-[1fr_1.15fr] gap-5 items-stretch">
          <div className="rounded-2xl border-2 border-dashed border-pink/70 bg-night-2/60 p-6 flex gap-4">
            <span className="w-12 h-12 rounded-2xl bg-pink text-ink border-2 border-white/90 rotate-[4deg] flex items-center justify-center shrink-0">
              <MessageSquareText size={18} strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-night-mute mb-0.5">QA agent, on demand</p>
              <h3 className="text-[19px] font-extrabold tracking-[-0.025em] text-white mb-2">Answers with a timestamp</h3>
              <p className="text-[14px] leading-[1.55] text-night-mute mb-3 max-w-sm">
                Retrieves from a FAISS index of transcript lines and visual descriptions, then cites
                the moment it used.
              </p>
              <code className="inline-block font-mono text-[11px] text-[#B3BCFF] bg-night-3 border border-night-line rounded-md px-2 py-1">
                openai/gpt-oss-120b
              </code>
            </div>
          </div>
          <JobLog />
        </div>
      </div>
    </section>
  )
}
