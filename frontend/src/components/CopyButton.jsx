import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export default function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1600)
    } catch { /* clipboard unavailable: fail silently */ }
  }
  return (
    <button type="button" onClick={copy} aria-label={done ? 'Copied' : 'Copy answer'}
      className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-bold text-mute hover:bg-sunk hover:text-ink">
      {done ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      <span aria-live="polite">{done ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
