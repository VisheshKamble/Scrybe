import { useState } from 'react'
import { useParams } from 'react-router-dom'
import TimestampCitation from '../components/TimestampCitation.jsx'
import { askQuestion } from '../lib/api.js'

export default function Chat() {
  const { videoId } = useParams()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [asking, setAsking] = useState(false)

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
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-medium">Ask about this video</h1>
      <div className="space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block max-w-md rounded-md px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-signal text-ink' : 'bg-surface border border-border'
              }`}
            >
              {m.text}
              {m.timestamp != null && (
                <div className="mt-1">
                  <TimestampCitation seconds={m.timestamp} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What does the chart at 4:32 show?"
          className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal"
        />
        <button
          type="submit"
          disabled={asking}
          className="bg-signal text-ink text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  )
}
