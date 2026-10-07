import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CalendarCheck, GitCompare, GraduationCap, Trophy, Library as LibraryIcon, Link2, Sparkles } from 'lucide-react'
import { NavLink, Route, Routes, useLocation, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ContextBar from './components/ContextBar.jsx'
import { Logo } from './components/ui.jsx'
import AskLibrary from './pages/AskLibrary.jsx'
import Chat from './pages/Chat.jsx'
import Compare from './pages/Compare.jsx'
import CompareResult from './pages/CompareResult.jsx'
import History from './pages/History.jsx'
import Landing from './pages/Landing.jsx'
import Library from './pages/Library.jsx'
import Report from './pages/Report.jsx'
import Study from './pages/Study.jsx'
import Upload from './pages/Upload.jsx'

const NAV_ITEMS = [
  { to: '/app/study', label: 'Study', icon: Trophy },
  { to: '/app', label: 'Add', icon: Link2 },
  { to: '/app/library', label: 'Library', icon: LibraryIcon },
  { to: '/app/ask', label: 'Ask', icon: Sparkles },
  { to: '/app/plans', label: 'Plans', icon: CalendarCheck },
  { to: '/app/compare', label: 'Compare', icon: GitCompare },
]

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `relative shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-semibold rounded-full transition-colors duration-200 ${
          isActive ? 'text-ink' : 'text-white/75 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="app-nav-pill"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-full bg-mark -z-10"
            />
          )}
          <Icon size={14} strokeWidth={2.4} className="hidden sm:block" />
          {label}
        </>
      )}
    </NavLink>
  )
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
}

// The workspace shares the landing page's paper, ink and ultramarine, so
// moving from the site into the app doesn't feel like changing products.
function AppShell() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col bg-paper text-ink overflow-x-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-mark focus:px-4 focus:py-2 focus:font-extrabold focus:text-ink">Skip to content</a>
      <div className="fixed inset-x-0 top-0 h-[520px] -z-10 bg-dots mask-fade-b pointer-events-none" />

      <header className={`sticky top-0 z-40 bg-ink border-b-4 border-mark transition-shadow duration-200 ${scrolled ? 'shadow-float' : ''}`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo light />
          <nav
            aria-label="Workspace"
            className="flex items-center gap-0.5 bg-white/10 border border-white/20 rounded-full p-1 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {NAV_ITEMS.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
          </nav>
          <Link to="/" className="hidden md:inline-flex items-center gap-1 text-[13.5px] font-semibold text-white/75 hover:text-white transition-colors">
            Site <ArrowUpRight size={14} strokeWidth={2.4} />
          </Link>
        </div>
      </header>

      <ContextBar />

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 md:py-14">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...pageTransition}>
              <Routes location={location}>
                <Route path="/" element={<Upload />} />
                <Route path="report/:jobId" element={<Report />} />
                <Route path="chat/:videoId" element={<Chat />} />
                <Route path="compare" element={<Compare />} />
                <Route path="compare/:jobId" element={<CompareResult />} />
                <Route path="history" element={<History />} />
                <Route path="library" element={<Library />} />
                <Route path="study" element={<Study />} />
                <Route path="ask" element={<AskLibrary />} />
                <Route path="quizzes" element={<AskLibrary preset="quiz" />} />
                <Route path="plans" element={<AskLibrary preset="study_plan" />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t-2 border-ink/10">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-5 flex items-center justify-between">
          <p className="font-mono text-[11.5px] text-faint">Scrybe · built on LangGraph and Groq</p>
          <Link to="/" className="text-[13px] font-semibold text-mute hover:text-ink transition-colors">
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
