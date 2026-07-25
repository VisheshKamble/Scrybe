export default function VideoPlayer({ youtubeId, seekSeconds, autoplayOnSeek = false }) {
  if (!youtubeId) return null
  // autoplay is only turned on once a timestamp has actually been clicked
  // (seekSeconds > 0) -- the initial render at seekSeconds=0 stays paused
  // so the player doesn't start playing itself the moment a report loads.
  const autoplay = autoplayOnSeek && seekSeconds > 0
  const src = `https://www.youtube.com/embed/${youtubeId}?start=${Math.floor(seekSeconds || 0)}${
    autoplay ? '&autoplay=1' : ''
  }`
  return (
    <div className="rounded-2xl border border-lp-line bg-lp-card p-2 shadow-card overflow-hidden">
      <iframe
        key={seekSeconds}
        className="w-full aspect-video rounded-xl"
        src={src}
        title="video"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    </div>
  )
}
