import { Link } from 'react-router-dom'

export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="9" fill="#12172B" />
      <text x="16" y="22.2" fontFamily="Schibsted Grotesk, Arial, sans-serif" fontWeight="800" fontSize="19" fill="#fff" textAnchor="middle">S</text>
      <rect x="8" y="25.2" width="16" height="2.4" rx="1.2" fill="#FFDD4A" />
    </svg>
  )
}

export function Logo({ to = '/', className = '', light = false }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 shrink-0 ${className}`} aria-label="Scrybe home">
      <LogoMark />
      <span className={`font-display font-extrabold text-[19px] tracking-[-0.03em] ${light ? 'text-white' : 'text-ink'}`}>Scrybe</span>
    </Link>
  )
}

export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 rounded-full bg-ink text-white font-semibold px-5 py-3 text-[14.5px] transition-colors duration-200 hover:bg-blue disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-ink',
  sun: 'inline-flex items-center justify-center gap-2 rounded-full bg-mark text-ink font-bold px-5 py-3 text-[14.5px] border-2 border-ink shadow-pop transition-transform duration-150 hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-full bg-surface text-ink font-semibold px-5 py-3 text-[14.5px] border border-line2 transition-colors duration-200 hover:border-ink',
  ghost: 'inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-blue hover:text-ink transition-colors duration-200',
}

const CHIP = {
  mark: 'bg-mark text-ink',
  sky: 'bg-sky text-ink',
  mint: 'bg-mint text-ink',
  pink: 'bg-pink text-ink',
  coral: 'bg-coral text-ink',
  violet: 'bg-violet text-white',
  white: 'bg-white text-ink',
}

/** A word on a coloured marker swatch, tilted like it was done by hand. */
export function W({ c = 'mark', tilt = -1.5, children }) {
  return (
    <span className={`${CHIP[c]} inline-block rounded-[0.16em] px-[0.15em] mx-[0.02em]`} style={{ transform: `rotate(${tilt}deg)` }}>
      {children}
    </span>
  )
}

export function SectionHead({ title, children, className = '', dark = false }) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <h2 className={`font-display font-extrabold text-[clamp(2rem,4.4vw,3.3rem)] leading-[1.02] tracking-[-0.04em] [text-wrap:balance] ${dark ? 'text-white' : 'text-ink'}`}>{title}</h2>
      {children && <p className={`mt-4 text-[17px] leading-[1.6] max-w-xl ${dark ? 'text-white/80' : 'text-mute'}`}>{children}</p>}
    </div>
  )
}

export function Marked({ text, phrase, className = 'hl', animate = false }) {
  if (!phrase) return <>{text}</>
  const i = text.indexOf(phrase)
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span className={`${className} ${animate ? 'animate-mark-sweep' : ''}`}>{phrase}</span>
      {text.slice(i + phrase.length)}
    </>
  )
}

const BANNER = {
  blue: { wrap: 'bg-blue text-white', sub: 'text-white/80', a: 'bg-pink', b: 'bg-mark', dots: 'bg-dots-light' },
  violet: { wrap: 'bg-violet text-white', sub: 'text-white/80', a: 'bg-mint', b: 'bg-mark', dots: 'bg-dots-light' },
  pink: { wrap: 'bg-pink text-ink', sub: 'text-ink/75', a: 'bg-mark', b: 'bg-violet', dots: 'bg-dots-ink' },
  mint: { wrap: 'bg-mint text-ink', sub: 'text-ink/75', a: 'bg-mark', b: 'bg-pink', dots: 'bg-dots-ink' },
  coral: { wrap: 'bg-coral text-ink', sub: 'text-ink/75', a: 'bg-mark', b: 'bg-violet', dots: 'bg-dots-ink' },
}

/** The colour block every workspace page opens with. */
export function PageBanner({ tone = 'blue', title, sub, actions, children }) {
  const t = BANNER[tone]
  return (
    <section className={`relative overflow-hidden rounded-[28px] md:rounded-[36px] ${t.wrap} px-6 sm:px-9 py-9 md:py-12 mb-8 md:mb-10`}>
      <div className={`absolute inset-0 ${t.dots} opacity-70`} aria-hidden="true" />
      <div className={`absolute -right-16 -top-20 w-64 h-64 rounded-full ${t.a} opacity-90 animate-drift`} aria-hidden="true" />
      <div className={`absolute right-24 bottom-[-46px] w-28 h-28 rounded-full ${t.b} opacity-95`} aria-hidden="true" />
      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="font-display font-extrabold text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1] tracking-[-0.045em] [text-wrap:balance]">{title}</h1>
            {sub && <p className={`mt-4 text-[17px] leading-[1.55] max-w-xl ${t.sub}`}>{sub}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
        </div>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  )
}
