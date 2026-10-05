// Chapter colours cycle through the palette, so a chapter has the same colour
// on the timeline, in the list and in the landing demo. Class strings are kept
// whole so Tailwind can see them.
export const CHAPTER_COLORS = [
  { solid: 'bg-blue text-white', soft: 'bg-blue-soft text-blue', border: 'border-blue', tint: 'bg-blue-mist', dot: 'bg-blue' },
  { solid: 'bg-pink text-ink', soft: 'bg-pink-soft text-ink', border: 'border-pink', tint: 'bg-pink-soft/60', dot: 'bg-pink' },
  { solid: 'bg-mint text-ink', soft: 'bg-mint-soft text-ink', border: 'border-mint', tint: 'bg-mint-soft/60', dot: 'bg-mint' },
  { solid: 'bg-violet text-white', soft: 'bg-violet-soft text-violet', border: 'border-violet', tint: 'bg-violet-soft/60', dot: 'bg-violet' },
  { solid: 'bg-coral text-ink', soft: 'bg-coral-soft text-ink', border: 'border-coral', tint: 'bg-coral-soft/60', dot: 'bg-coral' },
  { solid: 'bg-sky text-ink', soft: 'bg-sky-soft text-ink', border: 'border-sky', tint: 'bg-sky-soft/60', dot: 'bg-sky' },
]
export const chapterColor = (i) => CHAPTER_COLORS[i % CHAPTER_COLORS.length]
