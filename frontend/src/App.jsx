import { NavLink, Route, Routes } from 'react-router-dom'
import Chat from './pages/Chat.jsx'
import Compare from './pages/Compare.jsx'
import Report from './pages/Report.jsx'
import Upload from './pages/Upload.jsx'

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 text-sm rounded-md transition-colors ${
          isActive ? 'bg-surface text-primary' : 'text-secondary hover:text-primary'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-signal" />
            <span className="font-mono text-sm tracking-wide">scrybe</span>
          </div>
          <nav className="flex gap-1">
            <NavItem to="/">Upload</NavItem>
            <NavItem to="/compare">Compare</NavItem>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Routes>
          <Route path="/" element={<Upload />} />
          <Route path="/report/:jobId" element={<Report />} />
          <Route path="/chat/:videoId" element={<Chat />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>
    </div>
  )
}
