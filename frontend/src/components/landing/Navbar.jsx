import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../ui.jsx'

const LINKS = [
  { href: '#reads', label: 'What it reads' },
  { href: '#use', label: 'Who it’s for' },
  { href: '#pipeline', label: 'How it runs' },
  { href: '#run', label: 'Run it' },
  { href: '#limits', label: 'Limits' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Over the blue hero the bar is white-on-colour; once you scroll it becomes a white pill.
  const onColour = !scrolled && !open

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-6 pt-3">
      <div className={`mx-auto max-w-6xl rounded-full border-2 transition-all duration-300 ${scrolled || open ? 'bg-white border-ink shadow-pop' : 'bg-transparent border-transparent'}`}>
        <div className="h-14 pl-4 pr-2 flex items-center justify-between gap-4">
          <Logo light={onColour} />
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Sections">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={`px-3.5 py-2 text-[14px] font-semibold rounded-full transition-colors ${onColour ? 'text-white/85 hover:text-white hover:bg-white/15' : 'text-mute hover:text-ink hover:bg-paper'}`}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link to="/app" className="group hidden sm:inline-flex items-center gap-1.5 rounded-full bg-mark text-ink text-[14px] font-bold pl-4 pr-3.5 py-2.5 border-2 border-ink hover:bg-white transition-colors duration-200">
              Open the app
              <ArrowRight size={14} strokeWidth={2.7} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <button type="button" onClick={() => setOpen((v) => !v)} className={`lg:hidden p-2.5 rounded-full ${onColour ? 'text-white hover:bg-white/15' : 'text-ink hover:bg-paper'}`} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="lg:hidden mx-auto max-w-6xl mt-2 rounded-3xl bg-white border-2 border-ink shadow-pop p-3">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block px-4 py-3 text-[15px] font-bold text-ink rounded-2xl hover:bg-paper">{l.label}</a>
            ))}
            <Link to="/app" className="mt-2 flex items-center justify-center gap-2 rounded-full bg-mark border-2 border-ink text-ink text-[15px] font-bold px-5 py-3">
              Open the app <ArrowRight size={15} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
