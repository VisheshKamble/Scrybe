import { exportReportUrl } from '../lib/api.js'

export default function ExportButton({ videoId, format }) {
  return (
    <a
      href={exportReportUrl(videoId, format)}
      download
      className="text-sm bg-surface border border-border rounded-md px-4 py-2 hover:border-trace transition-colors"
    >
      Export {format.toUpperCase()}
    </a>
  )
}
