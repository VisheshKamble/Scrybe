/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // --- unified product theme. Everything, marketing site and the
        // workspace alike, now shares this one palette (namespaced "lp-*"
        // for historical reasons) so the whole product feels like a
        // single considered piece of software. ---
        lp: {
          bg: '#FAFAF8',
          card: '#FFFFFF',
          ink: '#0B0B0D',
          muted: '#69696F',
          faint: '#86868D',
          line: '#E7E5EA',
          violet: '#6D28D9',
          violet2: '#8B5CF6',
          violetsoft: '#F3EEFE',
          green: '#16A34A',
          greensoft: '#EFFAF1',
          blue: '#2563EB',
          bluesoft: '#EFF4FE',
          amber: '#B45309',
          ambersoft: '#FDF3E7',
          red: '#DC2626',
          redsoft: '#FDF0EF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(11,11,13,0.04), 0 12px 32px -18px rgba(11,11,13,0.12)',
        'card-lg': '0 30px 60px -15px rgba(20,10,40,0.18)',
        'violet-glow': '0 16px 40px -20px rgba(109,40,217,0.35)',
        'ring-focus': '0 0 0 3px rgba(109,40,217,0.15)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(-1.2deg)' },
          '50%': { transform: 'translateY(-14px) rotate(-1.2deg)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.45, transform: 'scale(0.85)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'caret-blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        marquee: 'marquee 28s linear infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        shimmer: 'shimmer 2.2s ease-in-out infinite',
        'caret-blink': 'caret-blink 1s step-end infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
}
