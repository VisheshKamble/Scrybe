const BASE_URL = '/api'

// FastAPI's HTTPException responses carry the actual reason in a `detail`
// field (e.g. "That doesn't look like a YouTube video URL." from a 400, or
// "This video hasn't been indexed yet" from a 404) -- surfacing that
// instead of a generic "Failed to X" is the difference between an error
// message someone can act on and one that just tells them something broke.
// Falls back to the generic message if the body isn't JSON or has no
// `detail` (network failure, a non-FastAPI error, etc.).
async function throwWithDetail(res, fallbackMessage) {
  let detail
  try {
    detail = (await res.json())?.detail
  } catch {
    // response body wasn't JSON -- nothing more specific to report
  }
  throw new Error(typeof detail === 'string' && detail ? detail : fallbackMessage)
}

export async function submitVideo(youtubeUrl) {
  const res = await fetch(`${BASE_URL}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
  })
  if (!res.ok) await throwWithDetail(res, 'Failed to submit video')
  return res.json()
}

export async function getJobStatus(jobId) {
  const res = await fetch(`${BASE_URL}/videos/${jobId}/status`)
  if (!res.ok) await throwWithDetail(res, 'Failed to fetch job status')
  return res.json()
}

export async function getReport(videoId) {
  const res = await fetch(`${BASE_URL}/videos/${videoId}/report`)
  if (!res.ok) await throwWithDetail(res, 'Failed to fetch report')
  return res.json()
}

export async function askQuestion(videoId, question) {
  const res = await fetch(`${BASE_URL}/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId, question }),
  })
  if (!res.ok) await throwWithDetail(res, 'Failed to get answer')
  return res.json()
}

export async function compareVideos(youtubeUrls, focus) {
  const res = await fetch(`${BASE_URL}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_urls: youtubeUrls, focus }),
  })
  if (!res.ok) await throwWithDetail(res, 'Failed to start comparison')
  return res.json()
}

export async function getCompareStatus(jobId) {
  const res = await fetch(`${BASE_URL}/compare/${jobId}/status`)
  if (!res.ok) await throwWithDetail(res, 'Failed to fetch comparison status')
  return res.json()
}

export function exportReportUrl(videoId, format) {
  return `${BASE_URL}/export/${videoId}/${format}`
}
