import { cn } from '@/lib/utils/cn'

export interface BarListRow {
  label: string
  value: number
  valueLabel: string
  detail?: string
  tooltip?: string
}

interface BarListProps {
  rows: BarListRow[]
  /** Classe de fundo da série (`bg-chart-1`…). Uma série por lista — sem legenda, o título do card nomeia. */
  barClassName?: string
  emptyLabel?: string
  /** Escala comum; padrão = maior valor da lista. */
  max?: number
}

/**
 * Barras horizontais com rótulo, valor na ponta e detalhe opcional. HTML em vez
 * de SVG: o texto quebra/trunca sozinho e o leitor de tela lê a lista como
 * lista. Barra de 8px, ponta arredonda 4px, base reta (dataviz marks spec).
 * Hover mostra o detalhe completo (tooltip CSS, também no foco do teclado).
 */
export function BarList({ rows, barClassName = 'bg-chart-1', emptyLabel = 'Sem dados no período.', max }: BarListProps) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-content-muted">{emptyLabel}</p>
  }

  const scale = Math.max(max ?? Math.max(...rows.map((r) => r.value)), 1)

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li
          key={row.label}
          tabIndex={0}
          className="group relative grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-0.5 outline-none hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <span className="truncate text-sm text-content-secondary" title={row.label}>
            {row.label}
          </span>
          <span className="h-2 w-full rounded-r-[4px] bg-chart-grid/40">
            <span
              className={cn('block h-2 rounded-r-[4px]', barClassName)}
              style={{ width: `${Math.max((row.value / scale) * 100, row.value > 0 ? 1.5 : 0)}%` }}
            />
          </span>
          <span className="text-right">
            <span className="font-mono text-sm text-content-primary">{row.valueLabel}</span>
            {row.detail ? <span className="ml-2 font-mono text-xs text-content-muted">{row.detail}</span> : null}
          </span>
          {row.tooltip ? (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.08] bg-surface-muted px-2.5 py-1.5 font-mono text-xs text-content-primary opacity-0 shadow-float transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {row.tooltip}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
