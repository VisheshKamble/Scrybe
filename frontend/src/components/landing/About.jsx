import Reveal from './Reveal.jsx'

const NOTES = [
  'Scope demos to short clips or your own uploads \u2014 YouTube\u2019s terms restrict automated downloading of arbitrary public videos at scale.',
  'The transcript and visual agents don\u2019t depend on each other. They run sequentially today for simplicity; fanning them out in parallel is a one-line change in the graph.',
  'Captions are used when YouTube provides them. When it doesn\u2019t, or rate-limits the request, the transcript agent falls back to Whisper automatically.',
]

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 border-t border-lp-line bg-lp-bg">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1fr_1fr] gap-16">
        <Reveal>
          <span className="inline-flex items-center gap-2 border border-lp-line bg-lp-card rounded-full pl-2.5 pr-3.5 py-1.5 text-[12.5px] font-medium text-lp-violet mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-lp-green" />
            Agentic video intelligence
          </span>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-[-0.025em] text-lp-ink leading-[1.05] [text-wrap:balance] mb-6">
            Built to watch a video the way a careful person would.
          </h2>
          <div className="space-y-4 text-[15.5px] text-lp-muted leading-relaxed max-w-md">
            <p>
              Most tools that "summarize video" just summarize the transcript. Scrybe treats the
              audio and the screen as two separate sources of truth, checks what's actually said
              against the open web, and keeps every claim traceable back to a timestamp.
            </p>
            <p>
              It's a small multi-agent system, not a single giant prompt — each agent has one
              job, and LangGraph wires them into a pipeline you can inspect, extend, or
              parallelize.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-lp-line bg-lp-card p-6 md:p-8">
            <p className="font-mono text-[10px] tracking-[0.14em] text-lp-faint mb-5">GOOD TO KNOW</p>
            <ul className="space-y-5">
              {NOTES.map((note) => (
                <li key={note} className="flex gap-3">
                  <span className="w-[3px] shrink-0 rounded-full bg-lp-violet mt-1" />
                  <p className="text-[14px] text-lp-ink/80 leading-relaxed">{note}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
