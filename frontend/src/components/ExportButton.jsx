import { Download, FileText, FileType } from 'lucide-react'
import { exportReportUrl } from '../lib/api.js'

const ICONS = {
  pdf: FileType,
  markdown: FileText,
}

export default function ExportButton({ videoId, format }) {
  const Icon = ICONS[format] ?? Download
  return (
    <a
      href={exportReportUrl(videoId, format)}
      download
      className="group inline-flex items-center gap-2 text-[13.5px] font-medium text-lp-ink bg-lp-card border border-lp-line rounded-full px-4 py-2.5 hover:border-lp-ink transition-colors duration-200"
    >
      <Icon size={14} className="text-lp-muted group-hover:text-lp-ink transition-colors" strokeWidth={2} />
      Export {format.toUpperCase()}
    </a>
  )
}
