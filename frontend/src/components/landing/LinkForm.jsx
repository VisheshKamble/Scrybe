import { ArrowRight, Link2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractYoutubeId, youtubeThumbnail } from '../../lib/youtube.js'

const EXAMPLE = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'

/** Paste a link where you read the pitch; it prefills the workspace, never auto-runs. */
export default function LinkForm({ id = 'link', dark = false }) {
  const [url, setUrl] = useState('')
  const navigate = useNavigate()
  const youtubeId = extractYoutubeId(url)

  function submit(e) {
    e.preventDefault()
    const v = url.trim()
    navigate(v ? `/app?url=${encodeURIComponent(v)}` : '/app')
  }

  return (
    <div>
      <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-white border-2 border-ink pl-4 pr-1.5 py-1.5 shadow-pop transition-shadow duration-200 focus-within:shadow-[4px_4px_0_0_#FFDD4A]">
        <span className="shrink-0 w-9 h-7 flex items-center justify-center">
          {youtubeId ? <img src={youtubeThumbnail(youtubeId)} alt="" className="w-9 h-6 rounded-md object-cover" /> : <Link2 size={16} className="text-faint" strokeWidth={2.2} />}
        </span>
        <label htmlFor={id} className="sr-only">YouTube link</label>
        <input id={id} value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" placeholder="Paste a YouTube link" className="flex-1 min-w-0 bg-transparent py-2.5 text-[15px] text-ink placeholder:text-faint outline-none" />
        <button type="submit" className="group shrink-0 inline-flex items-center gap-1.5 rounded-full bg-blue text-white text-[14px] font-bold pl-5 pr-4 py-2.5 hover:bg-ink transition-colors duration-200">
          Analyze
          <ArrowRight size={15} strokeWidth={2.6} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </form>
      <button type="button" onClick={() => setUrl(EXAMPLE)} className={`mt-4 ml-4 text-[13.5px] font-semibold underline underline-offset-4 transition-colors ${dark ? 'text-white/85 decoration-white/40 hover:text-white hover:decoration-white' : 'text-mute decoration-line2 hover:text-ink hover:decoration-ink'}`}>
        No link handy? Use a 19-second example
      </button>
    </div>
  )
}
