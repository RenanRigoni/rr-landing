import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeadForDisplay } from '@/lib/queries/leads'
import { listStages } from '@/lib/queries/catalogs'
import { listActivitiesForLead } from '@/lib/queries/activities'
import { formatBRL } from '@/lib/domain/money'
import { formatRelativeDateBR } from '@/lib/domain/date'
import { StageBadge } from '@/components/ui/StageBadge'
import { StageMover } from '@/components/leads/StageMover'
import { MarkRespondedButton } from '@/components/leads/MarkRespondedButton'
import { ActivityTimeline } from '@/components/leads/ActivityTimeline'
import type { Database } from '@/lib/types/database.types'

const STATUS_LABEL: Record<Database['sales']['Enums']['lead_status'], string> = {
  open: 'Aberto',
  won: 'Ganho',
  lost: 'Perdido',
}

interface LeadDetailPageProps {
  params: Promise<{ leadId: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { leadId } = await params
  const [lead, stages] = await Promise.all([getLeadForDisplay(leadId), listStages()])

  if (!lead) {
    notFound()
  }

  const activities = await listActivitiesForLead(lead.id)

  return (
    <div className="max-w-3xl">
      <Link href="/leads" className="text-xs text-content-secondary hover:text-content-primary">
        ← Leads
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-content-primary">{lead.title}</h1>
          <p className="mt-1 text-sm text-content-secondary">{lead.contact.full_name}</p>
        </div>
        <StageBadge label={lead.stage.label} color={lead.stage.color} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-white/[0.08] bg-surface-elevated p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Valor</dt>
          <dd className="mt-1 font-mono text-content-primary">{formatBRL(lead.value_cents)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Fonte</dt>
          <dd className="mt-1 text-content-secondary">{lead.source?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Status</dt>
          <dd className="mt-1 text-content-secondary">{STATUS_LABEL[lead.status]}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Último contato</dt>
          <dd className="mt-1 font-mono text-content-secondary">
            {lead.last_contact_at ? formatRelativeDateBR(lead.last_contact_at) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Próxima ação</dt>
          <dd className="mt-1 font-mono text-content-secondary">
            {lead.next_action_at ? formatRelativeDateBR(lead.next_action_at) : '—'}
          </dd>
        </div>
        {lead.interest ? (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Interesse</dt>
            <dd className="mt-1 text-content-secondary">{lead.interest}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap items-start gap-4">
        <div className="flex-1 rounded-lg border border-white/[0.08] bg-surface-elevated p-4">
          <StageMover
            leadId={lead.id}
            currentStageId={lead.stage.id}
            stages={stages.map((stage) => ({ id: stage.id, label: stage.label }))}
          />
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-surface-elevated p-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-content-muted">Cliente</p>
          <MarkRespondedButton leadId={lead.id} alreadyResponded={lead.responded_at !== null} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-white/[0.08] bg-surface-elevated p-4">
        <h2 className="text-sm font-semibold text-content-primary">Contato</h2>
        <p className="mt-2 text-sm text-content-secondary">{lead.contact.full_name}</p>
        {lead.contact.phone ? <p className="font-mono text-sm text-content-secondary">{lead.contact.phone}</p> : null}
      </div>

      <div className="mt-6 rounded-lg border border-white/[0.08] bg-surface-elevated p-4">
        <h2 className="text-sm font-semibold text-content-primary">Histórico</h2>
        <div className="mt-3">
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  )
}
