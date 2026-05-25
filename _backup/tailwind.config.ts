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
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#1A56DB',
          700: '#1D4ED8',
          900: '#1E3A5F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFF',
        },
        content: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        display: ['var(--font-bricolage)', 'sans-serif'],
        sans: ['var(--font-jakarta)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      borderRadius: {
        card: '2rem',
        inner: 'calc(2rem - 0.375rem)',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 4px 32px rgba(15, 23, 42, 0.07)',
        'card-lg': '0 8px 48px rgba(15, 23, 42, 0.10)',
        float: '0 2px 20px rgba(15, 23, 42, 0.05)',
        'glow-sm': '0 0 24px rgba(26, 86, 219, 0.15)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
