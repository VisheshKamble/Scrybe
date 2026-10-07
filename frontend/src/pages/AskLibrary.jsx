import { Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { askMany, getQuizStats } from '../lib/api.js'
import { getLibraryVideos, labelFor } from '../lib/library.js'
import ComparisonCard from '../components/ComparisonCard.jsx'
import ConfidenceBadge from '../components/ConfidenceBadge.jsx'
import CopyButton from '../components/CopyButton.jsx'
import AgentTrace from '../components/AgentTrace.jsx'
import EvidenceList from '../components/EvidenceList.jsx'
import QuizCard from '../components/QuizCard.jsx'
import StudyPlanCard from '../components/StudyPlanCard.jsx'

const MODES = [
  { id: 'auto', label: 'Ask' }, { id: 'teach', label: 'Teach me' }, { id: 'quiz', label: 'Quiz' },
  { id: 'study_plan', label: 'Study plan' }, { id: 'compare', label: 'Compare' },
]
const DEFAULT_Q = { quiz: 'Give me five questions based on these videos', study_plan: 'I have three days to learn this', compare: 'How do these videos differ?', teach: 'Teach me the main ideas' }

// One page, three entry points (Ask / Quizzes / Study plans) via `preset`.
export default function AskLibrary({ preset }) {
  const [params] = useSearchParams()
  const library = useMemo(getLibraryVideos, [])
  const initial = (params.get('v') || '').split(',').filter(Boolean)
  const [selected, setSelected] = useState(initial.length ? initial : library.slice(0, 1).map((v) => v.videoId))
  const [mode, setMode] = useState(preset || params.get('mode') || 'auto')
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState(null)
  const [stats, setStats] = useState(null)
  const byId = Object.fromEntries(library.map((v) => [v.videoId, v]))

  useEffect(() => { if (selected[0] && mode === 'quiz') getQuizStats(selected[0]).then(setStats) }, [selected, mode, res])

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 5 ? [...s, id] : s))
  const sourceHref = (s) => {
    const yt = byId[s.video_id]?.youtubeId
    return yt ? `https://www.youtube.com/watch?v=${yt}&t=${Math.floor(s.start_seconds)}s` : '#'
  }

  async function submit(e) {
    e.preventDefault()
    const q = question.trim() || DEFAULT_Q[mode]
    if (!q || busy || selected.length === 0) return
    setBusy(true); setError(''); setRes(null)
    try {
      setRes(await askMany(selected, q, { mode }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (library.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p className="font-display text-xl font-extrabold">Add a video first</p>
        <p className="text-mute mt-1 mb-5">Ask, quizzes and study plans work on videos in your library.</p>
        <Link to="/app" className="font-extrabold underline">Analyze a video</Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight mb-1">
        {preset === 'quiz' ? 'Quizzes' : preset === 'study_plan' ? 'Study plans' : 'Ask across your videos'}
      </h1>
      <p className="text-mute text-[15px] mb-5">Answers use only what the videos say, and show where.</p>

      <fieldset className="mb-4">
        <legend className="text-[12.5px] font-extrabold uppercase tracking-wide text-mute mb-2">Videos ({selected.length}/5)</legend>
        <div className="flex flex-wrap gap-2">
          {library.map((v, i) => {
            const on = selected.includes(v.videoId)
            return (
              <button key={v.id} type="button" onClick={() => toggle(v.videoId)} aria-pressed={on}
                className={`min-h-[44px] max-w-[16rem] truncate rounded-full border-2 px-3.5 text-[13px] font-bold ${on ? 'border-ink bg-mark text-ink' : 'border-ink/25 bg-white text-ink-soft hover:border-ink'}`}>
                {on ? `V${selected.indexOf(v.videoId) + 1} · ` : ''}{labelFor(v) || `Video ${i + 1}`}
              </button>
            )
          })}
        </div>
      </fieldset>

      {!preset && (
        <div role="radiogroup" aria-label="What do you want?" className="mb-4 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)}
              className={`min-h-[44px] rounded-full border-2 px-4 text-[13px] font-extrabold ${mode === m.id ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-white hover:border-ink'}`}>
              {m.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="glass flex gap-2 rounded-2xl border-2 border-ink p-2">
        <label htmlFor="ask-q" className="sr-only">Your question</label>
        <input id="ask-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={1000}
          placeholder={DEFAULT_Q[mode] || 'What do these videos say about…?'}
          className="min-h-[48px] flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-faint" />
        <button type="submit" disabled={busy || selected.length === 0}
          className="shine inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-ink bg-mark px-5 text-[14px] font-extrabold disabled:opacity-50">
          <Send size={16} aria-hidden="true" /> {busy ? 'Thinking…' : 'Go'}
        </button>
      </form>

      <div aria-live="polite" className="mt-6">
        {error && <p role="alert" className="rounded-xl border-2 border-bad bg-bad-soft p-3 text-[14px] font-semibold text-bad">{error}</p>}
        {mode === 'quiz' && stats?.total > 0 && (
          <p className="mb-3 text-[13px] font-bold text-mute">Your record on this video: {stats.correct}/{stats.total} correct ({Math.round(stats.accuracy * 100)}%)</p>
        )}
        {res && (
          <article className="rounded-2xl border-2 border-ink/15 bg-white/80 p-4 sm:p-5">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{res.answer}</p>
            {res.comparison && <ComparisonCard comparison={res.comparison} sourceHref={sourceHref} />}
            {res.quiz && <QuizCard quiz={res.quiz} videoId={selected[0]} onSeek={undefined} />}
            {res.study_plan && <StudyPlanCard plan={res.study_plan} onSeek={undefined} />}
            <div className="flex items-center"><ConfidenceBadge confidence={res.confidence} /><CopyButton text={res.answer} /></div>
            <EvidenceList citations={res.citations} onSeek={undefined} />
            <AgentTrace trace={res.trace} />
            {res.cached && <p className="mt-2 text-[11.5px] font-semibold text-faint">Served instantly from cache.</p>}
          </article>
        )}
      </div>
    </div>
  )
}
