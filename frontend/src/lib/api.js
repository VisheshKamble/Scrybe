const BASE_URL = '/api'

export async function submitVideo(youtubeUrl) {
  const res = await fetch(`${BASE_URL}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
  })
  if (!res.ok) throw new Error('Failed to submit video')
  return res.json()
}

export async function getJobStatus(jobId) {
  const res = await fetch(`${BASE_URL}/videos/${jobId}/status`)
  if (!res.ok) throw new Error('Failed to fetch job status')
  return res.json()
}

export async function getReport(videoId) {
  const res = await fetch(`${BASE_URL}/videos/${videoId}/report`)
  if (!res.ok) throw new Error('Failed to fetch report')
  return res.json()
}

export async function askQuestion(videoId, question) {
  const res = await fetch(`${BASE_URL}/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId, question }),
  })
  if (!res.ok) throw new Error('Failed to get answer')
  return res.json()
}

export async function compareVideos(youtubeUrls, focus) {
  const res = await fetch(`${BASE_URL}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_urls: youtubeUrls, focus }),
  })
  if (!res.ok) throw new Error('Failed to start comparison')
  return res.json()
}

export async function getCompareStatus(jobId) {
  const res = await fetch(`${BASE_URL}/compare/${jobId}/status`)
  if (!res.ok) throw new Error('Failed to fetch comparison status')
  return res.json()
}

export function exportReportUrl(videoId, format) {
  return `${BASE_URL}/export/${videoId}/${format}`
}
