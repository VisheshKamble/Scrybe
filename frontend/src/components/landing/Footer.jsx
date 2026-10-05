import { Link } from 'react-router-dom'
import { Logo } from '../ui.jsx'

const LINKS = [
  { href: '#reads', label: 'What it reads' },
  { href: '#use', label: 'Who it’s for' },
  { href: '#pipeline', label: 'How it runs' },
  { href: '#run', label: 'Run it' },
  { href: '#limits', label: 'Limits' },
]

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        <div>
          <Logo light />
          <p className="mt-3 text-[14px] text-white/65 max-w-xs leading-relaxed">Reads a video for what was said, shown and true, and cites the second for each.</p>
        </div>
        <nav className="flex flex-wrap gap-x-7 gap-y-3" aria-label="Footer">
          {LINKS.map((l) => <a key={l.href} href={l.href} className="text-[14px] font-semibold text-white/70 hover:text-mark transition-colors">{l.label}</a>)}
          <Link to="/app" className="text-[14px] font-extrabold text-mark hover:text-white transition-colors">Open the app</Link>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 pb-8 flex items-center gap-3">
        <span className="flex gap-1.5" aria-hidden="true">{['bg-mark', 'bg-sky', 'bg-mint', 'bg-pink'].map((c) => <i key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />)}</span>
        <p className="font-mono text-[11.5px] text-white/45">Built on LangGraph and Groq · © {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}
