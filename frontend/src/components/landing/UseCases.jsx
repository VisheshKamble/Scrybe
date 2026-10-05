import { BookOpen, Mic2, MonitorPlay, Presentation } from 'lucide-react'
import { SectionHead } from '../ui.jsx'

const CASES = [
  { icon: BookOpen, title: 'Lectures and courses', body: 'Revise from chapters instead of scrubbing. Ask what you missed.', tint: 'bg-blue', ink: 'text-white', chip: 'bg-white/90', rows: [['0:00', 'Recap of last week'], ['4:12', 'Worked example'], ['18:40', 'What the exam covers']] },
  { icon: Presentation, title: 'Conference talks', body: 'Jump to the slide that mattered. Check the claim before you repeat it.', tint: 'bg-mark', ink: 'text-ink', chip: 'bg-white/80', rows: [['2:05', 'Benchmark slide'], ['9:31', 'Claim: 3x faster'], ['21:10', 'Live demo, error shown']] },
  { icon: MonitorPlay, title: 'Product demos', body: 'Capture what was on screen, not only what the presenter said about it.', tint: 'bg-mint', ink: 'text-ink', chip: 'bg-white/80', rows: [['1:20', 'Settings > Billing'], ['3:48', 'Export dialog'], ['6:02', 'Pricing table']] },
  { icon: Mic2, title: 'Interviews and podcasts', body: 'Pull the claims out. Put two guests on the same topic side by side.', tint: 'bg-violet', ink: 'text-white', chip: 'bg-white/90', rows: [['12:07', 'Guest A: on funding'], ['12:55', 'Claim flagged'], ['41:30', 'Guest B disagrees']] },
]

export default function UseCases() {
  return (
    <section id="use" className="relative py-20 md:py-28 bg-coral border-b-2 border-ink">
      <div className="absolute inset-0 bg-dots-ink opacity-50" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display font-extrabold text-[clamp(2rem,4.4vw,3.3rem)] leading-[1.02] tracking-[-0.04em] text-ink [text-wrap:balance]">Built for people who watch with a purpose.</h2>
          <p className="mt-4 text-[17px] leading-[1.6] text-ink/75 max-w-xl">If you’d otherwise scrub, pause and take notes, this is the notes.</p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CASES.map(({ icon: Icon, title, body, tint, ink, chip, rows }, i) => (
            <article key={title} className={`rounded-[26px] bg-white border-2 border-ink shadow-pop overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1.5 ${i % 2 ? 'lg:translate-y-4' : ''}`}>
              <div className={`${tint} ${ink} border-b-2 border-ink px-4 pt-4 pb-5`}>
                <span className="w-10 h-10 rounded-xl bg-white text-ink border-2 border-ink flex items-center justify-center mb-4"><Icon size={19} strokeWidth={2.4} /></span>
                <ul className="space-y-1.5">
                  {rows.map(([t, label]) => (
                    <li key={t} className={`flex items-center gap-2.5 rounded-lg ${chip} px-2.5 py-1.5 text-ink`}>
                      <span className="font-mono text-[10.5px] font-bold tabular-nums w-9 shrink-0 text-ink-soft">{t}</span>
                      <span className="text-[12.5px] font-bold truncate">{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5">
                <h3 className="text-[18px] font-extrabold tracking-[-0.025em] text-ink mb-1.5">{title}</h3>
                <p className="text-[14px] leading-[1.55] text-mute">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
