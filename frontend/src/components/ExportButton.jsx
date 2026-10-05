import { Download, FileText, FileType, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { exportReportUrl } from '../lib/api.js'

const ICONS = { pdf: FileType, markdown: FileText }

export default function ExportButton({ videoId, format }) {
  const [state, setState] = useState('idle') // idle | loading | error
  const Icon = ICONS[format] ?? Download

  async function handleClick(e) {
    e.preventDefault()
    if (state === 'loading') return
    setState('loading')
    try {
      const res = await fetch(exportReportUrl(videoId, format))
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${videoId}-report.${format === 'markdown' ? 'md' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setState('idle')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2200)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`group inline-flex items-center gap-2 text-[13.5px] font-semibold rounded-full px-4 py-2.5 border transition-colors duration-200 disabled:cursor-wait ${
        state === 'error' ? 'bg-bad-soft border-bad/30 text-bad' : 'bg-white border-white text-ink hover:bg-mark hover:border-ink'
      }`}
    >
      {state === 'loading' ? <Loader2 size={14} className="animate-spin text-mute" strokeWidth={2.4} /> : <Icon size={14} className="text-mute group-hover:text-ink transition-colors" strokeWidth={2.4} />}
      {state === 'loading' ? 'Preparing' : state === 'error' ? 'Export failed, retry' : `Export ${format === 'markdown' ? 'Markdown' : 'PDF'}`}
    </button>
  )
}
