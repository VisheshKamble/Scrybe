export default function VideoPlayer({ youtubeId, seekSeconds }) {
  if (!youtubeId) return null
  return (
    <div className="rounded-2xl border border-lp-line bg-lp-card p-2 shadow-card overflow-hidden">
      <iframe
        key={seekSeconds}
        className="w-full aspect-video rounded-xl"
        src={`https://www.youtube.com/embed/${youtubeId}?start=${Math.floor(seekSeconds || 0)}`}
        title="video"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    </div>
  )
}
