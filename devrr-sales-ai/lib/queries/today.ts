import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { getCurrentOrg } from '@/lib/queries/orgs'
import { getOrgDayWindow } from '@/lib/domain/today'
import type { Database } from '@/lib/types/database.types'

type RawTodayActionRow = Database['sales']['Views']['v_today_actions']['Row']
type RawLeadWithoutActionRow = Database['sales']['Views']['v_leads_without_action']['Row']

// `database.types.ts` é gerado (D-042) e o Postgres tipa TODA coluna de view
// como nullable — o planner não prova que os JOINs casam. As duas views só
// leem através de `INNER JOIN` sobre colunas `NOT NULL` das tabelas base
// (docs/DATABASE.md → Views), então na prática estas colunas nunca são nulas;
// `v_today_actions` ainda filtra `due_at is not null`. Em vez de calar o
// compilador com `!`/`as` (o que recriaria o buraco que a 7.0 fecha), a
// query estreita o tipo aqui e valida cada coluna garantida — linha com nulo
// onde não deveria haver é dado inconsistente e vira erro claro, não um
// `null` que explode três camadas acima.
export interface TodayActionRow {
  id: string
  org_id: string
  lead_id: string
  type: NonNullable<RawTodayActionRow['type']>
  title: string
  body: string | null
  due_at: string
  is_auto: boolean
  step_number: number | null
  lead_title: string
  value_cents: number
  stage_id: string
  contact_name: string
  contact_phone: string | null
  stage_label: string
}

export interface LeadWithoutActionRow {
  id: string
  org_id: string
  title: string
  value_cents: number
  stage_id: string
  last_contact_at: string | null
  contact_name: string
  contact_phone: string | null
  stage_label: string
  stage_position: number
}

// Strings longas de propósito, não concatenadas — string literal concatenada
// via `+` perde o tipo literal e faz o `.select()` do postgrest-js cair em
// `GenericStringError` (achado real, mesma nota em lib/queries/leads.ts).
const TODAY_ACTION_COLUMNS =
  'id, org_id, lead_id, type, title, body, due_at, is_auto, step_number, lead_title, value_cents, stage_id, contact_name, contact_phone, stage_label'
const LEAD_WITHOUT_ACTION_COLUMNS =
  'id, org_id, title, value_cents, stage_id, last_contact_at, contact_name, contact_phone, stage_label, stage_position'

function requireColumn<T>(value: T | null, view: string, column: string): T {
  if (value === null) {
    throw new Error(
      `${view}: coluna "${column}" veio nula. As junções internas e os filtros da view ` +
        `(docs/DATABASE.md → Views) deveriam impedir isso — indica dado inconsistente no banco.`,
    )
  }
  return value
}

function toTodayActionRow(row: RawTodayActionRow): TodayActionRow {
  const v = 'v_today_actions'
  return {
    id: requireColumn(row.id, v, 'id'),
    org_id: requireColumn(row.org_id, v, 'org_id'),
    lead_id: requireColumn(row.lead_id, v, 'lead_id'),
    type: requireColumn(row.type, v, 'type'),
    title: requireColumn(row.title, v, 'title'),
    body: row.body,
    due_at: requireColumn(row.due_at, v, 'due_at'),
    is_auto: requireColumn(row.is_auto, v, 'is_auto'),
    step_number: row.step_number,
    lead_title: requireColumn(row.lead_title, v, 'lead_title'),
    value_cents: requireColumn(row.value_cents, v, 'value_cents'),
    stage_id: requireColumn(row.stage_id, v, 'stage_id'),
    contact_name: requireColumn(row.contact_name, v, 'contact_name'),
    contact_phone: row.contact_phone,
    stage_label: requireColumn(row.stage_label, v, 'stage_label'),
  }
}

function toLeadWithoutActionRow(row: RawLeadWithoutActionRow): LeadWithoutActionRow {
  const v = 'v_leads_without_action'
  return {
    id: requireColumn(row.id, v, 'id'),
    org_id: requireColumn(row.org_id, v, 'org_id'),
    title: requireColumn(row.title, v, 'title'),
    value_cents: requireColumn(row.value_cents, v, 'value_cents'),
    stage_id: requireColumn(row.stage_id, v, 'stage_id'),
    last_contact_at: row.last_contact_at,
    contact_name: requireColumn(row.contact_name, v, 'contact_name'),
    contact_phone: row.contact_phone,
    stage_label: requireColumn(row.stage_label, v, 'stage_label'),
    stage_position: requireColumn(row.stage_position, v, 'stage_position'),
  }
}

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
  const actions = (actionsResult.data ?? []).map(toTodayActionRow)
  const overdue = actions.filter((row) => new Date(row.due_at).getTime() < startMs)
  const dueToday = actions.filter((row) => new Date(row.due_at).getTime() >= startMs)
  const withoutAction = (withoutActionResult.data ?? []).map(toLeadWithoutActionRow)

  return { overdue, dueToday, withoutAction, timezone }
}
