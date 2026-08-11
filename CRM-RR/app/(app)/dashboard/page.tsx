import { KpiRow } from '@/components/dashboard/KpiRow'
import { FunnelChart } from '@/components/dashboard/FunnelChart'
import { StageDurationChart } from '@/components/dashboard/StageDurationChart'
import { LostReasonChart } from '@/components/dashboard/LostReasonChart'
import { SourcePerformanceTable } from '@/components/dashboard/SourcePerformanceTable'
import { getDefaultPipeline } from '@/lib/queries/pipeline'
import {
  getDashboardKpis,
  getFunnelConversion,
  getStageDuration,
  getLostReasonSummary,
  getSourcePerformance,
  getFollowupHealthSummary,
  getBottleneckInsights,
} from '@/lib/queries/analytics'

export default async function DashboardPage() {
  const pipeline = await getDefaultPipeline()
  const [kpis, funnel, stageDuration, lostReasons, sourcePerformance, followupHealth] = await Promise.all([
    getDashboardKpis(),
    getFunnelConversion(pipeline.id),
    getStageDuration(pipeline.id),
    getLostReasonSummary(),
    getSourcePerformance(),
    getFollowupHealthSummary(),
  ])

  const bottlenecks = getBottleneckInsights(stageDuration, followupHealth, lostReasons)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Dashboard</h1>
        <p className="text-sm text-content-secondary">
          {followupHealth.overdue} atrasado{followupHealth.overdue !== 1 ? 's' : ''} ·{' '}
          {followupHealth.no_next_action} sem próxima ação
        </p>
      </div>

      <KpiRow kpis={kpis} />

      {bottlenecks.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-warning">Possíveis gargalos</h2>
          <div className="flex flex-col gap-3">
            {bottlenecks.map((b, i) => (
              <div key={i} className="rounded-inner border border-warning/20 bg-warning/5 p-4">
                <p className="text-sm text-content-primary">{b.data}</p>
                <p className="mt-1 text-xs text-content-secondary">
                  <span className="font-mono uppercase tracking-wide text-content-muted">Interpretação possível: </span>
                  {b.interpretation}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
          Funil — deals que alcançaram cada estágio
        </h2>
        <FunnelChart data={funnel} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
          Tempo médio por estágio
        </h2>
        <StageDurationChart data={stageDuration} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Motivos de perda</h2>
        <LostReasonChart data={lostReasons} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
          Performance por fonte de aquisição
        </h2>
        <SourcePerformanceTable data={sourcePerformance} />
      </section>
    </div>
  )
}
