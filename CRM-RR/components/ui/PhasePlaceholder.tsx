interface PhasePlaceholderProps {
  title: string
  phase: string
  description: string
}

/**
 * Placeholder honesto para rotas ainda não implementadas — usado só durante o
 * scaffold (Fase 1). Cada fase subsequente substitui a página real.
 */
export function PhasePlaceholder({ title, phase, description }: PhasePlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center gap-3 rounded-card border border-white/[0.08] bg-surface-elevated p-10">
      <span className="rounded-pill bg-brand-600/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-400">
        {phase}
      </span>
      <h1 className="font-sans text-2xl font-semibold text-content-primary">{title}</h1>
      <p className="max-w-xl text-sm leading-relaxed text-content-secondary">{description}</p>
    </div>
  )
}
