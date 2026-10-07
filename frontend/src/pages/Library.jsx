import { CheckSquare, Library as LibraryIcon, MessageSquare, Plus, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getLibraryVideos, labelFor } from '../lib/library.js'
import { youtubeThumbnail } from '../lib/youtube.js'
import { btn } from '../components/ui.jsx'

export default function Library() {
  const videos = useMemo(getLibraryVideos, [])
  const [picked, setPicked] = useState([])
  const navigate = useNavigate()
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p))
  const go = (mode) => navigate(`/app/ask?v=${picked.join(',')}${mode ? `&mode=${mode}` : ''}`)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight">Your library</h1>
          <p className="text-mute text-[15px]">Pick one video to chat, or up to five to ask across them.</p>
        </div>
        <Link to="/app/history" className="min-h-[44px] inline-flex items-center text-[13.5px] font-bold text-mute underline hover:text-ink">All activity</Link>
        <Link to="/app" className={`${btn.primary} shine`}><Plus size={16} aria-hidden="true" /> Add a video</Link>
      </div>

      {videos.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <LibraryIcon className="mx-auto mb-3 text-blue" size={32} aria-hidden="true" />
          <p className="font-display text-xl font-extrabold">Nothing here yet</p>
          <p className="text-mute mt-1 mb-5">Add a video and it appears here once it&rsquo;s ready to question.</p>
          <Link to="/app" className={btn.primary}>Paste your first video</Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {videos.map((v) => {
            const on = picked.includes(v.videoId)
            return (
              <li key={v.id} className={`lift overflow-hidden rounded-2xl border-2 bg-white ${on ? 'border-blue' : 'border-ink/15'}`}>
                {v.youtubeId && <img src={youtubeThumbnail(v.youtubeId)} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
                <div className="p-3.5">
                  <p className="line-clamp-2 min-h-[2.6em] text-[14.5px] font-bold text-ink">{labelFor(v)}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => toggle(v.videoId)} aria-pressed={on}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-bold text-ink">
                      {on ? <CheckSquare size={18} className="text-blue" aria-hidden="true" /> : <Square size={18} aria-hidden="true" />}
                      {on ? 'Selected' : 'Select'}
                    </button>
                    <Link to={`/app/chat/${v.videoId}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-ink px-3.5 text-[13px] font-extrabold hover:bg-mark">
                      <MessageSquare size={14} aria-hidden="true" /> Chat
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {picked.length > 0 && (
        <div role="region" aria-label="Actions for selected videos"
          className="glass fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-ink p-3 shadow-pop pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span className="text-[13.5px] font-extrabold">{picked.length} selected</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => go('')} className="min-h-[44px] rounded-full border-2 border-ink bg-white px-4 text-[13px] font-extrabold hover:bg-mark">Ask</button>
            {picked.length > 1 && <button type="button" onClick={() => go('compare')} className="min-h-[44px] rounded-full border-2 border-ink bg-mark px-4 text-[13px] font-extrabold">Compare</button>}
            <button type="button" onClick={() => go('quiz')} className="min-h-[44px] rounded-full border-2 border-ink bg-white px-4 text-[13px] font-extrabold hover:bg-mark">Quiz</button>
          </div>
        </div>
      )}
    </div>
  )
}
