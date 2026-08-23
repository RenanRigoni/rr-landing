import type { Config } from 'tailwindcss'

// Cores consumidas via CSS custom properties definidas em app/globals.css
// (ver docs/DECISIONS.md D-009). Isso permite trocar o tema por organização
// (white-label) injetando um <style> com as variáveis, sem tocar em nenhum
// componente. Tokens herdados de ../DESIGN.md (marca DevRR) — ver
// docs/DESIGN_SYSTEM.md para o que é herdado e o que não é.
const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: withOpacity('--color-brand-50'),
          100: withOpacity('--color-brand-100'),
          200: withOpacity('--color-brand-200'),
          400: withOpacity('--color-brand-400'),
          500: withOpacity('--color-brand-500'),
          600: withOpacity('--color-brand-600'),
          700: withOpacity('--color-brand-700'),
          900: withOpacity('--color-brand-900'),
        },
        surface: {
          DEFAULT: withOpacity('--color-surface'),
          muted: withOpacity('--color-surface-muted'),
          elevated: withOpacity('--color-surface-elevated'),
          card: withOpacity('--color-surface-card'),
          footer: withOpacity('--color-surface-footer'),
        },
        content: {
          primary: withOpacity('--color-content-primary'),
          secondary: withOpacity('--color-content-secondary'),
          muted: withOpacity('--color-content-muted'),
        },
        success: withOpacity('--color-success'),
        danger: withOpacity('--color-danger'),
        warning: withOpacity('--color-warning'),
        accent: withOpacity('--color-accent'),
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
        card: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-lg': '0 8px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        float: '0 2px 24px rgba(0,0,0,0.4)',
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
