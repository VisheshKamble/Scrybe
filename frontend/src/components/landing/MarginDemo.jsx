import { useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, ScanLine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatTime } from '../../lib/time.js'
import { chapterColor } from '../../lib/palette.js'
import { Marked } from '../ui.jsx'

// A made-up 12:41 lecture, used only to show what a finished report feels like.
// One loop: the playhead travels the video and everything answers to it.
const DURATION = 761
const CHAPTERS = [
  { t: 0, e: 108, title: 'Why older models forget' },
  { t: 108, e: 310, title: 'Attention, one word at a time' },
  { t: 310, e: 482, title: 'Putting position back in' },
  { t: 482, e: 630, title: 'What training costs' },
  { t: 630, e: 761, title: 'Takeaways' },
]
const LINES = [
  { t: 20, text: 'Older models read a sentence one word at a time, and lose the start.' },
  { t: 130, text: 'Attention lets every word ask every other word how relevant it is.', hl: 'how relevant it is' },
  { t: 340, text: 'Position has to be injected by hand, using sine and cosine waves.', hl: 'sine and cosine waves' },
  { t: 402, text: 'GPT-3 has 175 billion parameters.', hl: '175 billion parameters' },
  { t: 536, text: 'Training it cost under a million dollars.', hl: 'under a million dollars' },
  { t: 690, text: 'The takeaway: attention scales, and scale is what changed.', hl: 'attention scales' },
]
const CLAIMS = [
  { t: 402, text: 'GPT-3 has 175 billion parameters', ok: true, note: 'Matches the published GPT-3 paper.' },
  { t: 536, text: 'Training cost under $1M', ok: false, note: 'Published estimates run several times higher.' },
]
const FRAMES = [{ t: 205, label: 'Slide' }, { t: 450, label: 'Code' }, { t: 590, label: 'Chart' }]
const START = 36
const END = 745
const RUN_MS = 21000
const HOLD_MS = 2600

