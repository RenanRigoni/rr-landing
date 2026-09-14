import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/types/database.types'
import {
  buildDemoDataset,
  DEMO_ORG_SLUG,
  DEMO_SOURCE_NAMES,
  DEMO_STAGE_KEYS,
  PROSPECTING_SOURCE,
  type DemoSourceName,
  type DemoStageKey,
} from './demo-data'

/**
 * Núcleo de recarga da org de demonstração usado por `npm run seed:demo`
 * (`run.ts`). Sem I/O de ambiente: recebe o client de service role já
 * construído.
 *
 * A org `devrr-demo` é exclusivamente de demonstração, e o que é criado nela
 * pelo app nasce com `is_demo = false`. Por isso a recarga apaga TODO dado
 * transacional **desta org** (não só `is_demo`), e só depois de confirmar pelo
 * slug que o `orgId` é mesmo a org demo. `seed:purge` continua restrito a
 * `is_demo`.
 */

export type SeedClient = SupabaseClient<Database, 'sales'>

export interface ReloadDemoResult {
  contacts: number
  leads: number
  activities: number
  audits: number
}

const INSERT_CHUNK = 200

export async function reloadDemoOrgData(db: SeedClient, orgId: string, now: Date): Promise<ReloadDemoResult> {
  await assertIsDemoOrg(db, orgId)

  const stageIdByKey = await loadStageIds(db, orgId)
  const sourceIdByName = await loadSourceIds(db, orgId)
  const followupRuleIdByStep = await loadFollowupRuleIds(db, orgId, stageIdByKey.proposta_enviada)
  await clearDemoOrgData(db, orgId)

  const dataset = buildDemoDataset({ now, newId: randomUUID, stageIdByKey, sourceIdByName, followupRuleIdByStep })

  await insertChunked(db, 'contacts', dataset.contacts.map((row) => ({ ...row, org_id: orgId, is_demo: true })))
  await insertChunked(
    db,
    'leads',
    dataset.leads.map(({ stageKey: _stageKey, companyName: _companyName, ...row }) => ({ ...row, org_id: orgId, is_demo: true })),
  )
  await insertChunked(db, 'activities', dataset.activities.map((row) => ({ ...row, org_id: orgId, is_demo: true })))
  await insertChunked(db, 'lead_digital_audits', dataset.audits.map((row) => ({ ...row, org_id: orgId })))

  return {
    contacts: dataset.contacts.length,
    leads: dataset.leads.length,
    activities: dataset.activities.length,
    audits: dataset.audits.length,
  }
}

/** Id da org demo, ou `null` se ainda não foi criada. */
export async function findDemoOrgId(db: SeedClient): Promise<string | null> {
  const found = await db.from('organizations').select('id').eq('slug', DEMO_ORG_SLUG).maybeSingle()
  if (found.error) throw found.error
  return found.data?.id ?? null
}

async function assertIsDemoOrg(db: SeedClient, orgId: string): Promise<void> {
  const org = await db.from('organizations').select('slug').eq('id', orgId).single()
  if (org.error) throw org.error
  if (org.data.slug !== DEMO_ORG_SLUG) {
    throw new Error('Recarga de demonstração recusada: a organização não é a org demo.')
  }
}

async function loadStageIds(db: SeedClient, orgId: string): Promise<Record<DemoStageKey, string>> {
  const stages = await db.from('pipeline_stages').select('id, key').eq('org_id', orgId)
  if (stages.error) throw stages.error

  const byKey = new Map(stages.data.map((s) => [s.key, s.id]))
  const entries = DEMO_STAGE_KEYS.map((key) => {
    const id = byKey.get(key)
    if (!id) throw new Error(`Estágio "${key}" ausente na org demo — seed_org_defaults não rodou como esperado.`)
    return [key, id] as const
  })
  return Object.fromEntries(entries) as Record<DemoStageKey, string>
}

/** Fontes padrão vêm de `seed_org_defaults`; "Prospecção ativa" é catálogo extra só da org demo (upsert idempotente). */
async function loadSourceIds(db: SeedClient, orgId: string): Promise<Record<DemoSourceName, string>> {
  const upserted = await db
    .from('lead_sources')
    .upsert({ org_id: orgId, name: PROSPECTING_SOURCE, position: 6 }, { onConflict: 'org_id,name', ignoreDuplicates: true })
  if (upserted.error) throw upserted.error

  const sources = await db.from('lead_sources').select('id, name').eq('org_id', orgId)
  if (sources.error) throw sources.error

  const byName = new Map(sources.data.map((s) => [s.name, s.id]))
  const entries = DEMO_SOURCE_NAMES.map((name) => {
    const id = byName.get(name)
    if (!id) throw new Error(`Fonte "${name}" ausente na org demo.`)
    return [name, id] as const
  })
  return Object.fromEntries(entries) as Record<DemoSourceName, string>
}

async function loadFollowupRuleIds(db: SeedClient, orgId: string, propostaStageId: string): Promise<Record<1 | 2 | 3, string>> {
  const rules = await db
    .from('followup_rules')
    .select('id, step_number')
    .eq('org_id', orgId)
    .eq('trigger_stage_id', propostaStageId)
  if (rules.error) throw rules.error

  const byStep = new Map(rules.data.map((r) => [r.step_number, r.id]))
  const entries = ([1, 2, 3] as const).map((step) => {
    const id = byStep.get(step)
    if (!id) throw new Error(`Regra de follow-up passo ${step} ausente na org demo.`)
    return [step, id] as const
  })
  return Object.fromEntries(entries) as Record<1 | 2 | 3, string>
}

/**
 * Apaga todo dado transacional da org demo, na ordem de FK: `ai_runs` depois de
 * `activities` (que aponta para ela via `ai_run_id`) e antes de `contacts`
 * (FK `contact_id` sem cascata).
 * `lead_digital_audits` sai pela cascata de `leads`.
 */
async function clearDemoOrgData(db: SeedClient, orgId: string): Promise<void> {
  for (const table of ['activities', 'ai_runs', 'leads', 'contacts'] as const) {
    const deleted = await db.from(table).delete().eq('org_id', orgId)
    if (deleted.error) throw new Error(`Limpeza de ${table} falhou: ${deleted.error.message}`)
  }
}

type InsertableTable = 'contacts' | 'leads' | 'activities' | 'lead_digital_audits'

async function insertChunked<T extends InsertableTable>(
  db: SeedClient,
  table: T,
  rows: ReadonlyArray<Database['sales']['Tables'][T]['Insert']>,
): Promise<void> {
  for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
    const inserted = await db.from(table).insert(rows.slice(start, start + INSERT_CHUNK) as never)
    if (inserted.error) throw new Error(`Insert em ${table} falhou: ${inserted.error.message}`)
  }
}
