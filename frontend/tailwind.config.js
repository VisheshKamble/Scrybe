/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0D0F12',
        surface: '#15181D',
        border: '#262B33',
        primary: '#EDEBE5',
        secondary: '#9B9C9A',
        signal: '#F2A63C',
        trace: '#33B7A0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