export default function MarginDemo() {
  const reduce = useReducedMotion()
  const [now, setNow] = useState(reduce ? 560 : START)

  useEffect(() => {
    if (reduce) { setNow(560); return }
    let raf
    let last = 0
    const t0 = performance.now()
    const tick = (ts) => {
      const p = (ts - t0) % (RUN_MS + HOLD_MS)
      const k = Math.min(1, p / RUN_MS)
      if (ts - last > 48) { setNow(START + (END - START) * k); last = ts }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduce])

  const chapterIdx = Math.max(0, CHAPTERS.findIndex((c) => now >= c.t && now < c.e))
  const chapter = CHAPTERS[chapterIdx]
  const col = chapterColor(chapterIdx)
  let lineIdx = -1
  LINES.forEach((l, i) => { if (now >= l.t) lineIdx = i })
  const shown = [lineIdx - 1, lineIdx, lineIdx + 1].filter((i) => i >= 0 && i < LINES.length)
  const pct = (t) => `${(t / DURATION) * 100}%`
  const checked = CLAIMS.filter((c) => now >= c.t).length

  return (
    <div className="relative">
      {/* floating stickers that react to the playhead */}
      <div style={{ '--r': '-7deg' }} className="hidden md:flex absolute -left-9 top-10 z-20 animate-bob items-center gap-1.5 rounded-xl bg-mint border-2 border-ink px-3 py-2 shadow-pop text-[13px] font-extrabold text-ink">
        <Check size={14} strokeWidth={3.4} /> {checked} of 2 claims checked
      </div>
      <div style={{ '--r': '5deg', animationDelay: '-2s' }} className="hidden md:block absolute -right-6 top-[44%] z-20 animate-bob rounded-xl bg-pink border-2 border-ink px-3 py-2 shadow-pop text-[13px] font-extrabold text-ink max-w-[190px] leading-tight">
        Now: {chapter.title}
      </div>
      <div style={{ '--r': '-4deg', animationDelay: '-3.4s' }} className="hidden md:block absolute -left-5 -bottom-5 z-20 animate-bob rounded-xl bg-mark border-2 border-ink px-3 py-1.5 shadow-pop font-mono text-[17px] font-bold text-ink tabular-nums">
        {formatTime(now)}
      </div>

      <div className="relative rounded-[24px] bg-white border-2 border-ink shadow-[8px_8px_0_0_#12172B] overflow-hidden">
        <div className={`flex items-center justify-between gap-3 px-5 py-3.5 border-b-2 border-ink ${col.solid} transition-colors duration-500`}>
          <div className="min-w-0">
            <p className="text-[14.5px] font-extrabold tracking-[-0.01em] truncate">How transformers actually work</p>
            <p className="font-mono text-[11px] opacity-75">sample report · 12:41</p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-ink text-[12px] font-bold px-2.5 py-1 border-2 border-ink">5 chapters</span>
        </div>

        <div className="px-5 pt-4 pb-1">
          <div className="relative h-[92px]" aria-hidden="true">
            {CLAIMS.map((c) => {
              const passed = now >= c.t
              return (
                <div key={c.t} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: pct(c.t) }}>
                  <span key={passed ? 'p' : 'n'} className={`w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${passed ? (c.ok ? 'bg-ok border-ink text-white animate-pop-in' : 'bg-coral border-ink text-ink animate-pop-in') : 'bg-white border-line2 text-faint'}`}>
                    {c.ok ? <Check size={12} strokeWidth={3.2} /> : <AlertTriangle size={11} strokeWidth={3} />}
                  </span>
                  <span className={`w-px h-3 ${passed ? 'bg-ink' : 'bg-line'}`} />
                </div>
              )
            })}
            <div className="absolute inset-x-0 top-[34px] flex gap-[3px] h-9">
              {CHAPTERS.map((c, i) => {
                const k = chapterColor(i)
                return (
                  <div key={c.t} style={{ width: pct(c.e - c.t) }} className={`rounded-lg flex items-center px-2 font-mono text-[11px] font-bold transition-colors duration-300 ${i === chapterIdx ? `${k.solid} ring-2 ring-ink` : i < chapterIdx ? k.soft : 'bg-sunk text-faint'}`}>
                    {i + 1}
                  </div>
                )
              })}
            </div>
            {FRAMES.map((f) => {
              const passed = now >= f.t
              return (
                <div key={f.t} className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center gap-0.5" style={{ left: pct(f.t) }}>
                  <ScanLine size={13} className={passed ? 'text-sky' : 'text-line2'} strokeWidth={2.6} />
                  <span className={`font-mono text-[9.5px] font-semibold ${passed ? 'text-ink' : 'text-line2'}`}>{f.label}</span>
                </div>
              )
            })}
            <div className="absolute top-[26px] h-[54px] w-[3px] bg-ink rounded-full -translate-x-1/2" style={{ left: pct(now) }}>
              <span className="absolute -top-[22px] left-1/2 -translate-x-1/2 rounded-md bg-ink text-white font-mono text-[10.5px] font-medium px-1.5 py-0.5 tabular-nums whitespace-nowrap">{formatTime(now)}</span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[15px] font-extrabold tracking-[-0.01em] text-ink mb-3 flex items-center gap-2">
            <span className={`font-mono text-[11.5px] font-bold rounded-md px-1.5 py-0.5 ${col.solid} transition-colors duration-500`}>{chapterIdx + 1}/5</span>
            {chapter.title}
          </p>
          <div className="space-y-1.5 min-h-[112px]">
            {shown.map((i) => {
              const l = LINES[i]
              const active = i === lineIdx
              return (
                <div key={i} className={`flex gap-3 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-35'}`}>
                  <span className="font-mono text-[11px] text-faint pt-[3px] w-9 shrink-0 tabular-nums">{formatTime(l.t)}</span>
                  <p className={`text-[14px] leading-[1.5] ${active ? 'text-ink font-semibold' : 'text-mute'}`}>
                    {active ? <Marked key={i} text={l.text} phrase={l.hl} animate /> : l.text}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t-2 border-dashed border-line2 space-y-2">
            {CLAIMS.map((c) => {
              const passed = now >= c.t
              return passed ? (
                <div key={c.t} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 animate-pop-in ${c.ok ? 'bg-mint-soft' : 'bg-coral-soft'}`}>
                  {c.ok ? <Check size={15} className="text-ok mt-0.5 shrink-0" strokeWidth={3} /> : <AlertTriangle size={15} className="text-warn mt-0.5 shrink-0" strokeWidth={2.6} />}
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink leading-snug">{c.text} <span className="font-mono text-[11px] font-medium text-mute ml-1">{formatTime(c.t)}</span></p>
                    <p className="text-[12.5px] text-mute leading-snug">{c.note}</p>
                  </div>
                </div>
              ) : (
                <div key={c.t} className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-line2 px-3 py-2.5">
                  <span className="w-[15px] h-[15px] rounded-full border-2 border-line2 shrink-0" />
                  <p className="text-[12.5px] text-faint">Claim waiting at {formatTime(c.t)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
