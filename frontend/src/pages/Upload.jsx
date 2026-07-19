import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitVideo } from '../lib/api.js'

export default function Upload() {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { job_id } = await submitVideo(url)
      navigate(`/report/${job_id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-medium mb-2">Analyze a video</h1>
      <p className="text-secondary text-sm mb-6">
        Paste a YouTube link. Scrybe watches it, transcribes it, and reads what's on screen.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-signal"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-signal text-ink font-medium text-sm px-4 py-2 rounded-md disabled:opacity-50"
        >
          {submitting ? 'Starting\u2026' : 'Analyze'}
        </button>
      </form>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  )
}
