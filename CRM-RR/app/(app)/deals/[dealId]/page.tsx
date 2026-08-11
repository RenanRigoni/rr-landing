import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { StageMover } from '@/components/deals/StageMover'
import { DealTimeline } from '@/components/deals/DealTimeline'
import { ActivityForm } from '@/components/deals/ActivityForm'
import { ActivityList } from '@/components/deals/ActivityList'
import { DealQualificationPanel } from '@/components/deals/DealQualificationPanel'
import { AiQualifyButton } from '@/components/ai/AiQualifyButton'
import { AiSummarizeButton } from '@/components/ai/AiSummarizeButton'
import { AiDraftEmailButton } from '@/components/ai/AiDraftEmailButton'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { deleteDeal } from '@/lib/actions/deals'
import { getDeal, listDealStageHistory } from '@/lib/queries/deals'
import { listDealActivities } from '@/lib/queries/activities'
import { listPipelineStages } from '@/lib/queries/pipeline'
import { listLostReasons } from '@/lib/queries/lost-reasons'
import { listQualificationCriteria, getDealQualification } from '@/lib/queries/qualification'

interface DealDetailPageProps {
  params: Promise<{ dealId: string }>
}

const STATUS_LABEL: Record<string, string> = { open: 'Aberto', won: 'Ganho', lost: 'Perdido' }
const STATUS_COLOR: Record<string, string> = { open: 'text-brand-400', won: 'text-success', lost: 'text-danger' }

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100)
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { dealId } = await params
  const deal = await getDeal(dealId)
  if (!deal) notFound()

  const [stages, lostReasons, stageHistory, activities, criteria, qualification] = await Promise.all([
    listPipelineStages(deal.pipeline_id),
    listLostReasons(),
    listDealStageHistory(dealId),
    listDealActivities(dealId),
    listQualificationCriteria(),
    getDealQualification(dealId),
  ])

  const boundDelete = deleteDeal.bind(null, deal.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-content-muted">
            {deal.companies ? (
              <Link href={`/companies/${deal.companies.id}`} className="hover:text-brand-400">
                {deal.companies.company_name}
              </Link>
            ) : (
              'Sem empresa'
            )}
          </p>
          <h1 className="font-sans text-2xl font-semibold text-content-primary">{deal.title}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span className={`text-sm font-medium ${STATUS_COLOR[deal.status]}`}>{STATUS_LABEL[deal.status]}</span>
            <span className="font-mono text-sm text-content-secondary">
              {formatCurrency(deal.value_cents, deal.currency)}
            </span>
          </div>
        </div>
        <DeleteButton action={boundDelete} confirmMessage={`Excluir a oportunidade "${deal.title}"?`} />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-8">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
              Atividades pendentes
            </h2>
            <ActivityList dealId={deal.id} activities={activities} />
            <ActivityForm dealId={deal.id} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Assistente de IA</h2>
            <div className="flex flex-wrap gap-3">
              <AiQualifyButton dealId={deal.id} />
              <AiSummarizeButton dealId={deal.id} />
              <AiDraftEmailButton dealId={deal.id} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Qualificação</h2>
            <DealQualificationPanel
              dealId={deal.id}
              criteria={criteria}
              overallScore={qualification?.qualification.overall_score ?? null}
              existingScores={
                qualification?.scores.map((s) => ({
                  criterion_id: s.criterion_id,
                  score: s.score,
                  rationale: s.rationale,
                })) ?? []
              }
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Timeline</h2>
            <DealTimeline stageHistory={stageHistory} activities={activities} />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Estágio</h2>
            <StageMover
              dealId={deal.id}
              currentStageId={deal.stage_id}
              stages={stages}
              lostReasons={lostReasons}
              disabled={deal.status !== 'open'}
            />
          </div>

          {deal.status === 'lost' && deal.lost_reasons ? (
            <div className="flex flex-col gap-1 rounded-inner border border-danger/20 bg-danger/5 p-3">
              <span className="font-mono text-[10px] uppercase tracking-wide text-danger">Motivo da perda</span>
              <span className="text-sm text-content-primary">{deal.lost_reasons.label}</span>
              {deal.lost_reason_notes ? (
                <span className="text-xs text-content-secondary">{deal.lost_reason_notes}</span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 text-sm">
            <div>
              <span className="block font-mono text-[10px] uppercase tracking-wide text-content-muted">Contato</span>
              {deal.contacts ? (
                <Link href={`/contacts/${deal.contacts.id}`} className="text-content-primary hover:text-brand-400">
                  {deal.contacts.full_name}
                </Link>
              ) : (
                <span className="text-content-secondary">—</span>
              )}
            </div>

            <div>
              <span className="block font-mono text-[10px] uppercase tracking-wide text-content-muted">
                Fonte de aquisição
              </span>
              <span className="text-content-primary">{deal.lead_sources?.name ?? '—'}</span>
            </div>

            <div>
              <span className="block font-mono text-[10px] uppercase tracking-wide text-content-muted">
                Previsão de fechamento
              </span>
              <span className="text-content-primary">
                {deal.expected_close_date
                  ? format(new Date(deal.expected_close_date), 'dd/MM/yyyy', { locale: ptBR })
                  : '—'}
              </span>
            </div>

            <div>
              <span className="block font-mono text-[10px] uppercase tracking-wide text-content-muted">
                Criado em
              </span>
              <span className="text-content-primary">
                {format(new Date(deal.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
