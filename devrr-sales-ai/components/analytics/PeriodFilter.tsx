import Link from 'next/link'
import { PERIOD_OPTIONS, type PeriodValue } from '@/lib/domain/analytics'
import { cn } from '@/lib/utils/cn'

interface PeriodFilterProps {
  current: PeriodValue
}

/** Filtro de período como links (`?periodo=`): estado na URL, compartilhável, sem JS. */
export function PeriodFilter({ current }: PeriodFilterProps) {
  return (
    <nav aria-label="Período" className="flex rounded-lg border border-white/[0.08] bg-surface-muted p-0.5">
      {PERIOD_OPTIONS.map((option) => {
        const active = option.value === current
        return (
          <Link
            key={option.value}
            href={`/analytics?periodo=${option.value}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
              active ? 'bg-surface-elevated text-content-primary' : 'text-content-muted hover:text-content-secondary',
            )}
          >
            {option.label}
          </Link>
        )
      })}
    </nav>
  )
}
