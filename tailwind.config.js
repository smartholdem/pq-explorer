/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        bg2: 'rgb(var(--c-bg2) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        cyan: 'rgb(var(--c-cyan) / <alpha-value>)',
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        bad: 'rgb(var(--c-bad) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        quantum: 'rgb(var(--c-quantum) / <alpha-value>)',
      },
      boxShadow: {
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 12px 40px -20px rgb(0 0 0 / 0.6)',
        glow: '0 8px 30px rgba(0,212,255,0.12)',
        brand: '0 0 18px rgba(255,90,10,0.35)',
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
        blockRing: { '0%': { transform: 'scale(1)', opacity: 0.8 }, '100%': { transform: 'scale(3.2)', opacity: 0 } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        rise: 'rise .45s cubic-bezier(.2,.7,.2,1) both',
        pulseDot: 'pulseDot 2.6s ease-in-out infinite',
        blockRing: 'blockRing 2.4s cubic-bezier(0,0,0.2,1) 1 both',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}
