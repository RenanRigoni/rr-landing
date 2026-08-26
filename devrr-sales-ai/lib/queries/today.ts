import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { getCurrentOrg } from '@/lib/queries/orgs'
import { getOrgDayWindow } from '@/lib/domain/today'
import type { Database } from '@/lib/types/database.types'

export type TodayActionRow = Database['sales']['Views']['v_today_actions']['Row']
export type LeadWithoutActionRow = Database['sales']['Views']['v_leads_without_action']['Row']

// Strings longas de propósito, não concatenadas — string literal concatenada
// via `+` perde o tipo literal e faz o `.select()` do postgrest-js cair em
// `GenericStringError` (achado real, mesma nota em lib/queries/leads.ts).
const TODAY_ACTION_COLUMNS =
  'id, org_id, lead_id, type, title, body, due_at, is_auto, step_number, lead_title, value_cents, stage_id, contact_name, contact_phone, stage_label'
const LEAD_WITHOUT_ACTION_COLUMNS =
  'id, org_id, title, value_cents, stage_id, last_contact_at, contact_name, contact_phone, stage_label, stage_position'

export interface TodayActions {
  overdue: TodayActionRow[]
  dueToday: TodayActionRow[]
  withoutAction: LeadWithoutActionRow[]
  timezone: string
}

/**
 * Dados da tela "Ações de hoje" (4.4): pendentes atrasados/vencendo hoje
 * (`v_today_actions`) + leads sem próxima ação (`v_leads_without_action`).
 *
 * `v_today_actions` não filtra por data — só `status='pending'`,
 * `due_at is not null`, `lead.status='open'` (docs/DATABASE.md →
 * `sales.v_today_actions`: "o filtro de data fica na query, não na view,
 * porque depende do timezone da organização"). O corte "atrasado" ×
 * "hoje" é feito aqui com `getOrgDayWindow()` (lib/domain/today.ts,
 * mesma disciplina de fuso de D-024) — nunca com `Date.now()` do
 * servidor direto.
 */
export async function getTodayActions(): Promise<TodayActions> {
  const orgId = await requireOrgId()
  const supabase = await createClient()
  const org = await getCurrentOrg()

  // requireOrgId() já lançou se não houvesse org — getCurrentOrg() aqui só
  // repete a consulta cacheada (React cache(), mesmo request) pra ler o
  // timezone; `org` nunca é null neste ponto.
  const timezone = org!.timezone
  const { start, end } = getOrgDayWindow(timezone)

  const [actionsResult, withoutActionResult] = await Promise.all([
    supabase
      .from('v_today_actions')
      .select(TODAY_ACTION_COLUMNS)
      .eq('org_id', orgId)
      .lte('due_at', end.toISOString())
      .order('due_at', { ascending: true }),
    supabase
      .from('v_leads_without_action')
      .select(LEAD_WITHOUT_ACTION_COLUMNS)
      .eq('org_id', orgId)
      .order('stage_position', { ascending: true }),
  ])

  if (actionsResult.error) {
    throw new Error(`Falha ao carregar ações de hoje: ${actionsResult.error.message}`)
  }
  if (withoutActionResult.error) {
    throw new Error(`Falha ao carregar leads sem próxima ação: ${withoutActionResult.error.message}`)
  }

  const startMs = start.getTime()
  const rows = actionsResult.data ?? []
  const overdue = rows.filter((row) => new Date(row.due_at!).getTime() < startMs)
  const dueToday = rows.filter((row) => new Date(row.due_at!).getTime() >= startMs)

  return { overdue, dueToday, withoutAction: withoutActionResult.data ?? [], timezone }
}
