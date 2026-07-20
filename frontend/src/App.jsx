import { AnimatePresence, motion } from 'framer-motion'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Chat from './pages/Chat.jsx'
import Compare from './pages/Compare.jsx'
import Report from './pages/Report.jsx'
import Upload from './pages/Upload.jsx'

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3.5 py-2 text-[13.5px] font-medium rounded-full transition-colors ${
          isActive ? 'bg-lp-ink text-white' : 'text-lp-muted hover:text-lp-ink'
        }`
      }
    >
      {children}
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

  return (
    <div className="min-h-screen flex flex-col bg-lp-bg text-lp-ink [background-image:radial-gradient(circle_at_top_right,rgba(139,92,246,0.06),transparent_45%)]">
      <header className="sticky top-0 z-40 bg-lp-bg/80 backdrop-blur-md border-b border-lp-line">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="w-7 h-7 rounded-[9px] bg-lp-ink text-lp-bg text-xs font-bold flex items-center justify-center transition-colors group-hover:bg-lp-violet">
              S
            </span>
            <span className="font-semibold tracking-tight text-lp-ink">Scrybe</span>
          </Link>
          <nav className="flex items-center gap-1 bg-lp-card border border-lp-line rounded-full p-1">
            <NavItem to="/app">Upload</NavItem>
            <NavItem to="/app/compare">Compare</NavItem>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...pageTransition}>
              <Routes location={location}>
                <Route path="/" element={<Upload />} />
                <Route path="report/:jobId" element={<Report />} />
                <Route path="chat/:videoId" element={<Chat />} />
                <Route path="compare" element={<Compare />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-lp-line">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="font-mono text-[11px] text-lp-faint">Scrybe &mdash; built on LangGraph &amp; Groq.</p>
          <Link to="/" className="text-[12.5px] font-medium text-lp-muted hover:text-lp-ink transition-colors">
            Back to site
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
