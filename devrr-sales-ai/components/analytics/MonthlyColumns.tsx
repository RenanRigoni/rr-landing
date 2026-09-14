import { formatCompactBRL, type MonthPoint } from '@/lib/domain/analytics'

interface MonthlyColumnsProps {
  points: MonthPoint[]
}

const PLOT_HEIGHT = 168

/**
 * Colunas agrupadas por mês: leads criados (série 1) × negócios ganhos
 * (série 2). Mesma unidade (contagem), um só eixo. Legenda sempre visível;
 * valor detalhado no hover/foco de cada mês. Colunas de 14px com 2px de
 * respiro, topo arredondado 4px, base reta.
 */
export function MonthlyColumns({ points }: MonthlyColumnsProps) {
  const rawMax = Math.max(1, ...points.map((p) => Math.max(p.created, p.won)))
  const top = Math.ceil(rawMax / 4) * 4
  const ticks = [top, top / 2, 0]
  const height = (value: number) => (value / top) * PLOT_HEIGHT

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-content-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-1" /> Leads criados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-2" /> Negócios ganhos
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative w-6 shrink-0 font-mono text-[10px] text-content-muted" style={{ height: PLOT_HEIGHT }}>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: PLOT_HEIGHT - height(tick) }}>
              {tick}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute inset-x-0 h-px bg-chart-grid"
              style={{ top: PLOT_HEIGHT - height(tick) }}
            />
          ))}

          <ul className="relative flex items-end justify-between gap-1" style={{ height: PLOT_HEIGHT }}>
            {points.map((point) => (
              <li
                key={point.key}
                tabIndex={0}
                className="group relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-sm outline-none hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-brand-400"
                aria-label={`${point.label}: ${point.created} leads, ${point.won} ganhos`}
              >
                <span className="w-3.5 rounded-t-[4px] bg-chart-1" style={{ height: height(point.created) }} />
                <span className="w-3.5 rounded-t-[4px] bg-chart-2" style={{ height: height(point.won) }} />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-white/[0.08] bg-surface-muted px-2.5 py-1.5 text-xs text-content-primary opacity-0 shadow-float transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="block font-medium capitalize">{point.label}</span>
                  <span className="block font-mono">{point.created} leads criados</span>
                  <span className="block font-mono">
                    {point.won} ganhos · {formatCompactBRL(point.wonCents)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex justify-between gap-1">
            {points.map((point) => (
              <span key={point.key} className="flex-1 text-center font-mono text-[11px] text-content-muted">
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
