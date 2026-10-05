import { AlertTriangle, Check, FileDown, GitCompare, Rows3 } from 'lucide-react'
import { Marked, SectionHead } from '../ui.jsx'

function SaidSpecimen() {
  const bars = [14, 28, 18, 36, 24, 40, 20, 32, 12, 26, 38, 16, 30, 22, 34, 14, 24]
  return (
    <div className="rounded-2xl bg-sunk p-4">
      <div className="flex items-end gap-[3px] h-10 mb-3" aria-hidden="true">
        {bars.map((h, i) => <span key={i} className={`flex-1 rounded-full ${i > 9 && i < 14 ? 'bg-mark ring-1 ring-ink' : 'bg-line2'}`} style={{ height: `${h}px` }} />)}
      </div>
      <div className="space-y-1.5 text-[13px] leading-snug">
        <p className="flex gap-3"><span className="font-mono text-[11px] text-faint pt-px">4:11</span><span className="text-mute">Position has to be added back in.</span></p>
        <p className="flex gap-3"><span className="font-mono text-[11px] text-faint pt-px">4:19</span><span className="text-ink font-semibold"><Marked text="Sine and cosine waves do the job." phrase="Sine and cosine waves" /></span></p>
      </div>
    </div>
  )
}

function ShownSpecimen() {
  const frames = [
    { label: 'Slide', note: 'attention matrix', tone: 'bg-blue-soft' },
    { label: 'Code', note: 'positional_encoding()', tone: 'bg-mark-soft' },
    { label: 'Chart', note: 'loss over steps', tone: 'bg-pink-soft' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {frames.map((f) => (
        <div key={f.label} className="rounded-xl bg-white border-2 border-ink p-1.5">
          <div className={`relative aspect-[4/3] rounded-lg ${f.tone} overflow-hidden`}>
            <span className="absolute inset-2 rounded border-2 border-dashed border-ink/40" />
            <span className="absolute left-3 top-3 h-1 w-8 rounded bg-ink/30" />
            <span className="absolute left-3 top-6 h-1 w-5 rounded bg-ink/20" />
          </div>
          <p className="px-1 pt-1.5 text-[11.5px] font-extrabold text-ink">{f.label}</p>
          <p className="px-1 pb-0.5 font-mono text-[10px] text-faint truncate">{f.note}</p>
        </div>
      ))}
    </div>
  )
}

function CheckedSpecimen() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5 rounded-xl bg-mint-soft px-3 py-2.5">
        <Check size={15} className="text-ok mt-0.5 shrink-0" strokeWidth={3} />
        <p className="text-[13px] font-bold text-ink leading-snug">GPT-3 has 175 billion parameters<span className="block font-normal text-mute text-[12px]">Verified against the published paper</span></p>
      </div>
      <div className="flex items-start gap-2.5 rounded-xl bg-coral-soft px-3 py-2.5">
        <AlertTriangle size={15} className="text-warn mt-0.5 shrink-0" strokeWidth={2.6} />
        <p className="text-[13px] font-bold text-ink leading-snug">Training cost under $1M<span className="block font-normal text-mute text-[12px]">Unverified: estimates run higher</span></p>
      </div>
    </div>
  )
}

function CitedSpecimen() {
  return (
    <div className="space-y-2">
      <div className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-blue text-white text-[13px] font-medium px-3.5 py-2.5">Why does it need sine waves?</div>
      <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-sunk text-[13px] text-ink px-3.5 py-2.5 leading-snug">
        Attention has no sense of order, so position is added as a pattern of waves.
        <span className="ml-2 inline-flex items-center rounded-md bg-pink text-ink font-mono text-[11px] font-bold px-1.5 py-0.5">5:14</span>
      </div>
    </div>
  )
}

const CARDS = [
  { title: 'It reads what’s said', body: 'Captions when YouTube has them, Whisper when it doesn’t. Long videos are split and stitched, so a five-minute clip and a fifty-hour one take the same path.', Specimen: SaidSpecimen, bg: 'bg-mark', tilt: 'md:-rotate-[0.6deg]' },
  { title: 'It reads what’s on screen', body: 'Frames are sampled where the scene actually changes, then described by a vision model. Slides, code, charts and UI end up in the report, not just the talking.', Specimen: ShownSpecimen, bg: 'bg-sky', tilt: 'md:rotate-[0.6deg]' },
  { title: 'It checks what’s claimed', body: 'Factual claims are pulled out and searched against the live web before the summary is written. Confident-sounding nonsense gets flagged, with a note on why.', Specimen: CheckedSpecimen, bg: 'bg-mint', tilt: 'md:rotate-[0.6deg]' },
  { title: 'It answers with the second', body: 'Ask anything in chat. Answers come from a timestamped index of the transcript and the visuals, and each one carries a time you can click to jump straight there.', Specimen: CitedSpecimen, bg: 'bg-pink', tilt: 'md:-rotate-[0.6deg]' },
]

const EXTRAS = [
  { icon: Rows3, title: 'Chapters from real topic breaks', body: 'Not fixed time slices.', tone: 'bg-violet text-white' },
  { icon: GitCompare, title: 'Compare two or more videos', body: 'Agreements, contradictions and gaps in one write-up.', tone: 'bg-coral text-ink' },
  { icon: FileDown, title: 'Export as PDF or Markdown', body: 'The finished report, one click.', tone: 'bg-blue text-white' },
]

export default function Reads() {
  return (
    <section id="reads" className="relative pt-12 pb-24 md:pb-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <SectionHead title="One video, read four ways.">
          Most video summarizers read the transcript and stop. Scrybe reads the audio, the screen
          and the web, then ties every line back to a second on the clock.
        </SectionHead>

        <div className="mt-14 grid md:grid-cols-2 gap-5 lg:gap-6">
          {CARDS.map(({ title, body, Specimen, bg, tilt }) => (
            <article key={title} className={`rounded-[30px] border-2 border-ink ${bg} ${tilt} shadow-[6px_6px_0_0_#12172B] p-6 sm:p-8 flex flex-col transition-transform duration-300 hover:rotate-0 hover:-translate-y-1`}>
              <h3 className="font-display text-[26px] font-extrabold tracking-[-0.035em] text-ink">{title}</h3>
              <p className="mt-2.5 mb-6 text-[15.5px] leading-[1.6] text-ink/80 max-w-md">{body}</p>
              <div className="mt-auto rounded-2xl bg-white border-2 border-ink p-3"><Specimen /></div>
            </article>
          ))}
        </div>

        <ul className="mt-8 grid sm:grid-cols-3 gap-4">
          {EXTRAS.map(({ icon: Icon, title, body, tone }) => (
            <li key={title} className="flex items-start gap-3.5 rounded-[22px] bg-white border-2 border-ink px-5 py-4">
              <span className={`w-11 h-11 rounded-xl ${tone} border-2 border-ink flex items-center justify-center shrink-0`}><Icon size={19} strokeWidth={2.4} /></span>
              <div>
                <p className="text-[15px] font-extrabold text-ink leading-snug">{title}</p>
                <p className="text-[13.5px] text-mute leading-snug mt-0.5">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
