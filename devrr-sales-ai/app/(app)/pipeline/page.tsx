import { redirect } from 'next/navigation'
import { getCurrentOrg } from '@/lib/queries/orgs'
import { getPipelineBoard } from '@/lib/queries/pipeline'
import { buildBoardColumns } from '@/lib/domain/pipeline-board'
import { formatCompactBRL } from '@/lib/domain/analytics'
import { PipelineBoard } from '@/components/pipeline/PipelineBoard'

export default async function PipelinePage() {
  const org = await getCurrentOrg()
  if (!org) redirect('/onboarding')

  const now = new Date()
  const { stages, leads, hiddenCountByStageId, lostReasonSuggestions } = await getPipelineBoard(now)
  const columns = buildBoardColumns(leads, stages, now, { hiddenCountByStageId })

  const openColumns = columns.filter((column) => !column.stage.isWon && !column.stage.isLost)
  const openTotalCents = openColumns.reduce((sum, column) => sum + column.totalCents, 0)
  const openWeightedCents = openColumns.reduce((sum, column) => sum + column.weightedCents, 0)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-content-primary">Pipeline</h1>
          <p className="mt-1 text-sm text-content-secondary">{org.name}</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Total aberto</p>
            <p className="font-mono text-lg text-content-primary">{formatCompactBRL(openTotalCents)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Previsão ponderada</p>
            <p className="font-mono text-lg text-content-primary">{formatCompactBRL(openWeightedCents)}</p>
          </div>
        </div>
      </div>

      <PipelineBoard
        initialColumns={columns}
        orgName={org.name}
        lostReasonSuggestions={lostReasonSuggestions}
        nowIso={now.toISOString()}
      />
    </div>
  )
}
