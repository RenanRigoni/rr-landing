import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  TEST_USER_A,
  TEST_USER_B,
  ensureTestUser,
  signInTestClient,
  anonClient,
  cleanupOrgsForUser,
} from './helpers/rls-fixtures'

/**
 * Prova que o isolamento multi-tenant funciona de verdade — não que as
 * policies existem. Roda contra o Supabase real, com dois usuários reais e
 * chave anon (não há mock que prove RLS). Ver README.md → Testes de RLS e
 * docs/IMPLEMENTATION_PLAN.md → 2.4.
 */
describe('RLS — sales.organizations e sales.org_members', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)

    // Baseline limpa: nenhum resíduo de execução anterior da suíte.
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  describe('ausência de organização', () => {
    it('usuário sem org não vê nenhuma organização (0 linhas, não erro)', async () => {
      const { data, error } = await clientA.from('organizations').select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('current_org_ids() retorna vazio para usuário sem organização', async () => {
      const { data, error } = await clientA.rpc('current_org_ids')
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('create_organization() e associação do criador', () => {
    it('cria a org e o criador vira o único membro, como owner', async () => {
      const { data: newOrgId, error } = await clientA.rpc('create_organization', {
        p_name: 'RLS Test Org A',
      })
      expect(error).toBeNull()
      expect(typeof newOrgId).toBe('string')
      orgAId = newOrgId as string

      const { data: members, error: membersError } = await clientA
        .from('org_members')
        .select('user_id, role')
        .eq('org_id', orgAId)

      expect(membersError).toBeNull()
      expect(members).toHaveLength(1)
      expect(members?.[0]).toMatchObject({ user_id: userAId, role: 'owner' })
    })

    it('usuário B cria a própria org, com id diferente da de A', async () => {
      const { data: newOrgId, error } = await clientB.rpc('create_organization', {
        p_name: 'RLS Test Org B',
      })
      expect(error).toBeNull()
      orgBId = newOrgId as string
      expect(orgBId).not.toBe(orgAId)
    })
  })

  describe('usuário A acessa sua própria organização', () => {
    it('A vê a org A na listagem', async () => {
      const { data, error } = await clientA.from('organizations').select('id')
      expect(error).toBeNull()
      expect(data?.map((org) => org.id)).toContain(orgAId)
    })

    it('current_org_role(orgA) para A retorna owner', async () => {
      const { data, error } = await clientA.rpc('current_org_role', { p_org_id: orgAId })
      expect(error).toBeNull()
      expect(data).toBe('owner')
    })
  })

  describe('usuário B não acessa organização A — isolamento', () => {
    it('B não lê a org A (select retorna 0 linhas, não erro)', async () => {
      const { data, error } = await clientB.from('organizations').select('id').eq('id', orgAId)
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('B não vê membership da org A', async () => {
      const { data, error } = await clientB.from('org_members').select('id').eq('org_id', orgAId)
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('current_org_role(orgA) para B retorna null — não vaza papel de org alheia', async () => {
      const { data, error } = await clientB.rpc('current_org_role', { p_org_id: orgAId })
      expect(error).toBeNull()
      expect(data).toBeNull()
    })

    it('current_org_ids() de B não inclui a org A', async () => {
      const { data, error } = await clientB.rpc('current_org_ids')
      expect(error).toBeNull()
      expect(data).not.toContain(orgAId)
    })
  })

  describe('usuário B não consegue se adicionar à organização A', () => {
    it('insert direto de B como membro da org A é bloqueado pela policy', async () => {
      const { error } = await clientB
        .from('org_members')
        .insert({ org_id: orgAId, user_id: userBId, role: 'admin' })

      expect(error).not.toBeNull()

      const { data: check } = await clientA
        .from('org_members')
        .select('id')
        .eq('org_id', orgAId)
        .eq('user_id', userBId)
      expect(check).toEqual([])
    })
  })

  describe('A não consegue inserir com org_id da org B', () => {
    it('insert de A visando a org B é bloqueado', async () => {
      const { error } = await clientA
        .from('org_members')
        .insert({ org_id: orgBId, user_id: userAId, role: 'admin' })

      expect(error).not.toBeNull()
    })
  })

  describe('owner adiciona membro real; owner/admin e member respeitam as permissões', () => {
    it('A (owner da org A) consegue adicionar B como member', async () => {
      const { error } = await clientA
        .from('org_members')
        .insert({ org_id: orgAId, user_id: userBId, role: 'member' })

      expect(error).toBeNull()
    })

    it('B (agora membro real da org A) enxerga a org A na listagem — leitura é por associação, não só para owner/admin', async () => {
      const { data, error } = await clientB.from('organizations').select('id').eq('id', orgAId)
      expect(error).toBeNull()
      expect(data?.map((org) => org.id)).toContain(orgAId)
    })

    it('current_org_ids() de B agora inclui a org A', async () => {
      const { data, error } = await clientB.rpc('current_org_ids')
      expect(error).toBeNull()
      expect(data).toContain(orgAId)
    })

    it('current_org_role(orgA) para B retorna member — não owner nem admin', async () => {
      const { data, error } = await clientB.rpc('current_org_role', { p_org_id: orgAId })
      expect(error).toBeNull()
      expect(data).toBe('member')
    })

    it('B (member) vê a lista de membros da org A — select é por associação', async () => {
      const { data, error } = await clientB.from('org_members').select('id').eq('org_id', orgAId)
      expect(error).toBeNull()
      expect(data?.length).toBe(2)
    })

    it('B (member) não consegue alterar o próprio papel para admin', async () => {
      const { data: ownRow } = await clientB
        .from('org_members')
        .select('id')
        .eq('org_id', orgAId)
        .eq('user_id', userBId)
        .maybeSingle()
      expect(ownRow).not.toBeNull()

      // RLS bloqueia aqui via USING (a linha nem é elegível pro update para
      // quem não é owner/admin), não via WITH CHECK — o Postgres não trata
      // isso como erro de policy, só filtra a linha do conjunto afetado:
      // update "bem-sucedido" de 0 linhas, sem exceção. Sem o `.select()`
      // encadeado esse teste passaria por engano mesmo se a policy caísse,
      // porque `error` sempre vem `null` nesse caminho — é o `data`
      // (0 linhas retornadas) que prova o bloqueio. Diferente do caso
      // "org_id para a org B" abaixo, onde é o WITH CHECK que falha e aí sim
      // o Postgres levanta erro real.
      const { data: updated, error } = await clientB
        .from('org_members')
        .update({ role: 'admin' })
        .eq('id', ownRow!.id)
        .select()

      expect(error).toBeNull()
      expect(updated).toEqual([])

      const { data: afterAttempt } = await clientA
        .from('org_members')
        .select('role')
        .eq('id', ownRow!.id)
        .single()
      expect(afterAttempt?.role).toBe('member')
    })

    it('B (member) não consegue apagar a própria membership', async () => {
      const { data: ownRow } = await clientB
        .from('org_members')
        .select('id')
        .eq('org_id', orgAId)
        .eq('user_id', userBId)
        .single()

      // Mesmo motivo do teste acima: DELETE sob RLS que falha na USING não
      // é erro, é "0 linhas afetadas" — só o `.select()` encadeado revela.
      const { data: deleted, error } = await clientB
        .from('org_members')
        .delete()
        .eq('id', ownRow!.id)
        .select()

      expect(error).toBeNull()
      expect(deleted).toEqual([])

      const { data: stillThere } = await clientA
        .from('org_members')
        .select('id')
        .eq('id', ownRow!.id)
        .maybeSingle()
      expect(stillThere).not.toBeNull()
    })
  })

  describe('A não consegue alterar org_id de um registro seu para a org B', () => {
    it('A tenta mover a própria membership da org A para a org B — bloqueado', async () => {
      const { data: ownRow } = await clientA
        .from('org_members')
        .select('id')
        .eq('org_id', orgAId)
        .eq('user_id', userAId)
        .single()

      const { error } = await clientA.from('org_members').update({ org_id: orgBId }).eq('id', ownRow!.id)
      expect(error).not.toBeNull()

      const { data: afterAttempt } = await clientA
        .from('org_members')
        .select('org_id')
        .eq('id', ownRow!.id)
        .single()
      expect(afterAttempt?.org_id).toBe(orgAId)
    })
  })

  describe('usuário anônimo não lê nada', () => {
    it('anon não consegue ler organizations', async () => {
      const client = anonClient()
      const { data, error } = await client.from('organizations').select('id')
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    it('anon não consegue ler org_members', async () => {
      const client = anonClient()
      const { data, error } = await client.from('org_members').select('id')
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    it('anon não consegue chamar current_org_ids()', async () => {
      const client = anonClient()
      const { error } = await client.rpc('current_org_ids')
      expect(error).not.toBeNull()
    })

    it('anon não consegue chamar create_organization()', async () => {
      const client = anonClient()
      const { error } = await client.rpc('create_organization', { p_name: 'Org de anon, não deveria existir' })
      expect(error).not.toBeNull()
    })

    it('anon não consegue chamar current_org_role()', async () => {
      const client = anonClient()
      const { error } = await client.rpc('current_org_role', { p_org_id: orgAId })
      expect(error).not.toBeNull()
    })
  })
})

/**
 * Fase 2.5 — Achado A do checkpoint Opus da Fase 2 (D-017): a policy
 * `tenant_isolation` "for all" original de `organizations` dava a qualquer
 * membro (inclusive `member`) poder de UPDATE/DELETE sobre a organização.
 * `supabase/migrations/0003_organizations_role_policies.sql` corrige para
 * `select` por associação, `update` owner/admin, `delete` só owner.
 *
 * Describe própria, com sua própria org (`orgRoleId`) e seus próprios
 * usuários — não reaproveita `orgAId`/`orgBId` do describe acima para não
 * acoplar a ordem dos dois blocos: aqui o usuário B começa `member`, é
 * promovido a `admin` no meio da suíte, e o estado precisa ser previsível
 * independente do describe anterior já ter mudado o papel de B em outra
 * organização.
 */
describe('RLS — sales.organizations por papel (D-017 / migration 0003)', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgRoleId: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: newOrgId, error } = await clientA.rpc('create_organization', {
      p_name: 'RLS Role Test Org',
    })
    if (error || !newOrgId) {
      throw new Error(`Falha ao criar organização de teste: ${error?.message}`)
    }
    orgRoleId = newOrgId

    const { error: addMemberError } = await clientA
      .from('org_members')
      .insert({ org_id: orgRoleId, user_id: userBId, role: 'member' })
    if (addMemberError) {
      throw new Error(`Falha ao adicionar B como member: ${addMemberError.message}`)
    }
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  describe('member', () => {
    it('member consegue SELECT da organização', async () => {
      const { data, error } = await clientB.from('organizations').select('id').eq('id', orgRoleId)
      expect(error).toBeNull()
      expect(data?.map((org) => org.id)).toContain(orgRoleId)
    })

    it('member NÃO consegue UPDATE (bloqueado por USING — 0 linhas, não erro, D-016)', async () => {
      const { data, error } = await clientB
        .from('organizations')
        .update({ name: 'Renomeado por member' })
        .eq('id', orgRoleId)
        .select()

      expect(error).toBeNull()
      expect(data).toEqual([])

      const { data: afterAttempt } = await clientA.from('organizations').select('name').eq('id', orgRoleId).single()
      expect(afterAttempt?.name).toBe('RLS Role Test Org')
    })

    it('member NÃO consegue DELETE (bloqueado por USING — 0 linhas, não erro, D-016)', async () => {
      const { data, error } = await clientB.from('organizations').delete().eq('id', orgRoleId).select()

      expect(error).toBeNull()
      expect(data).toEqual([])

      const { data: stillThere } = await clientA.from('organizations').select('id').eq('id', orgRoleId).maybeSingle()
      expect(stillThere).not.toBeNull()
    })
  })

  describe('admin', () => {
    it('setup: owner promove B de member para admin', async () => {
      const { data: updated, error } = await clientA
        .from('org_members')
        .update({ role: 'admin' })
        .eq('org_id', orgRoleId)
        .eq('user_id', userBId)
        .select()

      expect(error).toBeNull()
      expect(updated?.[0]?.role).toBe('admin')
    })

    it('admin consegue UPDATE', async () => {
      const { data, error } = await clientB
        .from('organizations')
        .update({ name: 'Renomeado por admin' })
        .eq('id', orgRoleId)
        .select()

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0]?.name).toBe('Renomeado por admin')
    })

    it('admin NÃO consegue DELETE (bloqueado por USING — 0 linhas, não erro, D-016)', async () => {
      const { data, error } = await clientB.from('organizations').delete().eq('id', orgRoleId).select()

      expect(error).toBeNull()
      expect(data).toEqual([])

      const { data: stillThere } = await clientA.from('organizations').select('id').eq('id', orgRoleId).maybeSingle()
      expect(stillThere).not.toBeNull()
    })
  })

  describe('owner', () => {
    it('owner consegue UPDATE', async () => {
      const { data, error } = await clientA
        .from('organizations')
        .update({ name: 'Renomeado por owner' })
        .eq('id', orgRoleId)
        .select()

      expect(error).toBeNull()
      expect(data?.[0]?.name).toBe('Renomeado por owner')
    })

    it('owner consegue DELETE — usa organização própria e descartável, não orgRoleId', async () => {
      const { data: newOrgId, error: createError } = await clientA.rpc('create_organization', {
        p_name: 'RLS Delete Test Org',
      })
      expect(createError).toBeNull()
      const disposableOrgId = newOrgId as string

      const { data: deleted, error } = await clientA.from('organizations').delete().eq('id', disposableOrgId).select()

      expect(error).toBeNull()
      expect(deleted).toHaveLength(1)

      const { data: goneCheck } = await clientA.from('organizations').select('id').eq('id', disposableOrgId).maybeSingle()
      expect(goneCheck).toBeNull()
    })
  })

  describe('não-membro', () => {
    it('usuário sem associação não consegue UPDATE org alheia (bloqueado por USING, D-016)', async () => {
      // B não é membro de nenhuma organização própria de A que não seja
      // orgRoleId — cria uma org só de A, sem B, para este caso.
      const { data: newOrgId } = await clientA.rpc('create_organization', { p_name: 'RLS Non-Member Org' })
      const soloOrgId = newOrgId as string

      const { data, error } = await clientB
        .from('organizations')
        .update({ name: 'Renomeado por não-membro' })
        .eq('id', soloOrgId)
        .select()

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('usuário sem associação não consegue DELETE org alheia (bloqueado por USING, D-016)', async () => {
      const { data: newOrgId } = await clientA.rpc('create_organization', { p_name: 'RLS Non-Member Org 2' })
      const soloOrgId = newOrgId as string

      const { data, error } = await clientB.from('organizations').delete().eq('id', soloOrgId).select()

      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('insert direto', () => {
    it('insert direto em organizations é negado — não existe policy de insert, criação é só pela RPC', async () => {
      const { error } = await clientA.from('organizations').insert({ name: 'Insert Direto', slug: 'insert-direto-2-5' })
      expect(error).not.toBeNull()
    })
  })
})
