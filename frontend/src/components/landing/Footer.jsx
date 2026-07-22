import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Stagger, StaggerItem } from './Reveal.jsx'

const LINKS = [
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#features', label: 'Features' },
  { href: '#stack', label: 'Stack' },
  { href: '#about', label: 'About' },
]

export default function Footer() {
  return (
    <footer className="relative border-t border-lp-line bg-lp-bg overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[240px] bg-lp-violet/[0.04] blur-[100px] -z-10" />

      <Stagger className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8" amount={0.3}>
        <StaggerItem>
          <div className="flex items-center gap-2.5 mb-3">
            <motion.span
              whileHover={{ rotate: -8, scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-lp-violet to-lp-cyan text-lp-bg text-xs font-bold flex items-center justify-center font-display"
            >
              S
            </motion.span>
            <span className="font-display font-semibold tracking-tight text-lp-ink">Scrybe</span>
          </div>
          <p className="text-[13.5px] text-lp-muted max-w-xs leading-relaxed">
            Agentic video intelligence &mdash; transcript, visuals, chapters, fact-checks, and
            timestamp-grounded chat, in one pass.
          </p>
        </StaggerItem>

        <StaggerItem as="nav" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative text-[13.5px] text-lp-muted hover:text-lp-ink transition-colors w-fit"
            >
              {l.label}
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-gradient-to-r from-lp-violet to-lp-cyan group-hover:w-full transition-all duration-300" />
            </a>
          ))}
          <Link to="/app" className="group relative text-[13.5px] text-lp-muted hover:text-lp-ink transition-colors w-fit">
            Open App
            <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-gradient-to-r from-lp-violet to-lp-cyan group-hover:w-full transition-all duration-300" />
          </Link>
        </StaggerItem>
      </Stagger>

      <div className="max-w-6xl mx-auto px-6 pb-8">
        <p className="font-mono text-[11px] text-lp-faint">
          Scrybe &mdash; built on LangGraph &amp; Groq. &copy; {new Date().getFullYear()}.
        </p>
      </div>
    </footer>
  )
}
