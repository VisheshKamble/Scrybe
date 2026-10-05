// Every figure here comes from the project itself (README / config defaults).
const STATS = [
  { n: '5', unit: 'agents', body: 'Four run in order on every video. A fifth stays on call for your questions.', color: 'text-mark' },
  { n: '24', unit: 'keyframes', body: 'Sampled per video by default, at scene changes rather than on a timer. It’s a setting.', color: 'text-sky' },
  { n: '1', unit: 'code path', body: 'A five-minute clip and a fifty-hour lecture are split, read and stitched the same way.', color: 'text-mint' },
  { n: '2+', unit: 'videos', body: 'Compare as many as you like in one write-up of agreements and contradictions.', color: 'text-pink' },
]

export default function Stats() {
  return (
    <section className="relative overflow-hidden bg-violet py-20 md:py-24">
      <div className="absolute inset-0 bg-dots-light opacity-60" aria-hidden="true" />
      <div className="absolute -left-24 -bottom-32 w-96 h-96 rounded-full bg-blue animate-drift" aria-hidden="true" />
      <div className="absolute -right-20 -top-28 w-80 h-80 rounded-full bg-pink/80 animate-drift" style={{ animationDelay: '-5s' }} aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <h2 className="font-display font-extrabold text-[clamp(1.9rem,4vw,3rem)] leading-[1.04] tracking-[-0.04em] text-white max-w-xl [text-wrap:balance]">Small numbers, on purpose.</h2>
        <p className="mt-3 text-[16.5px] text-white/80 max-w-md">What’s actually in the build, nothing rounded up.</p>
        <dl className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.unit} className="rounded-[26px] bg-ink/90 border-2 border-white/20 p-6 backdrop-blur-sm">
              <dt className="flex items-baseline gap-2">
                <span className={`font-display font-extrabold text-[clamp(3.6rem,7vw,5.2rem)] leading-none tracking-[-0.06em] ${s.color}`}>{s.n}</span>
                <span className="text-[17px] font-extrabold text-white">{s.unit}</span>
              </dt>
              <dd className="mt-3 text-[14px] leading-[1.55] text-white/70">{s.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
