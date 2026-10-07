// Local-only study progress: XP, best scores per video, daily streak.
// Nothing here leaves the browser.
const KEY = 'scrybe:study'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage unavailable */ } }

export function getProgress() {
  const d = read()
  return { xp: d.xp || 0, days: d.days || 0, best: d.best || {}, last: d.last || null }
}

export function awardXp(amount) {
  const d = read()
  d.xp = (d.xp || 0) + amount
  write(d)
  return d.xp
}

// Count consecutive study days; call once per finished session.
export function recordSession(videoId, scorePct) {
  const d = read()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  if (d.last !== today) d.days = d.last === yesterday ? (d.days || 0) + 1 : 1
  d.last = today
  d.best = { ...(d.best || {}), [videoId]: Math.max(scorePct, d.best?.[videoId] || 0) }
  write(d)
  return getProgress()
}

export function levelFor(xp) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1
  const floor = 50 * (level - 1) ** 2
  const next = 50 * level ** 2
  return { level, pct: Math.round(((xp - floor) / (next - floor)) * 100), toNext: next - xp }
}

export function verdict(pct) {
  if (pct >= 90) return { label: 'Mastered', tone: 'bg-mint' }
  if (pct >= 70) return { label: 'Solid', tone: 'bg-sky' }
  if (pct >= 50) return { label: 'Getting there', tone: 'bg-mark' }
  return { label: 'Needs review', tone: 'bg-pink' }
}
