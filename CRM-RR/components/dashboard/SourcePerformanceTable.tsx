interface SourceRow {
  source_id: string
  source_name: string
  total_deals: number
  won_deals: number
  lost_deals: number
  win_rate_pct: number | null
  avg_won_value_cents: number | null
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

export function SourcePerformanceTable({ data }: { data: SourceRow[] }) {
  const withDeals = data.filter((row) => row.total_deals > 0)

  if (withDeals.length === 0) {
    return <p className="text-sm text-content-secondary">Nenhuma oportunidade com fonte registrada ainda.</p>
  }

  return (
    <div className="overflow-hidden rounded-card border border-white/[0.08]">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-elevated text-xs uppercase tracking-wide text-content-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Fonte</th>
            <th className="px-4 py-3 font-medium">Deals</th>
            <th className="px-4 py-3 font-medium">Ganhos</th>
            <th className="px-4 py-3 font-medium">Perdidos</th>
            <th className="px-4 py-3 font-medium">Win rate</th>
            <th className="px-4 py-3 font-medium">Ticket médio</th>
          </tr>
        </thead>
        <tbody>
          {withDeals.map((row) => (
            <tr key={row.source_id} className="border-t border-white/[0.08]">
              <td className="px-4 py-3 text-content-primary">{row.source_name}</td>
              <td className="px-4 py-3 font-mono text-content-secondary">{row.total_deals}</td>
              <td className="px-4 py-3 font-mono text-success">{row.won_deals}</td>
              <td className="px-4 py-3 font-mono text-danger">{row.lost_deals}</td>
              <td className="px-4 py-3 font-mono text-content-secondary">
                {row.win_rate_pct !== null ? `${row.win_rate_pct}%` : '—'}
              </td>
              <td className="px-4 py-3 font-mono text-content-secondary">
                {row.avg_won_value_cents !== null ? formatCurrency(row.avg_won_value_cents) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
