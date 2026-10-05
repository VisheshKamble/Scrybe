import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowUp, MessageSquareText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageBanner } from '../components/ui.jsx'
import TimestampCitation from '../components/TimestampCitation.jsx'
import VideoPlayer from '../components/VideoPlayer.jsx'
import { askQuestion } from '../lib/api.js'
import { getChatMessages, getVideoMeta, saveChatMessages } from '../lib/storage.js'

const SUGGESTIONS = ['Summarize the key takeaways', 'What happens around the halfway point?', 'Any claims worth double-checking?']

function TypingBubble() {
  return (
    <div className="inline-flex items-center gap-1 bg-paper border-2 border-ink/10 rounded-2xl rounded-bl-md px-4 py-3.5" role="status" aria-label="Searching the video">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-faint animate-pulse-dot" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

export default function Chat() {
  const { videoId } = useParams()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState(() => getChatMessages(videoId))
  const [asking, setAsking] = useState(false)
  const [seekSeconds, setSeekSeconds] = useState(0)
  const scrollRef = useRef(null)
  const playerRef = useRef(null)

  const videoMeta = getVideoMeta(videoId)
  const youtubeId = videoMeta?.youtubeId
  const jobId = videoMeta?.jobId

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, asking])

  useEffect(() => {
    saveChatMessages(videoId, messages)
  }, [videoId, messages])

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim() || asking) return
    setAsking(true)
    const userMsg = { role: 'user', text: question }
    setMessages((prev) => [...prev, userMsg])
    setQuestion('')
    try {
      const res = await askQuestion(videoId, userMsg.text)
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer, timestamp: res.timestamp_seconds }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Couldn’t reach this video’s index just now. Ask again in a moment.' }])
    } finally {
      setAsking(false)
    }
  }

  function handleSeek(seconds) {
    setSeekSeconds(seconds)
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div>
      <PageBanner
        tone="pink"
        title="Ask about this video"
        sub="Answers come from the transcript and the on-screen visuals. Each one cites a time you can click."
        actions={jobId && (
          <Link to={`/app/report/${jobId}`} className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-ink px-4 py-2.5 text-[13.5px] font-extrabold text-ink hover:bg-mark transition-colors">
            <ArrowLeft size={14} strokeWidth={2.6} />Back to report
          </Link>
        )}
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-6 lg:gap-8 items-start">
        <div className="lg:sticky lg:top-24">
          {youtubeId ? (
            <div ref={playerRef}>
              <VideoPlayer youtubeId={youtubeId} seekSeconds={seekSeconds} autoplayOnSeek />
              <p className="mt-4 text-[13px] font-semibold text-mute px-1">Click a time in an answer and the video jumps there.</p>
            </div>
          ) : (
            <div className="rounded-[20px] border-2 border-dashed border-ink/30 bg-white/60 p-8 text-center text-[14px] text-mute">Open this chat from its report to see the video alongside it.</div>
          )}
        </div>

        <div className="min-w-0 flex flex-col rounded-[28px] bg-white border-2 border-ink shadow-[6px_6px_0_0_#FF4F8B] overflow-hidden">
          <div ref={scrollRef} className="p-4 md:p-5 min-h-[360px] max-h-[560px] overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className="min-h-[320px] flex flex-col items-center justify-center text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-pink border-2 border-ink -rotate-6 flex items-center justify-center mb-4">
                  <MessageSquareText size={22} className="text-ink" strokeWidth={2.4} />
                </div>
                <p className="text-[17px] font-extrabold tracking-[-0.02em] text-ink mb-1">Nothing asked yet</p>
                <p className="text-[14px] text-mute leading-relaxed mb-5 max-w-xs">Ask about a moment, a claim, or the big picture.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setQuestion(s)} className="text-[13px] font-bold text-ink border-2 border-ink bg-white rounded-full px-3.5 py-2 hover:bg-mark transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-[1.55] ${
                      m.role === 'user' ? 'bg-blue text-white rounded-br-md font-medium' : 'bg-paper border-2 border-ink/10 text-ink rounded-bl-md'
                    }`}
                  >
                    {m.text}
                    {m.timestamp != null && (
                      <div className="mt-2.5">
                        <TimestampCitation seconds={m.timestamp} onClick={youtubeId ? handleSeek : undefined} />
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

          <form onSubmit={handleAsk} className="border-t-2 border-ink p-3 bg-mark-soft">
            <div className="flex items-center gap-2 rounded-full bg-white border-2 border-ink pl-4 pr-1.5 py-1.5 focus-within:shadow-[3px_3px_0_0_#2B3BEE] transition-shadow duration-200">
              <label htmlFor="question" className="sr-only">Your question</label>
              <input
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What does the chart at 4:32 show?"
                disabled={asking}
                className="flex-1 min-w-0 bg-transparent py-2 text-[15px] text-ink placeholder:text-faint outline-none disabled:opacity-50"
              />
              <button type="submit" disabled={asking || !question.trim()} aria-label="Ask" className="w-10 h-10 rounded-full bg-blue text-white flex items-center justify-center hover:bg-ink transition-colors duration-200 disabled:opacity-40 disabled:hover:bg-ink disabled:cursor-not-allowed shrink-0">
                <ArrowUp size={18} strokeWidth={2.8} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
