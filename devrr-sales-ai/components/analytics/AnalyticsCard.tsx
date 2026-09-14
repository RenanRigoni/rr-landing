import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface AnalyticsCardProps {
  title: string
  subtitle?: string
  className?: string
  children: ReactNode
}

export function AnalyticsCard({ title, subtitle, className, children }: AnalyticsCardProps) {
  return (
    <section className={cn('rounded-lg border border-white/[0.08] bg-surface-elevated p-5', className)}>
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-content-primary">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-content-muted">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  )
}

interface StatTileProps {
  label: string
  value: string
  detail?: string
  emphasis?: boolean
}

/** Número de destaque (dataviz: label · valor · detalhe). Número sempre em DM Mono (DESIGN_SYSTEM.md). */
export function StatTile({ label, value, detail, emphasis = false }: StatTileProps) {
  return (
    <div className={cn('rounded-lg border border-white/[0.08] p-4', emphasis ? 'bg-surface-card' : 'bg-surface-elevated')}>
      <p className="text-xs text-content-muted">{label}</p>
      <p className={cn('mt-2 font-mono font-medium text-content-primary', emphasis ? 'text-3xl' : 'text-2xl')}>{value}</p>
      {detail ? <p className="mt-1 font-mono text-xs text-content-secondary">{detail}</p> : null}
    </div>
  )
}
