import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const LINKS = [
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#features', label: 'Features' },
  { href: '#stack', label: 'Stack' },
  { href: '#about', label: 'About' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY, scrollYProgress } = useScroll()

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24))

  return (
    <header className="fixed inset-x-0 top-0 z-[60]">
      <div
        className={`relative transition-all duration-300 ${
          scrolled
            ? 'bg-lp-bg/70 backdrop-blur-xl border-b border-lp-line'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 shrink-0 group">
            <span className="relative w-7 h-7 rounded-[9px] bg-gradient-to-br from-lp-violet to-lp-cyan text-lp-bg text-xs font-bold flex items-center justify-center font-display shadow-violet-glow">
              S
            </span>
            <span className="font-display font-semibold tracking-tight text-lp-ink">Scrybe</span>
          </a>

          <nav className="hidden md:flex items-center gap-1 rounded-full border border-lp-line bg-white/[0.02] backdrop-blur-sm p-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative px-3.5 py-2 text-[13px] font-medium text-lp-muted hover:text-lp-ink rounded-full transition-colors overflow-hidden"
              >
                <span className="relative z-10">{l.label}</span>
                <span className="absolute inset-x-2 bottom-1.5 h-px bg-gradient-to-r from-lp-violet to-lp-cyan scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              </a>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link
              to="/app"
              className="group relative inline-flex items-center gap-1.5 overflow-hidden bg-lp-ink text-lp-bg text-[13.5px] font-semibold pl-4 pr-3.5 py-2 rounded-full transition-shadow duration-300 hover:shadow-violet-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-lp-violet to-lp-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">Open App</span>
              <span className="relative transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 -mr-2 text-lp-ink"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* page-wide scroll progress — a continuous thread of motion tying
            the whole scroll experience together, not just the hero */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px origin-left bg-gradient-to-r from-lp-violet via-lp-violet2 to-lp-cyan"
          style={{ scaleX: scrollYProgress }}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden bg-lp-bg/95 backdrop-blur-xl border-b border-lp-line overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-2.5 text-sm font-medium text-lp-ink"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/app"
                className="mt-2 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-lp-violet to-lp-cyan text-lp-bg text-sm font-semibold px-4 py-2.5 rounded-full"
              >
                Open App →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
