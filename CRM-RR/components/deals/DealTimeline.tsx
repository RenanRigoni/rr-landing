import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface StageHistoryRow {
  id: string
  changed_at: string
  duration_in_previous_stage_seconds: number | null
  from_stage: { name: string } | null
  to_stage: { name: string } | null
}

interface ActivityRow {
  id: string
  type: string
  status: string
  subject: string
  due_at: string | null
  completed_at: string | null
  created_at: string
  outcome: string | null
}

interface TimelineEvent {
  at: string
  label: string
  detail?: string
}

function buildTimeline(stageHistory: StageHistoryRow[], activities: ActivityRow[]): TimelineEvent[] {
  const stageEvents: TimelineEvent[] = stageHistory.map((row) => ({
    at: row.changed_at,
    label: row.from_stage
      ? `Movido de "${row.from_stage.name}" para "${row.to_stage?.name}"`
      : `Criado em "${row.to_stage?.name}"`,
  }))

  const activityEvents: TimelineEvent[] = activities.map((activity) => ({
    at: activity.completed_at ?? activity.created_at,
    label: activity.status === 'done' ? `Atividade concluída: ${activity.subject}` : `Atividade criada: ${activity.subject}`,
    detail: activity.outcome ?? undefined,
  }))

  return [...stageEvents, ...activityEvents].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

export function DealTimeline({
  stageHistory,
  activities,
}: {
  stageHistory: StageHistoryRow[]
  activities: ActivityRow[]
}) {
  const events = buildTimeline(stageHistory, activities)

  if (events.length === 0) {
    return <p className="text-sm text-content-secondary">Sem eventos ainda.</p>
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event, i) => (
        <li key={i} className="flex gap-3 border-l border-white/[0.08] pl-4">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] text-content-muted">
              {format(new Date(event.at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="text-sm text-content-primary">{event.label}</span>
            {event.detail ? <span className="text-xs text-content-secondary">{event.detail}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
