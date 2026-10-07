// Backend job states: queued, downloading, downloaded, processing, indexing,
// completed, retrying, rate_limited, failed. The UI only needs four.
export function toUiStatus(raw) {
  if (raw === 'completed' || raw === 'done') return 'done'
  if (raw === 'failed') return 'failed'
  if (raw === 'queued') return 'queued'
  return 'processing'
}

// Short, honest explanation for in-flight states that are not plain progress.
export function waitingNotice(job) {
  if (!job) return null
  if (job.status === 'rate_limited') return job.error_message || 'YouTube temporarily limited requests from our processing server. Your job will retry automatically.'
  if (job.status === 'retrying') return job.error_message || "We're retrying this automatically."
  return null
}
