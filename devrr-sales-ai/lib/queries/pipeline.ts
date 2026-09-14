import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { listLostReasonSuggestions } from '@/lib/queries/catalogs'
import { CLOSED_WINDOW_DAYS, type BoardLead, type BoardStage } from '@/lib/domain/pipeline-board'

export interface PipelineBoardData {
  stages: BoardStage[]
  leads: BoardLead[]
  hiddenCountByStageId: Record<string, number>
  lostReasonSuggestions: string[]
}

const PAGE_SIZE = 1000
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Dados do Kanban (/pipeline, Fase 8.3): estágios + leads abertos ou fechados
 * dentro da janela de exibição (`CLOSED_WINDOW_DAYS`) + contagem dos fechados
 * fora dela (`hiddenCountByStageId`, só para o rótulo — a linha nunca vai ao
 * cliente). Mesmo padrão de `lib/queries/analytics.ts`: queries simples
 * filtradas por `org_id`, mapas em memória, sem embedded select.
 */
export async function getPipelineBoard(now: Date): Promise<PipelineBoardData> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const windowStartIso = new Date(now.getTime() - CLOSED_WINDOW_DAYS * DAY_MS).toISOString()

  const [stagesResult, leadsRows, lostReasonSuggestions] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, key, label, position, probability, is_won, is_lost')
      .eq('org_id', orgId)
      .order('position'),
    fetchAll('leads', (from, to) =>
      supabase
        .from('leads')
        .select(
          'id, contact_id, source_id, stage_id, status, title, value_cents, temperature, next_action_at, last_contact_at, closed_at',
        )
        .eq('org_id', orgId)
        .or(`status.eq.open,closed_at.gte.${windowStartIso}`)
        .order('id')
        .range(from, to),
    ),
    listLostReasonSuggestions(),
  ])

  if (stagesResult.error) {
    throw new Error(`Falha ao carregar estágios do pipeline: ${stagesResult.error.message}`)
  }

  const stages: BoardStage[] = stagesResult.data.map((s) => ({
    id: s.id,
    key: s.key,
    label: s.label,
    position: s.position,
    probability: s.probability,
    isWon: s.is_won,
    isLost: s.is_lost,
  }))

  const closedStages = stages.filter((s) => s.isWon || s.isLost)
  const contactIds = [...new Set(leadsRows.map((l) => l.contact_id))]
  const sourceIds = [...new Set(leadsRows.map((l) => l.source_id).filter((id): id is string => id !== null))]

  const [contactsResult, sourcesResult, audits, hiddenCountEntries] = await Promise.all([
    contactIds.length > 0
      ? supabase.from('contacts').select('id, full_name, company_name, phone').eq('org_id', orgId).in('id', contactIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; company_name: string | null; phone: string | null }[], error: null }),
    sourceIds.length > 0
      ? supabase.from('lead_sources').select('id, name').eq('org_id', orgId).in('id', sourceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    fetchAll('lead_digital_audits', (from, to) =>
      supabase
        .from('lead_digital_audits')
        .select('lead_id, digital_score')
        .eq('org_id', orgId)
        .order('researched_at', { ascending: false })
        .order('id')
        .range(from, to),
    ),
    Promise.all(
      closedStages.map(async (stage) => {
        const { count, error } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('stage_id', stage.id)
          .lt('closed_at', windowStartIso)
        if (error) {
          throw new Error(`Falha ao contar leads fechados fora da janela (${stage.key}): ${error.message}`)
        }
        return [stage.id, count ?? 0] as const
      }),
    ),
  ])

  if (contactsResult.error || sourcesResult.error) {
    throw new Error('Falha ao carregar dados relacionados do pipeline.')
  }

  const contactById = new Map(contactsResult.data.map((c) => [c.id, c]))
  const sourceNameById = new Map(sourcesResult.data.map((s) => [s.id, s.name]))

  const scoreByLead = new Map<string, number | null>()
  for (const audit of audits) {
    if (!scoreByLead.has(audit.lead_id)) scoreByLead.set(audit.lead_id, audit.digital_score)
  }

  const leads: BoardLead[] = leadsRows.map((row) => {
    const contact = contactById.get(row.contact_id)
    if (!contact) {
      throw new Error(`Lead ${row.id} referencia contato fora da organização atual.`)
    }

    return {
      id: row.id,
      stageId: row.stage_id,
      status: row.status,
      title: row.title,
      companyName: contact.company_name ?? contact.full_name,
      contactFirstName: contact.full_name.trim().split(/\s+/)[0] ?? contact.full_name,
      contactPhone: contact.phone,
      valueCents: row.value_cents,
      temperature: row.temperature,
      nextActionAt: row.next_action_at,
      lastContactAt: row.last_contact_at,
      closedAt: row.closed_at,
      sourceName: row.source_id ? (sourceNameById.get(row.source_id) ?? null) : null,
      digitalScore: scoreByLead.get(row.id) ?? null,
    }
  })

  return { stages, leads, hiddenCountByStageId: Object.fromEntries(hiddenCountEntries), lostReasonSuggestions }
}

async function fetchAll<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Falha ao carregar ${label} para o pipeline: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
