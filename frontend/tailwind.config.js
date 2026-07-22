/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // --- unified product theme. Everything, marketing site and the
        // workspace alike, shares this one palette (namespaced "lp-*" for
        // historical reasons) so the whole product feels like a single
        // considered piece of software: a dark control-room stage with one
        // confident violet -> signal-cyan accent. ---
        lp: {
          bg: '#050507',
          bg2: '#0A0A0F',
          card: '#0D0D13',
          cardhi: '#141420',
          ink: '#F6F5F2',
          muted: '#9C9AA8',
          faint: '#68667A',
          line: '#1D1D26',
          line2: '#2C2C3A',
          violet: '#7C5CFF',
          violet2: '#B69CFF',
          violetsoft: 'rgba(124,92,255,0.12)',
          cyan: '#22E7D0',
          cyansoft: 'rgba(34,231,208,0.12)',
          green: '#34D399',
          greensoft: 'rgba(52,211,153,0.12)',
          blue: '#60A5FA',
          bluesoft: 'rgba(96,165,250,0.12)',
          amber: '#FBBF24',
          ambersoft: 'rgba(251,191,36,0.12)',
          red: '#F87171',
          redsoft: 'rgba(248,113,113,0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0,0,0,0.3), 0 12px 32px -18px rgba(0,0,0,0.6)',
        'card-lg': '0 30px 80px -20px rgba(0,0,0,0.7)',
        'violet-glow': '0 0 0 1px rgba(124,92,255,0.25), 0 20px 60px -15px rgba(124,92,255,0.45)',
        'cyan-glow': '0 0 0 1px rgba(34,231,208,0.2), 0 20px 60px -15px rgba(34,231,208,0.35)',
        'ring-focus': '0 0 0 3px rgba(124,92,255,0.35)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
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
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'orb-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-3%, 4%) scale(1.08)' },
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
        scanline: 'scanline 3.2s linear infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        'orb-drift': 'orb-drift 16s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
