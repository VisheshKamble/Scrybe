// Everything Scrybe persists client-side. There's no auth layer in this
// app, so a backend-side history isn't on the table without a much bigger
// change -- but nothing here needs one. A submitted job's only durable
// identity a browser needs is "here's how to get back to it," and
// localStorage is enough for that.
//
// Two things live here:
//  - job metadata: jobId -> { youtubeUrl, youtubeId, videoId } captured at
//    submit time (before the backend has even resolved a videoId), so the
//    real YouTube ID -- which the backend never returns, since its
//    internal video_id is an opaque uuid -- survives long enough to embed
//    a player once the report is ready.
//  - history: a durable, reverse-chronological list of every analysis and
//    comparison run in this browser, each with enough state to render a
//    card and a working link back in.

const JOBS_KEY = 'scrybe:jobs'
const HISTORY_KEY = 'scrybe:history'
const CHAT_PREFIX = 'scrybe:chat:'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Storage disabled/full -- degrade silently, nothing here is critical
    // to core functionality (just to persistence-across-visits).
    return false
  }
}

// ---- job metadata ----------------------------------------------------

export function saveJobMeta(jobId, meta) {
  const all = readJSON(JOBS_KEY, {})
  all[jobId] = { ...all[jobId], ...meta, updatedAt: Date.now() }
  writeJSON(JOBS_KEY, all)
}

export function getJobMeta(jobId) {
  const all = readJSON(JOBS_KEY, {})
  return all[jobId] ?? null
}

// videoId is only known once a job finishes -- index it too so a page
// that only has a videoId (like Chat) can still find the youtubeId.
export function saveVideoMeta(videoId, meta) {
  const all = readJSON(JOBS_KEY, {})
  const key = `video:${videoId}`
  all[key] = { ...all[key], ...meta, updatedAt: Date.now() }
  writeJSON(JOBS_KEY, all)
}

export function getVideoMeta(videoId) {
  const all = readJSON(JOBS_KEY, {})
  return all[`video:${videoId}`] ?? null
}

// ---- history -----------------------------------------------------------

export function getHistory() {
  return readJSON(HISTORY_KEY, [])
}

export function upsertHistoryEntry(entry) {
  const all = getHistory()
  const idx = all.findIndex((e) => e.id === entry.id)
  const merged = { ...(idx >= 0 ? all[idx] : {}), ...entry, updatedAt: Date.now() }
  if (idx >= 0) {
    all[idx] = merged
  } else {
    all.unshift(merged)
  }
  writeJSON(HISTORY_KEY, all)
  return merged
}

export function removeHistoryEntry(id) {
  const all = getHistory().filter((e) => e.id !== id)
  writeJSON(HISTORY_KEY, all)
}

// ---- chat persistence ---------------------------------------------------

export function saveChatMessages(videoId, messages) {
  writeJSON(`${CHAT_PREFIX}${videoId}`, messages)
}

export function getChatMessages(videoId) {
  return readJSON(`${CHAT_PREFIX}${videoId}`, [])
}
