'use client'

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { completeActivity, rescheduleActivity } from '@/lib/actions/activities'
import { ActionRow } from '@/components/today/ActionRow'
import { LeadWithoutActionRow } from '@/components/today/LeadWithoutActionRow'
import { TodayEmptyState } from '@/components/today/TodayEmptyState'
import type { TodayActionRow as TodayActionRowData, LeadWithoutActionRow as LeadWithoutActionRowData } from '@/lib/queries/today'

interface TodayActionsListProps {
  overdue: TodayActionRowData[]
  dueToday: TodayActionRowData[]
  withoutAction: LeadWithoutActionRowData[]
  timezone: string
}

type FocusableRow = { key: string; leadId: string }

/**
 * Único componente cliente da 4.4 — precisa de estado local (foco ativo,
 * mutação pendente, erro por linha) pra navegação por teclado e pra chamar
 * `completeActivity`/`rescheduleActivity` (`lib/actions/activities.ts`, 4.3)
 * direto. Nenhuma regra de negócio mora aqui: is_auto/rule_id/cache do lead
 * são resolvidos inteiramente pelas actions — este componente só chama e
 * mostra o resultado (mesmo padrão de `components/leads/StageMover.tsx`).
 */
export function TodayActionsList({ overdue, dueToday, withoutAction, timezone }: TodayActionsListProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [activeIndex, setActiveIndex] = useState(0)
  const rowRefs = useRef<Array<HTMLDivElement | null>>([])

  const rows: FocusableRow[] = useMemo(
    () => [
      ...overdue.map((a) => ({ key: `action:${a.id}`, leadId: a.lead_id })),
      ...dueToday.map((a) => ({ key: `action:${a.id}`, leadId: a.lead_id })),
      ...withoutAction.map((l) => ({ key: `lead:${l.id}`, leadId: l.id })),
    ],
    [overdue, dueToday, withoutAction],
  )

  const indexByKey = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((row, i) => map.set(row.key, i))
    return map
  }, [rows])

  // `activeIndex` pode ficar fora do array depois que uma mutação encolhe
  // `rows` (ex.: concluir a última pendência do bloco "Hoje") — clampa na
  // leitura em vez de um efeito só pra corrigir o state (react-hooks/
  // set-state-in-effect: se dá pra derivar durante o render, não é efeito).
  const safeActiveIndex = Math.min(activeIndex, Math.max(rows.length - 1, 0))

  useEffect(() => {
    rowRefs.current[safeActiveIndex]?.focus()
  }, [safeActiveIndex])

  function registerRow(index: number) {
    return (el: HTMLDivElement | null) => {
      rowRefs.current[index] = el
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      const row = rows[safeActiveIndex]
      if (row) router.push(`/leads/${row.leadId}`)
    }
  }

  function handleComplete(activityId: string): void {
    setPendingId(activityId)
    setRowErrors((prev) => ({ ...prev, [activityId]: '' }))
    startTransition(async () => {
      const result = await completeActivity(activityId)
      setPendingId(null)
      if (result.error) {
        setRowErrors((prev) => ({ ...prev, [activityId]: result.error! }))
        return
      }
      router.refresh()
    })
  }

  function handlePostpone(activityId: string, currentDueAt: string): void {
    // "Adiar 1 dia": soma 24h ao vencimento atual. Não passa por
    // computeFollowupSchedule (lib/domain/followup.ts) de propósito — essa
    // função resolve o cronograma de uma REGRA de follow-up (fuso +
    // horário comercial), não um adiamento manual pontual; reaproveitá-la
    // aqui misturaria dois conceitos diferentes atrás do mesmo botão.
    const nextDueAt = new Date(new Date(currentDueAt).getTime() + 24 * 60 * 60 * 1000)
    setPendingId(activityId)
    setRowErrors((prev) => ({ ...prev, [activityId]: '' }))
    startTransition(async () => {
      const result = await rescheduleActivity(activityId, { due_at: nextDueAt.toISOString() })
      setPendingId(null)
      if (result.error) {
        setRowErrors((prev) => ({ ...prev, [activityId]: result.error! }))
        return
      }
      router.refresh()
    })
  }

  if (rows.length === 0) {
    return <TodayEmptyState />
  }

  return (
    <div className="space-y-8">
      <TodaySection label="Atrasado" count={overdue.length}>
        {overdue.map((action) => {
          const rowIndex = indexByKey.get(`action:${action.id}`)!
          return (
            <ActionRow
              key={action.id}
              action={action}
              urgency="overdue"
              timezone={timezone}
              rowRef={registerRow(rowIndex)}
              tabIndex={rowIndex === safeActiveIndex ? 0 : -1}
              onFocus={() => setActiveIndex(rowIndex)}
              onKeyDown={handleKeyDown}
              isPending={pendingId === action.id}
              error={rowErrors[action.id]}
              onComplete={() => handleComplete(action.id)}
              onPostpone={() => handlePostpone(action.id, action.due_at!)}
            />
          )
        })}
      </TodaySection>

      <TodaySection label="Hoje" count={dueToday.length}>
        {dueToday.map((action) => {
          const rowIndex = indexByKey.get(`action:${action.id}`)!
          return (
            <ActionRow
              key={action.id}
              action={action}
              urgency="today"
              timezone={timezone}
              rowRef={registerRow(rowIndex)}
              tabIndex={rowIndex === safeActiveIndex ? 0 : -1}
              onFocus={() => setActiveIndex(rowIndex)}
              onKeyDown={handleKeyDown}
              isPending={pendingId === action.id}
              error={rowErrors[action.id]}
              onComplete={() => handleComplete(action.id)}
              onPostpone={() => handlePostpone(action.id, action.due_at!)}
            />
          )
        })}
      </TodaySection>

      <TodaySection label="Sem próxima ação" count={withoutAction.length}>
        {withoutAction.map((lead) => {
          const rowIndex = indexByKey.get(`lead:${lead.id}`)!
          return (
            <LeadWithoutActionRow
              key={lead.id}
              lead={lead}
              rowRef={registerRow(rowIndex)}
              tabIndex={rowIndex === safeActiveIndex ? 0 : -1}
              onFocus={() => setActiveIndex(rowIndex)}
              onKeyDown={handleKeyDown}
            />
          )
        })}
      </TodaySection>
    </div>
  )
}

interface TodaySectionProps {
  label: string
  count: number
  children: ReactNode
}

function TodaySection({ label, count, children }: TodaySectionProps) {
  if (count === 0) {
    return null
  }

  return (
    <section aria-label={label}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-content-primary">
        {label} <span className="font-mono text-xs text-content-muted">({count})</span>
      </h2>
      <div role="list" className="space-y-2">
        {children}
      </div>
    </section>
  )
}
