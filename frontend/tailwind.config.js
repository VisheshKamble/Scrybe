/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The page itself is a tinted lavender, never white. White is reserved
        // for the "paper" you read on (cards, inputs, the report).
        paper: '#ECEFFF',
        surface: '#FFFFFF',
        sunk: '#DFE4FB',
        ink: { DEFAULT: '#12172B', soft: '#2B3152' },
        mute: '#535B7D',
        faint: '#868EAC',
        line: '#D6DCF4',
        line2: '#BFC8EB',
        // A colour-coded system: each kind of reading owns one colour, and it
        // follows that thing across the site and the app.
        //   said = sun   shown = sky   true = mint   cited = pink   chapters = violet
        blue: { DEFAULT: '#2B3BEE', deep: '#1C27BF', soft: '#E0E4FF', mist: '#EEF0FF' },
        violet: { DEFAULT: '#6A3DF0', deep: '#4B22C9', soft: '#E7DFFF' },
        pink: { DEFAULT: '#FF4F8B', soft: '#FFDFEA' },
        coral: { DEFAULT: '#FF7A45', soft: '#FFE3D5' },
        mint: { DEFAULT: '#14D3A0', soft: '#CFF6EA' },
        sky: { DEFAULT: '#33B5FF', soft: '#D7F0FF' },
        mark: { DEFAULT: '#FFDD4A', soft: '#FFF2B3' },
        ok: { DEFAULT: '#0A8F66', soft: '#D6F4E8' },
        warn: { DEFAULT: '#B86200', soft: '#FFE9C7' },
        bad: { DEFAULT: '#D1323B', soft: '#FFE0E3' },
        night: { DEFAULT: '#0D1124', 2: '#151B36', 3: '#1D2547', line: '#2C3562', text: '#E7EAFA', mute: '#98A1CB' },
      },
      fontFamily: {
        sans: ['"Schibsted Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Schibsted Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        rest: '0 1px 0 0 rgba(18,23,43,0.05), 0 2px 6px -1px rgba(43,59,238,0.08)',
        float: '0 2px 4px -2px rgba(18,23,43,0.1), 0 28px 56px -24px rgba(18,23,43,0.45)',
        pop: '4px 4px 0 0 #12172B',
        focus: '0 0 0 4px rgba(43,59,238,0.2)',
      },
      keyframes: {
        'pulse-dot': { '0%, 100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.4, transform: 'scale(0.8)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'caret-blink': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
        'pop-in': { '0%': { opacity: 0, transform: 'translateY(8px) scale(0.97)' }, '100%': { opacity: 1, transform: 'translateY(0) scale(1)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--r, 0deg))' },
          '50%': { transform: 'translateY(-9px) rotate(var(--r, 0deg))' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(3%, -4%) scale(1.07)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'mark-sweep': { '0%': { backgroundSize: '0% 100%' }, '100%': { backgroundSize: '100% 100%' } },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        shimmer: 'shimmer 2.2s ease-in-out infinite',
        'caret-blink': 'caret-blink 1s step-end infinite',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.16,1,0.3,1) both',
        marquee: 'marquee 34s linear infinite',
        'marquee-rev': 'marquee 42s linear infinite reverse',
        bob: 'bob 5s ease-in-out infinite',
        drift: 'drift 14s ease-in-out infinite',
        'spin-slow': 'spin-slow 22s linear infinite',
        'mark-sweep': 'mark-sweep 0.7s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
}
