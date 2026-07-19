export default function ChapterList({ chapters = [], claims = [] }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm text-secondary mb-2 font-mono">chapters</h3>
        <ol className="space-y-3">
          {chapters.map((c, i) => (
            <li key={i} className="bg-surface border border-border rounded-md p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm">{c.title}</span>
                <span className="font-mono text-xs text-trace">
                  {Math.round(c.start_seconds)}s\u2013{Math.round(c.end_seconds)}s
                </span>
              </div>
              <p className="text-secondary text-xs mt-1">{c.summary}</p>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="text-sm text-secondary mb-2 font-mono">claims</h3>
        <ul className="space-y-3">
          {claims.map((c, i) => (
            <li key={i} className="bg-surface border border-border rounded-md p-3">
              <p className="text-sm">{c.text}</p>
              <span className={`font-mono text-xs ${c.verified ? 'text-trace' : 'text-signal'}`}>
                {c.verified ? 'verified' : 'unverified'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
