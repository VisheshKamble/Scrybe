// Client-side YouTube URL parsing. Deliberately permissive about the URL
// shape (watch, youtu.be, shorts, embed, with or without extra query
// params) and only strict about the one thing that matters: is there an
// 11-character video ID in here we can extract and validate against
// before ever hitting the network.

const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

const HOST_MATCHERS = [
  { re: /(?:youtube\.com|music\.youtube\.com)\/watch\?.*[?&]v=([a-zA-Z0-9_-]{11})/, group: 1 },
  { re: /youtu\.be\/([a-zA-Z0-9_-]{11})/, group: 1 },
  { re: /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/, group: 1 },
  { re: /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, group: 1 },
  { re: /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/, group: 1 },
]

/**
 * Extracts the 11-character YouTube video ID from a URL, or returns null
 * if the string isn't a recognizable YouTube video URL.
 */
export function extractYoutubeId(input) {
  if (!input) return null
  const trimmed = input.trim()

  for (const { re, group } of HOST_MATCHERS) {
    const match = trimmed.match(re)
    if (match && ID_PATTERN.test(match[group])) return match[group]
  }

  // Someone pasted just the bare ID.
  if (ID_PATTERN.test(trimmed)) return trimmed

  return null
}

export function isValidYoutubeUrl(input) {
  return extractYoutubeId(input) !== null
}

export function youtubeThumbnail(youtubeId) {
  return `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`
}
