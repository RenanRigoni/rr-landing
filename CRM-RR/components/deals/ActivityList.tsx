'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { completeActivity, deleteActivity } from '@/lib/actions/activities'

interface Activity {
  id: string
  type: string
  status: string
  subject: string
  notes: string | null
  due_at: string | null
}

const TYPE_LABELS: Record<string, string> = {
  call: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  meeting: 'Reunião',
  note: 'Nota',
  task: 'Tarefa',
  linkedin: 'LinkedIn',
}

export function ActivityList({ dealId, activities }: { dealId: string; activities: Activity[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [completingId, setCompletingId] = useState<string | null>(null)

  const pendingActivities = activities.filter((a) => a.status === 'pending')

  function handleComplete(activityId: string) {
    startTransition(async () => {
      await completeActivity(activityId, dealId, null)
      setCompletingId(null)
      router.refresh()
    })
  }

  function handleDelete(activityId: string) {
    startTransition(async () => {
      await deleteActivity(activityId, dealId)
      router.refresh()
    })
  }

  if (pendingActivities.length === 0) {
    return <p className="text-sm text-content-secondary">Nenhuma atividade pendente.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {pendingActivities.map((activity) => (
        <li
          key={activity.id}
          className="flex items-center justify-between gap-3 rounded-inner border border-white/[0.08] bg-surface-elevated px-3 py-2"
        >
          <div className="flex flex-col">
            <span className="text-sm text-content-primary">
              <span className="font-mono text-[10px] uppercase tracking-wide text-content-muted">
                {TYPE_LABELS[activity.type] ?? activity.type}
              </span>{' '}
              {activity.subject}
            </span>
            {activity.due_at ? (
              <span className="font-mono text-[11px] text-content-muted">
                {format(new Date(activity.due_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setCompletingId(activity.id)
                handleComplete(activity.id)
              }}
              className="rounded-pill bg-success/15 px-3 py-1.5 text-xs font-medium text-success transition-colors ease-spring hover:bg-success/25 disabled:opacity-60"
            >
              {completingId === activity.id && pending ? '…' : 'Concluir'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleDelete(activity.id)}
              className="rounded-pill px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:text-danger disabled:opacity-60"
            >
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
