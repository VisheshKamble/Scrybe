import { motion } from 'framer-motion'
import { ArrowRight, Flame, GraduationCap, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { askMany, getJobStatus, postQuizResult, submitVideo } from '../lib/api.js'
import { awardXp, getProgress, levelFor, recordSession, verdict } from '../lib/gamify.js'
import { saveJobMeta, upsertHistoryEntry } from '../lib/storage.js'
import { toUiStatus, waitingNotice } from '../lib/status.js'
import { formatTime } from '../lib/time.js'
import { extractYoutubeId, isValidYoutubeUrl, youtubeThumbnail } from '../lib/youtube.js'
import AgentTrace from '../components/AgentTrace.jsx'
import StudyPlanCard from '../components/StudyPlanCard.jsx'

const DIFFICULTY = ['easy', 'medium', 'hard']
const COUNTS = [5, 10]
const norm = (s) => String(s ?? '').trim().toLowerCase()

function Ring({ pct }) {
  const r = 52, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-label={`Score ${pct} percent`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(18,23,43,0.12)" strokeWidth="12" />
      <motion.circle cx="60" cy="60" r={r} fill="none" stroke="#2b3bee" strokeWidth="12" strokeLinecap="round" transform="rotate(-90 60 60)"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1, ease: 'easeOut' }} />
      <text x="60" y="68" textAnchor="middle" className="fill-ink font-display text-[28px] font-extrabold">{pct}%</text>
    </svg>
  )
}

