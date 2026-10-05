export default function VideoPlayer({ youtubeId, seekSeconds, autoplayOnSeek = false }) {
  if (!youtubeId) return null
  // autoplay only after a timestamp was actually clicked (seekSeconds > 0), so a
  // freshly loaded report never starts playing by itself.
  const autoplay = autoplayOnSeek && seekSeconds > 0
  const src = `https://www.youtube.com/embed/${youtubeId}?start=${Math.floor(seekSeconds || 0)}${autoplay ? '&autoplay=1' : ''}`
  return (
    <div className="rounded-[22px] bg-ink p-1.5 border-2 border-ink shadow-[6px_6px_0_0_#6A3DF0] overflow-hidden">
      <iframe
        key={seekSeconds}
        className="w-full aspect-video rounded-[15px] bg-ink"
        src={src}
        title="video"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    </div>
  )
}
