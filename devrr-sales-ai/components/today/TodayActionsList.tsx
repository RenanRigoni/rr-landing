'use client'

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { completeActivity, rescheduleActivity, createActivity } from '@/lib/actions/activities'
import { markResponded } from '@/lib/actions/leads'
import { ActionRow } from '@/components/today/ActionRow'
import { LeadWithoutActionRow } from '@/components/today/LeadWithoutActionRow'
import { TodayEmptyState } from '@/components/today/TodayEmptyState'
import { FollowupPrompt } from '@/components/today/FollowupPrompt'
import type { TodayActionRow as TodayActionRowData, LeadWithoutActionRow as LeadWithoutActionRowData } from '@/lib/queries/today'
import type { Database } from '@/lib/types/database.types'

interface TodayActionsListProps {
  overdue: TodayActionRowData[]
  dueToday: TodayActionRowData[]
  withoutAction: LeadWithoutActionRowData[]
  timezone: string
}

type FocusableRow = { key: string; leadId: string }

interface FollowupPromptState {
  leadId: string
  leadTitle: string
  activityType: Database['sales']['Enums']['activity_type']
  suggestedDueAt: string | null
}

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
  const [followupPrompt, setFollowupPrompt] = useState<FollowupPromptState | null>(null)
  const [followupPromptError, setFollowupPromptError] = useState<string | null>(null)
  const [followupPromptPending, setFollowupPromptPending] = useState(false)
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
    // Achado B do checkpoint da Fase 4: o evento de teclado de um botão
    // (Concluir/Adiar/Cliente respondeu) ou do link "Abrir" dentro da linha
    // borbulha até este handler porque ele está no `<div>` da linha, não só
    // no próprio elemento. Sem esta guarda, `Enter` num botão concluía a
    // activity e navegava pro lead ao mesmo tempo — o `FollowupPrompt` (4.5)
    // nunca chegava a aparecer. Só trata o evento quando ele nasceu no
    // próprio contêiner da linha (foco real na linha, não em um descendente
    // focável).
    if (event.target !== event.currentTarget) {
      return
    }

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

  function handleComplete(activityId: string, leadTitle: string, action: TodayActionRowData): void {
    setPendingId(activityId)
    setRowErrors((prev) => ({ ...prev, [activityId]: '' }))
    startTransition(async () => {
      const result = await completeActivity(activityId)
      if (result.error) {
        setPendingId(null)
        setRowErrors((prev) => ({ ...prev, [activityId]: result.error! }))
        return
      }

      // Só sobra pergunta se não sobrou nenhuma próxima ação pro lead — se
      // já existe pendência (ex.: o passo seguinte da regra, gerado pelo
      // moveStageCore na entrada do estágio), refresh direto, sem perguntar
      // o óbvio. `pendingId` continua preenchido até a pergunta ser
      // resolvida (agendar ou dispensar) — a linha já concluída no banco
      // fica desabilitada em vez de parecer clicável de novo antes do
      // refresh trazer a lista atualizada.
      if (result.nextActionAt === null) {
        setFollowupPrompt({
          leadId: action.lead_id,
          leadTitle,
          activityType: action.type,
          suggestedDueAt: result.suggestedFollowupDueAt ?? null,
        })
        return
      }

      setPendingId(null)
      router.refresh()
    })
  }

  function handleMarkResponded(activityId: string, leadId: string): void {
    setPendingId(activityId)
    setRowErrors((prev) => ({ ...prev, [activityId]: '' }))
    startTransition(async () => {
      const result = await markResponded(leadId)
      setPendingId(null)
      if (result.error) {
        setRowErrors((prev) => ({ ...prev, [activityId]: result.error! }))
        return
      }
      router.refresh()
    })
  }

  function handleScheduleFollowup(dueAt: string): void {
    if (!followupPrompt) {
      return
    }
    setFollowupPromptPending(true)
    setFollowupPromptError(null)
    startTransition(async () => {
      const result = await createActivity({ lead_id: followupPrompt.leadId, type: followupPrompt.activityType, title: 'Follow-up', due_at: dueAt })
      setFollowupPromptPending(false)
      if (result.error) {
        setFollowupPromptError(result.error)
        return
      }
      setFollowupPrompt(null)
      setPendingId(null)
      router.refresh()
    })
  }

  function handleDismissFollowupPrompt(): void {
    setFollowupPrompt(null)
    setFollowupPromptError(null)
    setPendingId(null)
    router.refresh()
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
      {followupPrompt ? (
        <FollowupPrompt
          leadTitle={followupPrompt.leadTitle}
          suggestedDueAt={followupPrompt.suggestedDueAt}
          isPending={followupPromptPending}
          error={followupPromptError}
          onConfirm={handleScheduleFollowup}
          onDismiss={handleDismissFollowupPrompt}
        />
      ) : null}

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
              onComplete={() => handleComplete(action.id, action.lead_title, action)}
              onPostpone={() => handlePostpone(action.id, action.due_at)}
              onMarkResponded={() => handleMarkResponded(action.id, action.lead_id)}
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
              onComplete={() => handleComplete(action.id, action.lead_title, action)}
              onPostpone={() => handlePostpone(action.id, action.due_at)}
              onMarkResponded={() => handleMarkResponded(action.id, action.lead_id)}
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
