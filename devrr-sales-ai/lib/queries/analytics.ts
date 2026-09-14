import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import type { AnalyticsLead, AnalyticsStage } from '@/lib/domain/analytics'

export interface AnalyticsData {
  leads: AnalyticsLead[]
  stages: AnalyticsStage[]
}

const PAGE_SIZE = 1000

/**
 * Carrega o necessário para `/analytics` numa leva: leads + estágios + fontes
 * + cidade do contato + tipos de atividade concluída + score do dossiê mais
 * recente. Mesmo padrão de `leads.ts` (queries simples por `org_id`, sem
 * embedded select). Paginado porque o PostgREST corta em 1000 linhas e
 * atividades passam disso rápido.
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const [leads, stages, sources, contacts, activities, audits] = await Promise.all([
    fetchAll('leads', (from, to) =>
      supabase
        .from('leads')
        .select('id, contact_id, stage_id, source_id, status, value_cents, interest, created_at, closed_at, responded_at, lost_reason')
        .eq('org_id', orgId)
        .order('id')
        .range(from, to),
    ),
    supabase.from('pipeline_stages').select('id, key, label, position, is_won, is_lost').eq('org_id', orgId).order('position'),
    supabase.from('lead_sources').select('id, name').eq('org_id', orgId),
    fetchAll('contacts', (from, to) =>
      supabase.from('contacts').select('id, city').eq('org_id', orgId).order('id').range(from, to),
    ),
    fetchAll('activities', (from, to) =>
      supabase.from('activities').select('lead_id, type').eq('org_id', orgId).eq('status', 'done').order('id').range(from, to),
    ),
    fetchAll('lead_digital_audits', (from, to) =>
      supabase
        .from('lead_digital_audits')
        .select('lead_id, digital_score, researched_at')
        .eq('org_id', orgId)
        .order('researched_at', { ascending: false })
        .order('id')
        .range(from, to),
    ),
  ])

  if (stages.error || sources.error) {
    throw new Error('Falha ao carregar estágios ou fontes para analytics.')
  }

  const stageKeyById = new Map(stages.data.map((s) => [s.id, s.key]))
  const sourceNameById = new Map(sources.data.map((s) => [s.id, s.name]))
  const cityByContact = new Map(contacts.map((c) => [c.id, c.city]))

  const typesByLead = new Map<string, string[]>()
  for (const activity of activities) {
    typesByLead.set(activity.lead_id, [...(typesByLead.get(activity.lead_id) ?? []), activity.type])
  }

  // Ordenado por researched_at desc: a primeira ocorrência de cada lead é o dossiê atual (D-035).
  const scoreByLead = new Map<string, number | null>()
  for (const audit of audits) {
    if (!scoreByLead.has(audit.lead_id)) scoreByLead.set(audit.lead_id, audit.digital_score)
  }

  return {
    stages: stages.data.map((s) => ({ key: s.key, label: s.label, position: s.position, isWon: s.is_won, isLost: s.is_lost })),
    leads: leads.map((l) => ({
      stageKey: stageKeyById.get(l.stage_id) ?? '',
      status: l.status,
      valueCents: l.value_cents,
      source: l.source_id ? (sourceNameById.get(l.source_id) ?? null) : null,
      interest: l.interest,
      city: cityByContact.get(l.contact_id) ?? null,
      createdAt: l.created_at,
      closedAt: l.closed_at,
      respondedAt: l.responded_at,
      lostReason: l.lost_reason,
      doneActivityTypes: typesByLead.get(l.id) ?? [],
      digitalScore: scoreByLead.get(l.id) ?? null,
    })),
  }
}

async function fetchAll<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Falha ao carregar ${label} para analytics: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
