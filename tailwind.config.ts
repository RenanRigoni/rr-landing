import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#0D1829',
          100: '#152240',
          200: '#1E3566',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          900: '#1E3A5F',
        },
        surface: {
          DEFAULT: '#07070F',
          muted:   '#0B0B16',
          elevated:'#10101E',
          card:    '#0E1428',
          footer:  '#080E1A',
        },
        content: {
          primary:   '#F1F5F9',
          secondary: '#94A3B8',
          muted:     '#64748B',
        },
      },
      fontFamily: {
        display: ['var(--font-bricolage)', 'sans-serif'],
        sans:    ['var(--font-jakarta)', 'sans-serif'],
        mono:    ['var(--font-dm-mono)', 'monospace'],
      },
      borderRadius: {
        card:  '2rem',
        inner: 'calc(2rem - 0.375rem)',
        pill:  '9999px',
      },
      boxShadow: {
        card:        '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-lg':   '0 8px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        float:       '0 2px 24px rgba(0,0,0,0.4)',
        'glow-sm':   '0 0 24px rgba(37,99,235,0.3)',
        'glow-md':   '0 0 60px rgba(37,99,235,0.35), 0 0 120px rgba(99,102,241,0.15)',
        'glow-brand':'0 0 40px rgba(37,99,235,0.4), 0 0 80px rgba(99,102,241,0.2)',
      },
      transitionTimingFunction: {
        spring:    'cubic-bezier(0.32, 0.72, 0, 1)',
        'out-expo':'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
