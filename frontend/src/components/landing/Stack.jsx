import Reveal, { Stagger, StaggerItem } from './Reveal.jsx'

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
    <section id="stack" className="relative py-24 md:py-32 border-t border-lp-line overflow-hidden">
      <div className="absolute top-[20%] right-[-6%] w-[380px] h-[380px] bg-lp-cyan/[0.05] blur-[130px] -z-10 animate-orb-drift" style={{ animationDelay: '-4s' }} />

      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="max-w-xl mb-14">
          <p className="font-mono text-[10px] tracking-[0.14em] text-lp-cyan mb-3">STACK</p>
          <h2 className="font-display text-3xl md:text-[2.75rem] font-semibold tracking-[-0.025em] text-lp-ink leading-[1.05] [text-wrap:balance]">
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
                className="shrink-0 mx-2 text-[13.5px] font-medium text-lp-ink border border-lp-line2 bg-lp-card rounded-full px-4 py-2 hover:border-lp-violet/40 hover:text-lp-violet2 hover:-translate-y-0.5 transition-all duration-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="max-w-6xl mx-auto px-6">
        <Stagger as="div" className="grid sm:grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-8" stagger={0.07} amount={0.2}>
          {GROUPS.map((g) => (
            <StaggerItem key={g.label}>
              <p className="font-mono text-[10px] tracking-[0.1em] text-lp-faint mb-2.5">
                {g.label.toUpperCase()}
              </p>
              <ul className="space-y-1.5">
                {g.items.map((it) => (
                  <li key={it} className="text-[14px] text-lp-ink/90 hover:text-lp-violet2 transition-colors duration-200 w-fit">
                    {it}
                  </li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
