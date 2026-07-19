import { useState } from 'react'
import { compareVideos } from '../lib/api.js'

export default function Compare() {
  const [urls, setUrls] = useState(['', ''])
  const [focus, setFocus] = useState('')
  const [status, setStatus] = useState(null)

  function updateUrl(i, value) {
    setUrls((prev) => prev.map((u, idx) => (idx === i ? value : u)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cleaned = urls.filter(Boolean)
    if (cleaned.length < 2) return
    const res = await compareVideos(cleaned, focus || undefined)
    setStatus(`Comparison started \u2014 job ${res.job_id}`)
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-medium">Compare videos</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        {urls.map((u, i) => (
          <input
            key={i}
            value={u}
            onChange={(e) => updateUrl(i, e.target.value)}
            placeholder={`YouTube URL ${i + 1}`}
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-signal"
          />
        ))}
        <button
          type="button"
          onClick={() => setUrls((prev) => [...prev, ''])}
          className="text-xs text-trace"
        >
          + add another video
        </button>
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Optional: what should the comparison focus on?"
          className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal"
        />
        <button type="submit" className="bg-signal text-ink text-sm font-medium px-4 py-2 rounded-md">
          Compare
        </button>
      </form>
      {status && <p className="text-secondary text-sm font-mono">{status}</p>}
    </div>
  )
}
