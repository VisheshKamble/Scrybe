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
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24))

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-colors duration-300 ${
          scrolled ? 'bg-lp-bg/80 backdrop-blur-md border-b border-lp-line' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 shrink-0">
            <span className="w-7 h-7 rounded-[9px] bg-lp-ink text-lp-bg text-xs font-bold flex items-center justify-center">
              S
            </span>
            <span className="font-semibold tracking-tight text-lp-ink">Scrybe</span>
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3.5 py-2 text-[13.5px] font-medium text-lp-muted hover:text-lp-ink rounded-full transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 bg-lp-ink text-white text-[13.5px] font-medium pl-4 pr-3.5 py-2 rounded-full hover:bg-lp-violet transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-violet"
            >
              Open App
              <span aria-hidden>→</span>
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
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden bg-lp-bg border-b border-lp-line overflow-hidden"
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
                className="mt-2 inline-flex items-center justify-center gap-1.5 bg-lp-ink text-white text-sm font-medium px-4 py-2.5 rounded-full"
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
