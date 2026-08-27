import './load-env'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/types/database.types'
import { resolveNextAction } from '../../lib/domain/followup'
import { createSeedClient } from './client'
import {
  buildDemoActivities,
  buildDemoContacts,
  buildDemoLeads,
  DEMO_CONTACT_COUNT,
  DEMO_LEAD_COUNT,
  DEMO_ORG,
  DEMO_STAGE_KEYS,
  type DemoStageKey,
} from './demo-data'

type SeedClient = SupabaseClient<Database, 'sales'>

/**
 * `npm run seed:demo` — cria (ou recarrega) a organização de demonstração
 * `devrr-demo` com 12 contatos, 18 leads espalhados pelos estágios e
 * atividades com datas realistas (atrasadas, de hoje, futuras e histórico).
 * Tudo com `is_demo = true`. Idempotente: cada execução apaga o dado demo
 * anterior da org e insere de novo. Ver docs/IMPLEMENTATION_PLAN.md → 6.1.
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
  await clearDemoData(db, orgId)

  const contactIds = Array.from({ length: DEMO_CONTACT_COUNT }, () => randomUUID())
  const leadIds = Array.from({ length: DEMO_LEAD_COUNT }, () => randomUUID())

  const contacts = buildDemoContacts(contactIds).map((row) => ({
    ...row,
    org_id: orgId,
    is_demo: true,
  }))
  const insertContacts = await db.from('contacts').insert(contacts)
  if (insertContacts.error) throw insertContacts.error

  const leads = buildDemoLeads({ ids: leadIds, contactIds, stageIdByKey, now })
  const insertLeads = await db.from('leads').insert(
    leads.map((row) => ({
      id: row.id,
      org_id: orgId,
      is_demo: true,
      contact_id: row.contact_id,
      title: row.title,
      interest: row.interest,
      stage_id: row.stage_id,
      status: row.status,
      temperature: row.temperature,
      value_cents: row.value_cents,
      currency: row.currency,
      last_contact_at: row.last_contact_at,
      closed_at: row.closed_at,
    })),
  )
  if (insertLeads.error) throw insertLeads.error

  const activities = buildDemoActivities({
    leads: leads.map((lead) => ({
      id: lead.id,
      contactId: lead.contact_id,
      status: lead.status,
      stageKey: lead.stageKey,
    })),
    now,
  })
  const insertActivities = await db
    .from('activities')
    .insert(activities.map((row) => ({ ...row, org_id: orgId, is_demo: true })))
  if (insertActivities.error) throw insertActivities.error

  await refreshNextActionCache(db, orgId, leads, activities)

  console.log(
    `Inserido: ${contacts.length} contatos, ${leads.length} leads, ${activities.length} atividades.`,
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

/** Remove só o dado demo desta org, na ordem de FK (as cascatas cobririam, mas explícito deixa claro que nada além de `is_demo` é tocado). */
async function clearDemoData(db: SeedClient, orgId: string): Promise<void> {
  for (const table of ['activities', 'leads', 'contacts'] as const) {
    const deleted = await db.from(table).delete().eq('org_id', orgId).eq('is_demo', true)
    if (deleted.error) throw deleted.error
  }
}

/** `leads.next_action_at` é cache mantido pela aplicação (D-006). No seed, recalcula com o mesmo helper de domínio a partir das atividades pendentes. */
async function refreshNextActionCache(
  db: SeedClient,
  orgId: string,
  leads: ReadonlyArray<{ id: string }>,
  activities: ReadonlyArray<{ lead_id: string; status: 'pending' | 'done' | 'cancelled'; due_at: string | null }>,
): Promise<void> {
  for (const lead of leads) {
    const next = resolveNextAction(activities.filter((a) => a.lead_id === lead.id))
    const updated = await db
      .from('leads')
      .update({ next_action_at: next ? next.toISOString() : null })
      .eq('org_id', orgId)
      .eq('id', lead.id)
    if (updated.error) throw updated.error
  }
}

main().catch((error: unknown) => {
  console.error('Seed de demonstração falhou:', error instanceof Error ? error.message : error)
  process.exit(1)
})
