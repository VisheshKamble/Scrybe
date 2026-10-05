import { SectionHead } from '../ui.jsx'

// Pulled from the project's own README and notes: said plainly, not buried.
const LIMITS = [
  { title: 'Keep demos to short clips or your own uploads', body: 'YouTube’s terms restrict automated downloading of arbitrary public videos at scale.' },
  { title: 'One bad video fails the whole comparison', body: 'If any video in a batch is private, age-restricted or region-locked, you get an error instead of a partial result.' },
  { title: 'History lives in your browser', body: 'There are no accounts. Past analyses and chats are stored locally, so clearing site data clears them too.' },
  { title: 'Agents run one after another', body: 'Transcript and visual work don’t depend on each other, so they could run in parallel. Today they run in sequence, for simplicity.' },
  { title: 'Search by screenshot isn’t built yet', body: 'The upload endpoint exists as a stub. Nothing matches a frame against a video’s keyframes yet.' },
  { title: 'The container setup is for local use', body: 'Compose serves the frontend with the Vite dev server. It’s a demo configuration, not a production deployment.' },
]
const PINS = ['bg-pink', 'bg-blue', 'bg-mint', 'bg-violet', 'bg-coral', 'bg-sky']
const TILTS = ['-rotate-[1.4deg]', 'rotate-[1deg]', 'rotate-[1.6deg]', '-rotate-[1deg]', '-rotate-[1.8deg]', 'rotate-[1.2deg]']

export default function Limits() {
  return (
    <section id="limits" className="relative py-20 md:py-28 bg-mark border-y-2 border-ink">
      <div className="absolute inset-0 bg-dots-ink opacity-50" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display font-extrabold text-[clamp(2rem,4.4vw,3.3rem)] leading-[1.02] tracking-[-0.04em] text-ink">What it doesn’t do yet.</h2>
          <p className="mt-4 text-[17px] leading-[1.6] text-ink/75 max-w-xl">Listed here so you don’t have to find them yourself.</p>
        </div>
        <ul className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-9">
          {LIMITS.map((l, i) => (
            <li key={l.title} className={`relative bg-white border-2 border-ink shadow-pop rounded-xl p-5 pt-7 ${TILTS[i]} transition-transform duration-300 hover:rotate-0 hover:-translate-y-1`}>
              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full ${PINS[i]} border-2 border-ink`} aria-hidden="true" />
              <h3 className="text-[16.5px] font-extrabold tracking-[-0.02em] text-ink mb-1.5 leading-snug">{l.title}</h3>
              <p className="text-[14px] leading-[1.6] text-mute">{l.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
