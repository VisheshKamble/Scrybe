import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useState } from 'react'
import ContextBar from './components/ContextBar.jsx'
import Landing from './pages/Landing.jsx'
import Chat from './pages/Chat.jsx'
import Compare from './pages/Compare.jsx'
import CompareResult from './pages/CompareResult.jsx'
import History from './pages/History.jsx'
import Report from './pages/Report.jsx'
import Upload from './pages/Upload.jsx'

const NAV_ITEMS = [
  { to: '/app', label: 'Upload' },
  { to: '/app/compare', label: 'Compare' },
  { to: '/app/history', label: 'History' },
]

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `relative shrink-0 px-3.5 py-2 text-[13.5px] font-medium rounded-full transition-colors duration-300 ${
          isActive ? 'text-lp-bg' : 'text-lp-muted hover:text-lp-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="app-nav-pill"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-lp-violet to-lp-cyan -z-10"
            />
          )}
          {children}
        </>
      )}
    </NavLink>
  )
}

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
}

// The functional workspace (upload, report, chat, compare) now shares the
// same considered, "Apple-level" visual language as the marketing site --
// same palette, type scale, motion, and rhythm -- so the product never
// feels like it's handing you off to a different piece of software.
function AppShell() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const { scrollY, scrollYProgress } = useScroll()

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 8))

  return (
    <div className="relative min-h-screen flex flex-col bg-lp-bg text-lp-ink overflow-x-hidden">
      {/* ambient stage, matched to the landing page's atmosphere */}
      <div className="fixed inset-0 -z-10 bg-grid opacity-[0.25] mask-fade-b" />
      <div className="fixed top-[-10%] right-[-10%] w-[45vw] h-[45vw] max-w-[640px] max-h-[640px] rounded-full bg-lp-violet/[0.1] blur-[130px] -z-10 animate-orb-drift" />
      <div className="fixed bottom-[-15%] left-[-10%] w-[35vw] h-[35vw] max-w-[520px] max-h-[520px] rounded-full bg-lp-cyan/[0.06] blur-[130px] -z-10 animate-orb-drift" style={{ animationDelay: '-8s' }} />

      <header
        className={`sticky top-0 z-40 transition-colors duration-300 ${
          scrolled ? 'bg-lp-bg/80 backdrop-blur-xl border-b border-lp-line' : 'bg-lp-bg/40 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <motion.span
              whileHover={{ rotate: -8, scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-lp-violet to-lp-cyan text-lp-bg text-xs font-bold flex items-center justify-center font-display"
            >
              S
            </motion.span>
            <span className="font-display font-semibold tracking-tight text-lp-ink">Scrybe</span>
          </Link>
          <nav className="flex items-center gap-1 bg-lp-card border border-lp-line rounded-full p-1 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map((n) => (
              <NavItem key={n.to} to={n.to}>
                {n.label}
              </NavItem>
            ))}
          </nav>
        </div>
        <motion.div
          className="h-px origin-left bg-gradient-to-r from-lp-violet via-lp-violet2 to-lp-cyan"
          style={{ scaleX: scrollYProgress }}
        />
      </header>

      <ContextBar />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...pageTransition}>
              <Routes location={location}>
                <Route path="/" element={<Upload />} />
                <Route path="report/:jobId" element={<Report />} />
                <Route path="chat/:videoId" element={<Chat />} />
                <Route path="compare" element={<Compare />} />
                <Route path="compare/:jobId" element={<CompareResult />} />
                <Route path="history" element={<History />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-lp-line">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="font-mono text-[11px] text-lp-faint">Scrybe &mdash; built on LangGraph &amp; Groq.</p>
          <Link to="/" className="group relative text-[12.5px] font-medium text-lp-muted hover:text-lp-ink transition-colors w-fit">
            Back to site
            <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-gradient-to-r from-lp-violet to-lp-cyan group-hover:w-full transition-all duration-300" />
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppShell />} />
    </Routes>
  )
}
