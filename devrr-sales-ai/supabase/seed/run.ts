import './load-env'
import { createSeedClient } from './client'
import { DEMO_ORG } from './demo-data'
import { findDemoOrgId, reloadDemoOrgData, type SeedClient } from './reload-demo'

/**
 * `npm run seed:demo` — cria (se preciso) e recarrega a organização de
 * demonstração `devrr-demo` com o funil comercial simulado da DevRR: ~100
 * empresas de Uberlândia/Patrocínio prospectadas + clientes reais fechados,
 * atividades com datas realistas e dossiês digitais dos leads de prospecção
 * ativa (recarga em `reload-demo.ts`). Ver docs/IMPLEMENTATION_PLAN.md → 6.1.
 *
 * Nunca toca dado de outra organização.
 */
async function main(): Promise<void> {
  const db = createSeedClient()

  const orgId = await ensureDemoOrg(db)
  console.log(`Organização de demonstração: ${DEMO_ORG.slug} (${orgId})`)

  await linkOwnerIfRequested(db, orgId)

  const result = await reloadDemoOrgData(db, orgId, new Date())
  console.log(
    `Inserido: ${result.contacts} contatos, ${result.leads} leads, ${result.activities} atividades, ${result.audits} dossiês.`,
  )
  console.log('Seed de demonstração concluído.')
}

/** Cria a org demo se não existir. `create_organization` não serve aqui (precisa de `auth.uid()`) — insert direto via service role + `seed_org_defaults` para os catálogos/regras/prompt. */
async function ensureDemoOrg(db: SeedClient): Promise<string> {
  const existing = await findDemoOrgId(db)
  if (existing) return existing

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

/** Vincula um usuário como `owner` da org demo se `SEED_DEMO_OWNER_EMAIL` estiver setado. O usuário de demo `member` é vinculado à parte. */
async function linkOwnerIfRequested(db: SeedClient, orgId: string): Promise<void> {
  const email = process.env.SEED_DEMO_OWNER_EMAIL?.trim().toLowerCase()
  if (!email) return

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

main().catch((error: unknown) => {
  console.error('Seed de demonstração falhou:', error instanceof Error ? error.message : error)
  process.exit(1)
})
