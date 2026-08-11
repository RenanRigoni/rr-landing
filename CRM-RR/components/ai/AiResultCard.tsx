interface AiResultCardProps {
  children: React.ReactNode
  actions?: React.ReactNode
}

export function AiResultCard({ children, actions }: AiResultCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-inner border border-brand-500/30 bg-brand-600/[0.04] p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-pill bg-brand-600/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-brand-400">
          Sugestão de IA — revisar antes de usar
        </span>
      </div>
      {children}
      {actions ? <div className="flex gap-3 pt-1">{actions}</div> : null}
    </div>
  )
}
