export interface ActivityLike {
  status: string
  due_at: string | null
}

export interface NextActionResult {
  hasNextAction: boolean
  nextDueAt: string | null
  isOverdue: boolean
}

/**
 * Regra 1: todo deal ativo deveria ter uma próxima ação. Dado o conjunto de
 * atividades de um deal, determina se existe alguma pendente e, se houver
 * data marcada, se já está atrasada.
 */
export function detectNextAction(activities: ActivityLike[], now: number = Date.now()): NextActionResult {
  const pending = activities.filter((a) => a.status === 'pending')
  if (pending.length === 0) {
    return { hasNextAction: false, nextDueAt: null, isOverdue: false }
  }

  const withDueDate = pending.filter((a) => a.due_at !== null)
  if (withDueDate.length === 0) {
    return { hasNextAction: true, nextDueAt: null, isOverdue: false }
  }

  const earliest = withDueDate.reduce((min, a) => (new Date(a.due_at!).getTime() < new Date(min.due_at!).getTime() ? a : min))

  return {
    hasNextAction: true,
    nextDueAt: earliest.due_at,
    isOverdue: new Date(earliest.due_at!).getTime() < now,
  }
}
