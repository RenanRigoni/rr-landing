import type { DashboardKpis } from '@/lib/queries/analytics'

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: 'success' | 'danger' }) {
  const valueColor = accent === 'success' ? 'text-success' : accent === 'danger' ? 'text-danger' : 'text-content-primary'
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/[0.08] bg-surface-elevated p-4">
      <span className="font-mono text-[10px] uppercase tracking-wide text-content-muted">{label}</span>
      <span className={`font-mono text-xl ${valueColor}`}>{value}</span>
    </div>
  )
}

export function KpiRow({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Oportunidades ativas" value={String(kpis.activeDeals)} />
      <KpiCard label="Valor em pipeline" value={formatCurrency(kpis.pipelineValueCents)} />
      <KpiCard label="Valor ganho" value={formatCurrency(kpis.wonValueCents)} accent="success" />
      <KpiCard label="Valor perdido" value={formatCurrency(kpis.lostValueCents)} accent="danger" />
      <KpiCard label="Win rate" value={kpis.winRatePct !== null ? `${kpis.winRatePct}%` : '—'} />
      <KpiCard
        label="Ticket médio (ganho)"
        value={kpis.avgDealValueCents !== null ? formatCurrency(kpis.avgDealValueCents) : '—'}
      />
    </div>
  )
}