export default function Study() {
  const [phase, setPhase] = useState('start') // start | processing | generating | quiz | result
  const [url, setUrl] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(5)
  const [error, setError] = useState('')
  const [job, setJob] = useState(null)
  const [videoId, setVideoId] = useState(null)
  const [quiz, setQuiz] = useState([])
  const [trace, setTrace] = useState([])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState([])
  const [streak, setStreak] = useState(0)
  const [sessionXp, setSessionXp] = useState(0)
  const [progress, setProgress] = useState(getProgress())
  const [plan, setPlan] = useState(null)
  const timer = useRef(null)
  const youtubeId = extractYoutubeId(url)
  const ytLink = (s) => `https://www.youtube.com/watch?v=${youtubeId}&t=${Math.floor(s)}s`
  const open = (s) => window.open(ytLink(s), '_blank', 'noopener')

  useEffect(() => () => clearInterval(timer.current), [])

  const generate = useCallback(async (vid, diff, n) => {
    setPhase('generating'); setError('')
    try {
      const res = await askMany([vid], `Give me ${n} ${diff} questions based on this video`, { mode: 'quiz' })
      if (!res.quiz?.length) throw new Error('The video didn’t contain enough material to build a grounded quiz. Try a longer or more informative video.')
      setQuiz(res.quiz); setTrace(res.trace || [])
      setI(0); setPicked(null); setRevealed(false); setAnswers([]); setStreak(0); setSessionXp(0); setPlan(null)
      setPhase('quiz')
    } catch (err) {
      setError(err.message); setPhase('start')
    }
  }, [])

  async function begin(e) {
    e.preventDefault()
    if (!isValidYoutubeUrl(url)) { setError('Paste a full youtube.com or youtu.be link to a study video.'); return }
    setError(''); setPhase('processing')
    try {
      const { job_id } = await submitVideo(url)
      saveJobMeta(job_id, { youtubeUrl: url, youtubeId })
      const poll = async () => {
        const data = await getJobStatus(job_id)
        setJob(data)
        const ui = toUiStatus(data.status)
        if (ui === 'done') {
          clearInterval(timer.current)
          setVideoId(data.video_id)
          upsertHistoryEntry({ id: job_id, type: 'video', jobId: job_id, videoId: data.video_id, youtubeId, youtubeUrl: url, status: 'done', createdAt: Date.now() })
          generate(data.video_id, difficulty, count)
        } else if (ui === 'failed') {
          clearInterval(timer.current)
          setError(data.error_message || 'We couldn’t process this video.'); setPhase('start')
        }
      }
      await poll()
      timer.current = setInterval(() => poll().catch(() => {}), 3000)
    } catch (err) {
      setError(err.message); setPhase('start')
    }
  }

  const q = quiz[i]
  const choices = q?.type === 'mcq' ? q.options : q?.type === 'true_false' ? ['True', 'False'] : null

  function grade(correct, given) {
    const streakNow = correct ? streak + 1 : 0
    const xp = correct ? 10 + Math.min(streak, 5) * 2 : 0
    setStreak(streakNow); setSessionXp((x) => x + xp)
    if (xp) awardXp(xp)
    setAnswers((a) => [...a, { q, correct, given }])
    postQuizResult({ video_id: q.source?.video_id || videoId, correct, difficulty: q.difficulty || difficulty, type: q.type || 'mcq' })
  }

  function choose(opt) {
    if (revealed) return
    setPicked(opt); setRevealed(true); grade(norm(opt) === norm(q.answer), opt)
  }

  function next() {
    if (i + 1 < quiz.length) { setI(i + 1); setPicked(null); setRevealed(false); return }
    const correct = answers.filter((a) => a.correct).length
    setProgress(recordSession(videoId, Math.round((correct / quiz.length) * 100)))
    setPhase('result')
  }

  // Keyboard: 1-4 choose, Enter / Right arrow continue.
  useEffect(() => {
    if (phase !== 'quiz') return undefined
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (!revealed && choices && /^[1-9]$/.test(e.key) && choices[+e.key - 1]) choose(choices[+e.key - 1])
      else if (revealed && (e.key === 'Enter' || e.key === 'ArrowRight') && (choices || answers.length > i)) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const correctCount = answers.filter((a) => a.correct).length
  const pct = quiz.length ? Math.round((correctCount / quiz.length) * 100) : 0
  const missed = answers.filter((a) => !a.correct)
  const shownXp = progress.xp + (phase === 'quiz' ? sessionXp : 0)
  const lvl = levelFor(shownXp)

  async function gapPlan() {
    setPlan('loading')
    try {
      const res = await askMany([videoId], `I have two days to learn this. Focus on: ${missed.map((m) => m.q.question).join('; ').slice(0, 600)}`, { mode: 'study_plan' })
      setPlan(res.study_plan || [])
    } catch (err) { setError(err.message); setPlan(null) }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-tight">
          Paste a lecture. <span className="gradient-text">Get tested.</span>
        </h1>
        <div className="flex items-center gap-2 text-[12.5px] font-extrabold" aria-label="Your progress">
          <span className="glass inline-flex items-center gap-1 rounded-full px-3 py-1.5"><Trophy size={14} aria-hidden="true" /> Lv {lvl.level} · {shownXp} XP</span>
          <span className="glass inline-flex items-center gap-1 rounded-full px-3 py-1.5"><Flame size={14} className="text-coral" aria-hidden="true" /> {progress.days}-day streak</span>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border-2 border-bad bg-bad-soft p-3 text-[14px] font-semibold text-bad">{error}</p>}

      {phase === 'start' && (
        <form onSubmit={begin} className="glass rounded-3xl border-2 border-ink p-5 shadow-pop">
          <p className="mb-4 text-[15px] text-ink-soft">Drop in any study video. Scrybe watches it, then writes questions only from what the video actually says, each with the exact moment to rewatch.</p>
          <label htmlFor="study-url" className="sr-only">YouTube link</label>
          <input id="study-url" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://youtube.com/watch?v=…"
            className="min-h-[52px] w-full rounded-xl border-2 border-ink bg-white px-4 text-[15px] outline-none focus:shadow-focus" />
          {youtubeId && <img src={youtubeThumbnail(youtubeId)} alt="" className="mt-3 aspect-video w-full max-w-xs rounded-xl border-2 border-ink object-cover" />}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <fieldset><legend className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-mute">Difficulty</legend>
              <div className="flex gap-2">{DIFFICULTY.map((d) => (
                <button key={d} type="button" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}
                  className={`min-h-[44px] flex-1 rounded-full border-2 text-[13px] font-extrabold capitalize ${difficulty === d ? 'border-ink bg-mark' : 'border-ink/25 bg-white hover:border-ink'}`}>{d}</button>))}
              </div></fieldset>
            <fieldset><legend className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-mute">Questions</legend>
              <div className="flex gap-2">{COUNTS.map((n) => (
                <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)}
                  className={`min-h-[44px] flex-1 rounded-full border-2 text-[13px] font-extrabold ${count === n ? 'border-ink bg-mark' : 'border-ink/25 bg-white hover:border-ink'}`}>{n}</button>))}
              </div></fieldset>
          </div>
          <button type="submit" className="shine mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-ink px-6 text-[15px] font-extrabold text-white">
            <GraduationCap size={18} aria-hidden="true" /> Test me <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      )}

      {(phase === 'processing' || phase === 'generating') && (
        <div className="glass rounded-3xl border-2 border-ink p-6 text-center" role="status" aria-live="polite">
          <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} className="mx-auto mb-3 w-fit"><Sparkles size={34} className="text-blue" aria-hidden="true" /></motion.div>
          <p className="font-display text-xl font-extrabold">{phase === 'generating' ? 'Writing your quiz from the video…' : 'Scrybe is studying the video…'}</p>
          <p className="mt-1 text-[14px] font-semibold text-mute">{phase === 'processing' ? `${job?.stage || 'Queued'}${typeof job?.progress === 'number' ? ` · ${job.progress}%` : ''}` : 'Every question is traced to a moment in the video.'}</p>
          {phase === 'processing' && <div className="mx-auto mt-4 h-3 max-w-sm overflow-hidden rounded-full border-2 border-ink bg-white"><motion.div className="h-full bg-mark" animate={{ width: `${job?.progress ?? 4}%` }} /></div>}
          {waitingNotice(job) && <p className="mx-auto mt-4 max-w-md rounded-xl border-2 border-ink bg-mark px-4 py-2.5 text-[13.5px] font-semibold">{waitingNotice(job)}</p>}
        </div>
      )}

      {phase === 'quiz' && q && (
        <section aria-label="Quiz">
          <div className="mb-3 flex items-center justify-between text-[13px] font-extrabold">
            <span>Question {i + 1} of {quiz.length}</span>
            <span className="inline-flex items-center gap-1"><Flame size={14} className={streak > 1 ? 'text-coral' : 'text-faint'} aria-hidden="true" /> {streak} streak · +{sessionXp} XP</span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full border-2 border-ink bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={quiz.length} aria-valuenow={i + (revealed ? 1 : 0)}>
            <motion.div className="h-full bg-mint" animate={{ width: `${((i + (revealed ? 1 : 0)) / quiz.length) * 100}%` }} />
          </div>
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl border-2 border-ink p-5 shadow-pop">
            <p className="mb-1 text-[11.5px] font-extrabold uppercase tracking-wide text-mute">{q.difficulty || difficulty} · {String(q.type || 'mcq').replace('_', ' ')}</p>
            <h2 className="mb-4 font-display text-[1.35rem] font-extrabold leading-snug">{q.question}</h2>
            {choices ? (
              <div className="grid gap-2" role="group" aria-label="Answers">
                {choices.map((opt, k) => {
                  const isAnswer = revealed && norm(opt) === norm(q.answer)
                  const wrong = revealed && picked === opt && !isAnswer
                  return (
                    <button key={opt} type="button" disabled={revealed} onClick={() => choose(opt)}
                      className={`lift flex min-h-[52px] items-center gap-3 rounded-xl border-2 px-4 text-left text-[14.5px] font-semibold ${isAnswer ? 'border-ink bg-mint' : wrong ? 'border-bad bg-bad-soft' : 'border-ink/25 bg-white'}`}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-white font-mono text-[11px] font-bold">{k + 1}</span>{opt}
                    </button>
                  )
                })}
              </div>
            ) : !revealed ? (
              <button type="button" onClick={() => setRevealed(true)} className="min-h-[48px] rounded-full border-2 border-ink bg-mark px-5 text-[14px] font-extrabold">Think, then reveal the answer</button>
            ) : null}
            {revealed && !choices && answers.length <= i && (
              <div className="mt-3"><p className="text-[14.5px]"><b>Answer:</b> {q.answer}</p>
                <div className="mt-2 flex gap-2"><button type="button" onClick={() => grade(true, null)} className="min-h-[44px] rounded-full border-2 border-ink bg-mint px-4 text-[13px] font-extrabold">I got it</button>
                  <button type="button" onClick={() => grade(false, null)} className="min-h-[44px] rounded-full border-2 border-ink bg-pink px-4 text-[13px] font-extrabold">I missed it</button></div></div>
            )}
            {revealed && answers.length > i && (
              <div className="mt-4 rounded-xl border-2 border-ink/15 bg-white p-3.5" role="status">
                <p className="text-[14px] font-extrabold">{answers[i].correct ? 'Correct!' : `Not quite. Answer: ${q.answer}`}</p>
                {q.explanation && <p className="mt-1 text-[13.5px] text-ink-soft">{q.explanation}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {youtubeId && q.source && <button type="button" onClick={() => open(q.source.start_seconds)} className="min-h-[44px] rounded-full border-2 border-ink bg-mark px-4 font-mono text-[12.5px] font-bold">▶ Rewatch {formatTime(q.source.start_seconds)}</button>}
                  <button type="button" onClick={next} className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-5 text-[13.5px] font-extrabold text-white">{i + 1 < quiz.length ? 'Next' : 'See results'} <ArrowRight size={14} aria-hidden="true" /></button>
                </div>
              </div>
            )}
          </motion.div>
          <p className="mt-3 text-center text-[12px] font-semibold text-faint">Tip: press 1–4 to answer, Enter for next.</p>
        </section>
      )}

      {phase === 'result' && (
        <section aria-label="Results" className="glass rounded-3xl border-2 border-ink p-6 shadow-pop">
          <div className="flex flex-wrap items-center gap-5">
            <Ring pct={pct} />
            <div>
              <span className={`inline-block rounded-full border-2 border-ink px-3 py-1 text-[12.5px] font-extrabold ${verdict(pct).tone}`}>{verdict(pct).label}</span>
              <p className="mt-2 font-display text-2xl font-extrabold">{correctCount} of {quiz.length} correct</p>
              <p className="text-[13.5px] font-semibold text-mute">+{sessionXp} XP · personal best on this video: {progress.best[videoId] ?? pct}%</p>
            </div>
          </div>
          {missed.length > 0 && (
            <div className="mt-5"><h3 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-mute">Review what you missed</h3>
              <ul className="grid gap-2">{missed.map((m, k) => (
                <li key={k} className="rounded-xl border-2 border-ink/15 bg-white p-3 text-[13.5px]"><b>{m.q.question}</b><br /><span className="text-ink-soft">Answer: {m.q.answer}</span>
                  {youtubeId && m.q.source && <button type="button" onClick={() => open(m.q.source.start_seconds)} className="ml-2 rounded border-2 border-ink bg-mark px-1.5 font-mono text-[11.5px] font-bold">▶ {formatTime(m.q.source.start_seconds)}</button>}</li>))}</ul></div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {missed.length > 0 && <button type="button" onClick={() => { setQuiz(missed.map((m) => m.q)); setI(0); setPicked(null); setRevealed(false); setAnswers([]); setStreak(0); setSessionXp(0); setPhase('quiz') }} className="inline-flex min-h-[46px] items-center gap-1.5 rounded-full border-2 border-ink bg-mark px-5 text-[13.5px] font-extrabold"><RotateCcw size={14} aria-hidden="true" /> Retry missed</button>}
            <button type="button" onClick={() => { const d = DIFFICULTY[Math.min(DIFFICULTY.indexOf(difficulty) + 1, 2)]; setDifficulty(d); generate(videoId, d, count) }} className="min-h-[46px] rounded-full border-2 border-ink bg-white px-5 text-[13.5px] font-extrabold hover:bg-mark">{difficulty === 'hard' ? 'New hard round' : 'Harder round'}</button>
            {missed.length > 0 && <button type="button" onClick={gapPlan} className="min-h-[46px] rounded-full border-2 border-ink bg-white px-5 text-[13.5px] font-extrabold hover:bg-mark">Study plan for my gaps</button>}
            <button type="button" onClick={() => { setPhase('start'); setUrl(''); setPlan(null) }} className="min-h-[46px] rounded-full border-2 border-ink bg-ink px-5 text-[13.5px] font-extrabold text-white">New video</button>
          </div>
          {plan === 'loading' && <p className="mt-4 text-[14px] font-semibold" role="status">Building a plan from the sections you struggled with…</p>}
          {Array.isArray(plan) && <StudyPlanCard plan={plan} onSeek={open} />}
          <AgentTrace trace={trace} />
          {pct >= 90 && <div aria-hidden="true" className="confetti">{Array.from({ length: 18 }, (_, k) => <span key={k} style={{ '--i': k }} />)}</div>}
        </section>
      )}
    </div>
  )
}
