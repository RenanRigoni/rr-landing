import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import { WhatsappLogo, Phone, EnvelopeSimple, CalendarBlank, CheckSquare, Note, ArrowsClockwise, FileText } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { formatBRL } from '@/lib/domain/money'
import { formatTimeBR } from '@/lib/domain/date'
import { cn } from '@/lib/utils/cn'
import { FollowupGenerator } from '@/components/ai/FollowupGenerator'
import type { TodayActionRow as TodayActionRowData } from '@/lib/queries/today'
import type { Database } from '@/lib/types/database.types'

type ActivityType = Database['sales']['Enums']['activity_type']

const TYPE_ICON: Record<ActivityType, Icon> = {
  whatsapp: WhatsappLogo,
  call: Phone,
  email: EnvelopeSimple,
  meeting: CalendarBlank,
  task: CheckSquare,
  note: Note,
  followup: ArrowsClockwise,
  proposal_sent: FileText,
}

interface ActionRowProps {
  action: TodayActionRowData
  urgency: 'overdue' | 'today'
  timezone: string
  rowRef: (el: HTMLDivElement | null) => void
  tabIndex: number
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  isPending: boolean
  error?: string
  onComplete: () => void
  onPostpone: () => void
  onMarkResponded: () => void
}

// docs/DESIGN_SYSTEM.md → "Linha de ação" — o componente mais importante do
// produto. Puramente apresentacional: nenhuma chamada a lib/actions/ ou
// lib/queries/ aqui, só props e callbacks — a mutação de verdade mora em
// components/today/TodayActionsList.tsx (D-020: componente de UI nunca fala
// com Supabase, sempre via action).
//
// Exceção deliberada (5.4): `<FollowupGenerator>` é um componente cliente
// autossuficiente (fala com `lib/actions/ai-followup.ts`, nunca com o
// Supabase). Renderizá-lo aqui evita passar mais um par de callbacks por
// `TodayActionsList` só para o fluxo de IA — a linha continua sem regra de
// negócio própria.
export function ActionRow({
  action,
  urgency,
  timezone,
  rowRef,
  tabIndex,
  onFocus,
  onKeyDown,
  isPending,
  error,
  onComplete,
  onPostpone,
  onMarkResponded,
}: ActionRowProps) {
  const Icon = TYPE_ICON[action.type]

  return (
    <div
      ref={rowRef}
      role="listitem"
      tabIndex={tabIndex}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className="relative flex min-h-[44px] items-center gap-3 rounded-lg border border-white/[0.06] bg-surface-elevated py-3 pl-5 pr-4 transition-colors ease-spring hover:border-brand-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-0.5 rounded-l-lg', urgency === 'overdue' ? 'bg-red-400' : 'bg-amber-400')}
      />

      <Icon weight="regular" className="size-5 shrink-0 text-content-muted" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-content-primary">
          {action.contact_name} · {action.lead_title}
        </p>
        <p className="mt-0.5 truncate text-xs text-content-secondary">
          {action.title} · {action.stage_label}
          {urgency === 'overdue' ? <span className="text-red-400"> · atrasado</span> : null}
        </p>
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm text-content-primary">{formatBRL(action.value_cents)}</span>
        <span className="font-mono text-xs text-content-muted">{formatTimeBR(action.due_at!, timezone)}</span>

        <button
          type="button"
          disabled={isPending}
          onClick={onComplete}
          className="rounded-md bg-success/15 px-2.5 py-1.5 text-xs font-medium text-success transition-colors ease-spring hover:bg-success/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          Concluir
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onPostpone}
          className="rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:bg-white/[0.08] hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          Adiar 1 dia
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onMarkResponded}
          className="rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:bg-white/[0.08] hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cliente respondeu
        </button>
        <FollowupGenerator leadId={action.lead_id} activityId={action.id} />
        <Link
          href={`/leads/${action.lead_id}`}
          className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Abrir
        </Link>
      </div>
    </div>
  )
}
