import { Sparkles } from 'lucide-react'

const WORDS = ['Transcript', 'On-screen frames', 'Fact checks', 'Chapters', 'Chat that cites', 'PDF export', 'Compare videos']

function Row({ dark, rev }) {
  const items = [...WORDS, ...WORDS]
  return (
    <div className={`flex w-max ${rev ? 'animate-marquee-rev' : 'animate-marquee'}`}>
      {[0, 1].map((k) => (
        <ul key={k} className="flex shrink-0 items-center" aria-hidden={k === 1}>
          {items.map((w, i) => (
            <li key={`${k}-${i}`} className="flex items-center gap-6 pr-6 text-[22px] font-extrabold tracking-[-0.03em] whitespace-nowrap">
              {w}
              <Sparkles size={20} strokeWidth={2.4} className={dark ? 'text-mark' : 'text-pink'} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}

// Two crossing ribbons: the page's one loud, purely decorative moment.
export default function Marquee() {
  return (
    <div className="relative h-[150px] -mt-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -inset-x-[6%] top-[52px] rotate-[1.6deg] bg-ink text-white py-3.5 border-y-2 border-ink">
        <Row dark rev />
      </div>
      <div className="absolute -inset-x-[6%] top-[52px] -rotate-[1.6deg] bg-mark text-ink py-3.5 border-y-2 border-ink z-10">
        <Row />
      </div>
    </div>
  )
}
