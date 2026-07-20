import { Link } from 'react-router-dom'

const LINKS = [
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#features', label: 'Features' },
  { href: '#stack', label: 'Stack' },
  { href: '#about', label: 'About' },
]

export default function Footer() {
  return (
    <footer className="border-t border-lp-line">
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-7 h-7 rounded-[9px] bg-lp-ink text-white text-xs font-bold flex items-center justify-center">
              S
            </span>
            <span className="font-semibold tracking-tight text-lp-ink">Scrybe</span>
          </div>
          <p className="text-[13.5px] text-lp-muted max-w-xs leading-relaxed">
            Agentic video intelligence &mdash; transcript, visuals, chapters, fact-checks, and
            timestamp-grounded chat, in one pass.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[13.5px] text-lp-muted hover:text-lp-ink transition-colors">
              {l.label}
            </a>
          ))}
          <Link to="/app" className="text-[13.5px] text-lp-muted hover:text-lp-ink transition-colors">
            Open App
          </Link>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <p className="font-mono text-[11px] text-lp-faint">
          Scrybe &mdash; built on LangGraph &amp; Groq. &copy; {new Date().getFullYear()}.
        </p>
      </div>
    </footer>
  )
}
