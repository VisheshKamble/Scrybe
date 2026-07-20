import Reveal from './Reveal.jsx'

const GROUPS = [
  { label: 'Interface', items: ['React', 'Vite', 'Tailwind CSS', 'Framer Motion'] },
  { label: 'API & Queue', items: ['FastAPI', 'Celery', 'Redis', 'Server-Sent Events'] },
  { label: 'Agents', items: ['LangGraph', 'Groq'] },
  { label: 'Video & Retrieval', items: ['yt-dlp', 'PySceneDetect', 'FAISS', 'Sentence-Transformers'] },
  { label: 'Infra', items: ['Docker Compose', 'WeasyPrint'] },
]

const ALL_ITEMS = GROUPS.flatMap((g) => g.items)

export default function Stack() {
  return (
    <section id="stack" className="py-24 md:py-32 border-t border-lp-line overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="max-w-xl mb-14">
          <p className="font-mono text-[10px] tracking-[0.14em] text-lp-violet mb-3">STACK</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-[-0.025em] text-lp-ink leading-[1.05] [text-wrap:balance]">
            No proprietary magic. Just a well-wired stack.
          </h2>
        </Reveal>
      </div>

      <Reveal>
        <div className="relative mb-14">
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-lp-bg to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-lp-bg to-transparent z-10" />
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[...ALL_ITEMS, ...ALL_ITEMS].map((tech, i) => (
              <span
                key={`${tech}-${i}`}
                className="shrink-0 mx-2 text-[13.5px] font-medium text-lp-ink border border-lp-line bg-lp-card rounded-full px-4 py-2"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-8">
          {GROUPS.map((g, i) => (
            <Reveal key={g.label} delay={i * 0.06}>
              <p className="font-mono text-[10px] tracking-[0.1em] text-lp-faint mb-2.5">
                {g.label.toUpperCase()}
              </p>
              <ul className="space-y-1.5">
                {g.items.map((it) => (
                  <li key={it} className="text-[14px] text-lp-ink">
                    {it}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
