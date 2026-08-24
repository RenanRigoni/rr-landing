import Link from 'next/link'
import { listLeadsForDisplay } from '@/lib/queries/leads'
import { listStages, listSources } from '@/lib/queries/catalogs'
import { LeadsFilterBar } from '@/components/leads/LeadsFilterBar'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { LeadsEmptyState } from '@/components/leads/LeadsEmptyState'
import type { Database } from '@/lib/types/database.types'

type LeadStatus = Database['sales']['Enums']['lead_status']

function isLeadStatus(value: string): value is LeadStatus {
  return value === 'open' || value === 'won' || value === 'lost'
}

interface LeadsPageProps {
  searchParams: Promise<{ stage?: string; source?: string; status?: string }>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams
  const [stages, sources] = await Promise.all([listStages(), listSources()])

  const activeStage = params.stage ? stages.find((stage) => stage.key === params.stage) : undefined
  const activeSource = params.source ? sources.find((source) => source.id === params.source) : undefined
  const activeStatus = params.status && isLeadStatus(params.status) ? params.status : undefined
  const hasAnyFilter = Boolean(activeStage || activeSource || activeStatus)

  const leads = await listLeadsForDisplay({
    stageId: activeStage?.id,
    sourceId: activeSource?.id,
    status: activeStatus,
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-content-primary">Leads</h1>
        <Link
          href="/leads/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Novo lead
        </Link>
      </div>

      <LeadsFilterBar
        stages={stages}
        sources={sources}
        activeStageKey={activeStage?.key}
        activeSourceId={activeSource?.id}
        activeStatus={activeStatus}
      />

      {leads.length === 0 ? (
        hasAnyFilter ? (
          <p className="rounded-lg border border-white/[0.08] bg-surface-elevated px-4 py-8 text-center text-sm text-content-secondary">
            Nenhum lead encontrado com esses filtros.{' '}
            <Link href="/leads" className="text-brand-400 hover:text-brand-500">
              Limpar filtros
            </Link>
          </p>
        ) : (
          <LeadsEmptyState />
        )
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  )
}
