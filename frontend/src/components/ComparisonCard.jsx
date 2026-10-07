// Structured comparison from the backend. "Common/differences/conflicts"
// points are only ever shown when the server verified evidence from 2+ videos.
const SECTIONS = [
  ['common', 'In common', 'bg-mint-soft border-ok/40'],
  ['differences', 'Differences', 'bg-sky-soft border-blue/30'],
  ['conflicts', 'Conflicting claims', 'bg-warn-soft border-warn/40'],
  ['unique', 'Only in one video', 'bg-sunk border-line2'],
]

export default function ComparisonCard({ comparison, sourceHref }) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {SECTIONS.map(([key, title, tone]) =>
        comparison[key]?.length ? (
          <section key={key} className={`lift rounded-xl border-2 p-3.5 ${tone}`} aria-label={title}>
            <h3 className="text-[12.5px] font-extrabold uppercase tracking-wide text-ink mb-2">{title}</h3>
            <ul className="grid gap-2.5">
              {comparison[key].map((it, i) => (
                <li key={i} className="text-[13.5px] leading-relaxed text-ink-soft">
                  {it.point}
                  <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
                    {it.sources.map((s) => (
                      <a key={s.evidence_id} href={sourceHref(s)} target="_blank" rel="noreferrer"
                        className="font-mono text-[11px] font-bold rounded border-2 border-ink bg-mark px-1.5 py-0.5 text-ink no-underline">
                        {s.label} {Math.floor(s.start_seconds / 60)}:{String(Math.floor(s.start_seconds % 60)).padStart(2, '0')}
                      </a>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  )
}
