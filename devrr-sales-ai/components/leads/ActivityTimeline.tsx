import { formatRelativeDateBR } from '@/lib/domain/date'
import { cn } from '@/lib/utils/cn'
import type { Activity } from '@/lib/queries/activities'
import type { Database } from '@/lib/types/database.types'

type ActivityType = Database['sales']['Enums']['activity_type']

const TYPE_LABEL: Record<ActivityType, string> = {
  note: 'Nota',
  call: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  meeting: 'Reunião',
  task: 'Tarefa',
  followup: 'Follow-up',
  proposal_sent: 'Proposta enviada',
}

interface ActivityTimelineProps {
  activities: Activity[]
}

/**
 * docs/IMPLEMENTATION_PLAN.md → 4.5: feito/pendente/cancelado com
 * distinção visual — cancelado fica esmaecido, **não some**, porque o
 * histórico de "o sistema ia cobrar mas o cliente respondeu" é o que prova
 * o valor do produto (mesmo texto da tarefa, direto do D-005).
 */
export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <p className="text-sm text-content-muted">Nenhuma atividade registrada ainda.</p>
  }

  return (
    <ul className="space-y-2">
      {activities.map((activity) => (
        <li
          key={activity.id}
          className={cn(
            'rounded-lg border border-white/[0.06] bg-surface-elevated px-4 py-3',
            activity.status === 'cancelled' ? 'opacity-50' : undefined,
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <p className={cn('text-sm font-medium text-content-primary', activity.status === 'cancelled' ? 'line-through' : undefined)}>
              {TYPE_LABEL[activity.type]} · {activity.title}
              {activity.is_auto ? <span className="text-[10px] uppercase tracking-[0.12em] text-content-muted"> · auto</span> : null}
            </p>
            <StatusLabel status={activity.status} />
          </div>
          {activity.body ? <p className="mt-1 text-xs text-content-secondary">{activity.body}</p> : null}
          <p className="mt-1 font-mono text-xs text-content-muted">{dateLine(activity)}</p>
        </li>
      ))}
    </ul>
  )
}

function StatusLabel({ status }: { status: Activity['status'] }) {
  if (status === 'done') {
    return <span className="text-xs font-medium text-success">Feito</span>
  }
  if (status === 'pending') {
    return <span className="text-xs font-medium text-warning">Pendente</span>
  }
  return <span className="text-xs font-medium text-content-muted">Cancelado</span>
}

function dateLine(activity: Activity): string {
  if (activity.status === 'done' && activity.done_at) {
    return `Concluída ${formatRelativeDateBR(activity.done_at)}`
  }
  if (activity.status === 'pending' && activity.due_at) {
    return `Agendada para ${formatRelativeDateBR(activity.due_at)}`
  }
  return `Registrada ${formatRelativeDateBR(activity.created_at)}`
}
