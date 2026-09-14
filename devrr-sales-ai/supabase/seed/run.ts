import './load-env'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/types/database.types'
import { createSeedClient } from './client'
import {
  buildDemoDataset,
  DEMO_ORG,
  DEMO_SOURCE_NAMES,
  DEMO_STAGE_KEYS,
  PROSPECTING_SOURCE,
  type DemoSourceName,
  type DemoStageKey,
} from './demo-data'

type SeedClient = SupabaseClient<Database, 'sales'>

const INSERT_CHUNK = 200

/**
 * `npm run seed:demo` — cria (ou recarrega) a organização de demonstração
 * `devrr-demo` com o funil comercial simulado da DevRR: ~100 empresas de
 * Uberlândia/Patrocínio prospectadas + clientes reais fechados, atividades
 * com datas realistas e dossiês digitais dos leads de prospecção ativa.
 * Contacts/leads/activities com `is_demo = true`; os dossiês saem junto por
 * cascata de `leads`. Idempotente: cada execução apaga o dado demo anterior
 * da org e insere de novo. Ver docs/IMPLEMENTATION_PLAN.md → 6.1.
 *
 * Só mexe em `is_demo = true`. Nunca toca dado real.
 */
async function main(): Promise<void> {
  const db = createSeedClient()
  const now = new Date()

  const orgId = await ensureDemoOrg(db)
  console.log(`Organização de demonstração: ${DEMO_ORG.slug} (${orgId})`)

  await linkOwnerIfRequested(db, orgId)

  const stageIdByKey = await loadStageIds(db, orgId)
  const sourceIdByName = await loadSourceIds(db, orgId)
  const followupRuleIdByStep = await loadFollowupRuleIds(db, orgId, stageIdByKey.proposta_enviada)
  await clearDemoData(db, orgId)

  const dataset = buildDemoDataset({ now, newId: randomUUID, stageIdByKey, sourceIdByName, followupRuleIdByStep })

  await insertChunked(db, 'contacts', dataset.contacts.map((row) => ({ ...row, org_id: orgId, is_demo: true })))
  await insertChunked(
    db,
    'leads',
    dataset.leads.map(({ stageKey: _stageKey, companyName: _companyName, ...row }) => ({ ...row, org_id: orgId, is_demo: true })),
  )
  await insertChunked(db, 'activities', dataset.activities.map((row) => ({ ...row, org_id: orgId, is_demo: true })))
  await insertChunked(db, 'lead_digital_audits', dataset.audits.map((row) => ({ ...row, org_id: orgId })))

  console.log(
    `Inserido: ${dataset.contacts.length} contatos, ${dataset.leads.length} leads, ${dataset.activities.length} atividades, ${dataset.audits.length} dossiês.`,
  )
  console.log('Seed de demonstração concluído.')
}

/** Cria a org demo se não existir. `create_organization` não serve aqui (precisa de `auth.uid()`) — insert direto via service role + `seed_org_defaults` para os catálogos/regras/prompt. */
async function ensureDemoOrg(db: SeedClient): Promise<string> {
  const existing = await db.from('organizations').select('id').eq('slug', DEMO_ORG.slug).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data.id

  const created = await db
    .from('organizations')
    .insert({ name: DEMO_ORG.name, slug: DEMO_ORG.slug })
    .select('id')
    .single()
  if (created.error) throw created.error

  const seeded = await db.rpc('seed_org_defaults', { p_org_id: created.data.id })
  if (seeded.error) throw seeded.error

  return created.data.id
}

/** Vincula um usuário como `owner` da org demo se `SEED_DEMO_OWNER_EMAIL` estiver setado. Sem isso, a org não aparece para ninguém no app (nenhuma `org_members`). */
async function linkOwnerIfRequested(db: SeedClient, orgId: string): Promise<void> {
  const email = process.env.SEED_DEMO_OWNER_EMAIL?.trim().toLowerCase()
  if (!email) {
    console.log(
      'SEED_DEMO_OWNER_EMAIL não definido — a org demo fica sem membro e não aparece no app até alguém ser adicionado.',
    )
    return
  }

  const list = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (list.error) throw list.error
  const user = list.data.users.find((u) => u.email?.toLowerCase() === email)
  if (!user) {
    throw new Error(
      `SEED_DEMO_OWNER_EMAIL=${email} não corresponde a nenhum usuário do projeto. Crie a conta em Authentication → Users e rode de novo.`,
    )
  }

  const linked = await db
    .from('org_members')
    .upsert({ org_id: orgId, user_id: user.id, role: 'owner' }, { onConflict: 'org_id,user_id', ignoreDuplicates: true })
  if (linked.error) throw linked.error
  console.log(`Owner vinculado: ${email} (${user.id}).`)
}

async function loadStageIds(db: SeedClient, orgId: string): Promise<Record<DemoStageKey, string>> {
  const stages = await db.from('pipeline_stages').select('id, key').eq('org_id', orgId)
  if (stages.error) throw stages.error

  const byKey = new Map(stages.data.map((s) => [s.key, s.id]))
  const entries = DEMO_STAGE_KEYS.map((key) => {
    const id = byKey.get(key)
    if (!id) {
      throw new Error(`Estágio "${key}" ausente na org demo — seed_org_defaults não rodou como esperado.`)
    }
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

/** Remove só o dado demo desta org, na ordem de FK. `lead_digital_audits` não tem `is_demo` — sai pela cascata de `leads`. */
async function clearDemoData(db: SeedClient, orgId: string): Promise<void> {
  for (const table of ['activities', 'leads', 'contacts'] as const) {
    const deleted = await db.from(table).delete().eq('org_id', orgId).eq('is_demo', true)
    if (deleted.error) throw deleted.error
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

main().catch((error: unknown) => {
  console.error('Seed de demonstração falhou:', error instanceof Error ? error.message : error)
  process.exit(1)
})
