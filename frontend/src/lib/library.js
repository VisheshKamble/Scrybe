import { getHistory } from './storage.js'

// Videos in this browser that finished processing and can be asked about.
export function getLibraryVideos() {
  return getHistory().filter((h) => h.type === 'video' && h.status === 'done' && h.videoId)
}

export function labelFor(v) {
  return v.title || (v.youtubeId ? `Video ${v.youtubeId}` : `Video ${v.videoId}`)
}
