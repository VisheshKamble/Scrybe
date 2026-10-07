import { useState } from 'react'
import { postQuizResult } from '../lib/api.js'
import TimestampCitation from './TimestampCitation.jsx'

// One question at a time. MCQ / true-false are graded locally against the
// server-supplied answer; short-answer and interview questions are self-graded
// after revealing the reference answer. Only counters are sent (no text).
function Question({ q, index, videoId, onSeek, onDone }) {
  const [picked, setPicked] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [graded, setGraded] = useState(null)
  const choices = q.type === 'mcq' ? q.options : q.type === 'true_false' ? ['True', 'False'] : null

  function finish(correct) {
    setGraded(correct)
    postQuizResult({ video_id: q.source?.video_id || videoId, correct, difficulty: q.difficulty || 'medium', type: q.type || 'mcq' })
    onDone(correct)
  }

  function choose(opt) {
    if (graded !== null) return
    setPicked(opt)
    setRevealed(true)
    finish(opt.trim().toLowerCase() === String(q.answer).trim().toLowerCase())
  }

  return (
    <div className="lift rounded-xl border-2 border-ink/15 bg-white p-3.5">
      <p className="text-[14.5px] font-bold text-ink mb-2">{index + 1}. {q.question}</p>
      {choices && (
        <div className="grid gap-1.5">
          {choices.map((opt) => {
            const isAnswer = revealed && opt.trim().toLowerCase() === String(q.answer).trim().toLowerCase()
            const isWrongPick = revealed && picked === opt && !isAnswer
            return (
              <button key={opt} type="button" disabled={revealed} onClick={() => choose(opt)}
                className={`text-left text-[13.5px] rounded-lg border-2 px-3 py-2 transition-colors ${isAnswer ? 'border-ink bg-mark font-bold' : isWrongPick ? 'border-pink bg-pink/10' : 'border-ink/20 hover:bg-mark-soft'}`}>
                {opt}
              </button>
            )
          })}
        </div>
      )}
      {!choices && !revealed && (
        <button type="button" onClick={() => setRevealed(true)} className="text-[13px] font-extrabold text-ink border-2 border-ink rounded-full px-3.5 py-1.5 hover:bg-mark">Show answer</button>
      )}
      {!choices && revealed && graded === null && (
        <div className="mt-2">
          <p className="text-[13.5px] text-ink-soft mb-2"><b>Answer:</b> {q.answer}</p>
          <span className="text-[12.5px] font-semibold text-mute mr-2">How did you do?</span>
          <button type="button" onClick={() => finish(true)} className="text-[12.5px] font-bold border-2 border-ink rounded-full px-3 py-1 mr-1.5 hover:bg-mark">Got it</button>
          <button type="button" onClick={() => finish(false)} className="text-[12.5px] font-bold border-2 border-ink rounded-full px-3 py-1 hover:bg-mark">Missed it</button>
        </div>
      )}
      {revealed && (choices || graded !== null) && (
        <div className="mt-2 text-[13px] text-ink-soft leading-relaxed" role="status">
          {q.explanation && <p className="mb-1.5">{q.explanation}</p>}
          <TimestampCitation seconds={q.source?.start_seconds} onClick={onSeek} />
        </div>
      )}
    </div>
  )
}

export default function QuizCard({ quiz, videoId, onSeek }) {
  const [score, setScore] = useState({ answered: 0, correct: 0 })
  return (
    <div className="mt-3 grid gap-2.5">
      {quiz.map((q, i) => (
        <Question key={i} q={q} index={i} videoId={videoId} onSeek={onSeek}
          onDone={(ok) => setScore((s) => ({ answered: s.answered + 1, correct: s.correct + (ok ? 1 : 0) }))} />
      ))}
      {score.answered > 0 && (
        <p className="text-[13px] font-extrabold text-ink" role="status">Score: {score.correct} / {score.answered} answered</p>
      )}
    </div>
  )
}
