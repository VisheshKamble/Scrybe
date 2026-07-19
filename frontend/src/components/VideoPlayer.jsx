export default function VideoPlayer({ youtubeId, seekSeconds }) {
  if (!youtubeId) return null
  return (
    <iframe
      key={seekSeconds}
      className="w-full aspect-video rounded-md border border-border"
      src={`https://www.youtube.com/embed/${youtubeId}?start=${Math.floor(seekSeconds || 0)}`}
      title="video"
      allow="autoplay; encrypted-media"
      allowFullScreen
    />
  )
}
