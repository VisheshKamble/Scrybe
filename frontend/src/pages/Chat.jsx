import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquareText, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import TimestampCitation from '../components/TimestampCitation.jsx'
import { askQuestion } from '../lib/api.js'

const SUGGESTIONS = ['Summarize the key takeaways', 'What happens around the halfway point?', 'Any claims worth double-checking?']

function TypingBubble() {
  return (
    <div className="inline-flex items-center gap-1 bg-lp-card border border-lp-line rounded-2xl rounded-bl-sm px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-lp-faint animate-pulse-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export default function Chat() {
  const { videoId } = useParams()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [asking, setAsking] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, asking])

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim()) return
    setAsking(true)
    const userMsg = { role: 'user', text: question }
    setMessages((prev) => [...prev, userMsg])
    setQuestion('')
    try {
      const res = await askQuestion(videoId, userMsg.text)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.answer, timestamp: res.timestamp_seconds },
      ])
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-[3px] h-3.5 rounded-full bg-lp-violet" />
          <h1 className="text-xl font-semibold tracking-tight text-lp-ink">Ask about this video</h1>
        </div>
        <p className="font-mono text-[11.5px] text-lp-faint">Grounded in the transcript &amp; visuals via FAISS &mdash; every answer cites a timestamp.</p>
      </div>

      <div
        ref={scrollRef}
        className="rounded-2xl border border-lp-line bg-lp-bg/60 p-4 md:p-5 min-h-[320px] max-h-[520px] overflow-y-auto space-y-3 mb-4"
      >
        {messages.length === 0 && (
          <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-6">
            <div className="w-11 h-11 rounded-2xl bg-lp-violetsoft flex items-center justify-center mb-4">
              <MessageSquareText size={18} className="text-lp-violet" strokeWidth={2} />
            </div>
            <p className="text-[14px] font-medium text-lp-ink mb-1">Nothing asked yet</p>
            <p className="text-[13px] text-lp-muted leading-relaxed mb-5 max-w-xs">
              Ask anything about the video &mdash; specific moments, claims, or the big picture.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuestion(s)}
                  className="text-[12px] font-medium text-lp-muted border border-lp-line bg-lp-card rounded-full px-3 py-1.5 hover:border-lp-violet/40 hover:text-lp-ink transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-lp-ink text-white rounded-br-sm'
                    : 'bg-lp-card border border-lp-line text-lp-ink rounded-bl-sm'
                }`}
              >
                {m.text}
                {m.timestamp != null && (
                  <div className="mt-2">
                    <TimestampCitation seconds={m.timestamp} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {asking && (
          <div className="flex justify-start">
            <TypingBubble />
          </div>
        )}
      </div>

      <form
        onSubmit={handleAsk}
        className="flex items-center gap-2 rounded-2xl border border-lp-line bg-lp-card p-1.5 shadow-card focus-within:border-lp-violet/50 focus-within:shadow-violet-glow transition-all duration-300"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What does the chart at 4:32 show?"
          className="flex-1 bg-transparent px-3 py-2.5 text-[14px] text-lp-ink placeholder:text-lp-faint outline-none"
        />
        <button
          type="submit"
          disabled={asking}
          className="inline-flex items-center justify-center gap-1.5 bg-lp-ink text-white text-[13.5px] font-medium px-4 py-2.5 rounded-xl hover:bg-lp-violet transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Send size={14} />
          Ask
        </button>
      </form>
    </div>
  )
}
