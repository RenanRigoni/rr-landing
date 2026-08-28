import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser, testAdminClient } from '../helpers/rls-fixtures'
import { createLeadIntakeCore } from '@/lib/actions/lead-intake-core'
import { saveDigitalAuditCore } from '@/lib/actions/digital-audit-core'
import {
  getLatestAuditForLeadCore,
  getAuditByIdCore,
  listAuditsForLeadCore,
  listLatestAuditsByLeadCore,
} from '@/lib/queries/digital-audits-core'

type SalesClient = SupabaseClient<Database, 'sales'>

/**
 * Testa `lib/queries/digital-audits-core.ts` (7.5) contra o Supabase real —
 * mesmo padrão de `tests/actions/digital-audit.test.ts` (D-020/D-030): a
 * core recebe `supabase`/`orgId` prontos, sem `cookies()`. O wrapper
 * `server-only` (`lib/queries/digital-audits.ts`) não tem teste direto pelo
 * mesmo motivo de `lib/queries/leads.ts`/`activities.ts`/`today.ts` nunca
 * terem: `import 'server-only'` lança em qualquer import de Node puro —
 * confirmado lendo `node_modules/server-only/index.js` (o `export default`
 * é só `throw new Error(...)`, sem condição de ambiente fora do bundler do
 * Next).
 */
describe('lib/queries/digital-audits-core', () => {
  let userAId: string
  let userBId: string
  let clientA: SalesClient
  let clientB: SalesClient
  let orgAId: string
  let orgBId: string
  /** Lead com histórico de 3 auditorias (itens 1 e 3 do checklist da 7.5). */
  let leadAId: string
  /** Lead da mesma org A, propositalmente sem nenhuma auditoria (item 7). */
  let leadA2Id: string
  /** Lead da mesma org A com auditoria própria — prova que o histórico de
   * `leadAId` não vaza para cá nem vice-versa (item 4, isolamento entre leads). */
  let leadA3Id: string
  /** Lead dedicado ao teste de desempate determinístico (item 2). */
  let leadTieId: string
  /** Leads dedicados a `listLatestAuditsByLeadCore` (item 8): X com 3
   * auditorias, Y com 2, Z sem nenhuma. */
  let leadXId: string
  let leadYId: string
  let leadZId: string
  /** Lead da org B (isolamento cross-tenant, item 5). */
  let leadBId: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Digital Audits Query Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Digital Audits Query Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    async function newLead(client: SalesClient, orgId: string, userId: string, name: string): Promise<string> {
      const result = await createLeadIntakeCore(client, orgId, userId, { full_name: name, title: `Prospecção ${name}` })
      if (result.status !== 'success' || !result.leadId) {
        throw new Error(`Falha ao criar lead "${name}": ${result.error ?? 'sem leadId'}`)
      }
      return result.leadId
    }

    leadAId = await newLead(clientA, orgAId, userAId, 'Lead Principal A')
    leadA2Id = await newLead(clientA, orgAId, userAId, 'Lead Vazio A')
    leadA3Id = await newLead(clientA, orgAId, userAId, 'Lead Isolamento A')
    leadTieId = await newLead(clientA, orgAId, userAId, 'Lead Desempate A')
    leadXId = await newLead(clientA, orgAId, userAId, 'Lead X (3 auditorias)')
    leadYId = await newLead(clientA, orgAId, userAId, 'Lead Y (2 auditorias)')
    leadZId = await newLead(clientA, orgAId, userAId, 'Lead Z (sem auditoria)')
    leadBId = await newLead(clientB, orgBId, userBId, 'Lead Org B')
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  describe('getLatestAuditForLeadCore', () => {
    it('1 · devolve só a mais recente entre várias auditorias do mesmo lead', async () => {
      const oldest = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        researched_at: '2026-08-01',
        google_notes: 'mais antiga',
      })
      const middle = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        researched_at: '2026-08-15',
        google_notes: 'meio',
      })
      const newest = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        researched_at: '2026-08-27',
        google_notes: 'mais nova',
      })
      expect(oldest.error).toBeNull()
      expect(middle.error).toBeNull()
      expect(newest.error).toBeNull()

      const latest = await getLatestAuditForLeadCore(clientA, orgAId, leadAId)
      expect(latest?.id).toBe(newest.auditId)
      expect(latest?.researched_at).toBe('2026-08-27')
      expect(latest?.google_notes).toBe('mais nova')
    })

    it('7 · lead sem nenhuma auditoria devolve null, sem erro (estado vazio)', async () => {
      const latest = await getLatestAuditForLeadCore(clientA, orgAId, leadA2Id)
      expect(latest).toBeNull()
    })
  })

  describe('2 · ordenação determinística — desempate por id quando researched_at e created_at empatam', () => {
    it('a linha com maior id (ordem lexicográfica, igual à ordenação uuid do Postgres) vence o empate', async () => {
      const admin = testAdminClient()
      const tieDate = '2026-08-20'
      const tieCreatedAt = '2026-08-20T10:00:00.000Z'

      const insert1 = await admin
        .from('lead_digital_audits')
        .insert({ org_id: orgAId, lead_id: leadTieId, researched_at: tieDate, created_at: tieCreatedAt, google_notes: 'linha 1' })
        .select('id')
        .single()
      const insert2 = await admin
        .from('lead_digital_audits')
        .insert({ org_id: orgAId, lead_id: leadTieId, researched_at: tieDate, created_at: tieCreatedAt, google_notes: 'linha 2' })
        .select('id')
        .single()

      if (insert1.error || !insert1.data || insert2.error || !insert2.data) {
        throw new Error('Falha ao preparar linhas empatadas para o teste de desempate.')
      }

      const ids = [insert1.data.id, insert2.data.id]
      const expectedWinnerId = ids[0]! > ids[1]! ? ids[0]! : ids[1]!

      const latest = await getLatestAuditForLeadCore(clientA, orgAId, leadTieId)
      expect(latest?.id).toBe(expectedWinnerId)

      // O mesmo desempate vale para o histórico inteiro: a primeira linha
      // do array é sempre o que getLatestAuditForLeadCore devolve.
      const history = await listAuditsForLeadCore(clientA, orgAId, leadTieId)
      expect(history).toHaveLength(2)
      expect(history[0]?.id).toBe(expectedWinnerId)
    })
  })

  describe('getAuditByIdCore', () => {
    it('6 · uuid válido sem linha correspondente devolve null', async () => {
      const result = await getAuditByIdCore(clientA, orgAId, '00000000-0000-4000-8000-000000000000')
      expect(result).toBeNull()
    })

    it('5 · auditoria de outra organização é indistinguível de uma inexistente', async () => {
      const auditB = await saveDigitalAuditCore(clientB, orgBId, userBId, {
        lead_id: leadBId,
        google_business_profile: 'sim',
      })
      expect(auditB.error).toBeNull()
      if (!auditB.auditId) throw new Error('setup falhou: auditB sem id')

      // Sanidade: a própria org B enxerga a auditoria normalmente.
      const seenByOwner = await getAuditByIdCore(clientB, orgBId, auditB.auditId)
      expect(seenByOwner?.id).toBe(auditB.auditId)

      // Org A, com o id real de uma auditoria de B: null, não erro — mesmo
      // resultado de um uuid que nunca existiu (item 6 acima).
      const seenByOutsider = await getAuditByIdCore(clientA, orgAId, auditB.auditId)
      expect(seenByOutsider).toBeNull()
    })
  })

  describe('listAuditsForLeadCore', () => {
    it('3 · histórico completo do lead, mais recente primeiro', async () => {
      const history = await listAuditsForLeadCore(clientA, orgAId, leadAId)
      // As 3 auditorias do item 1 acima — mesmo lead, mesma org.
      expect(history).toHaveLength(3)
      expect(history.map((audit) => audit.researched_at)).toEqual(['2026-08-27', '2026-08-15', '2026-08-01'])
    })

    it('4 · isolamento entre leads da mesma organização: auditoria de outro lead não aparece', async () => {
      const audit3 = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadA3Id,
        google_business_profile: 'nao',
      })
      expect(audit3.error).toBeNull()

      const historyOfA = await listAuditsForLeadCore(clientA, orgAId, leadAId)
      expect(historyOfA.every((audit) => audit.lead_id === leadAId)).toBe(true)
      expect(historyOfA.some((audit) => audit.id === audit3.auditId)).toBe(false)

      const historyOfA3 = await listAuditsForLeadCore(clientA, orgAId, leadA3Id)
      expect(historyOfA3).toHaveLength(1)
      expect(historyOfA3[0]?.id).toBe(audit3.auditId)
    })

    it('cross-tenant: org A não lê o histórico de um lead de outra org, mesmo sabendo o lead_id', async () => {
      const historyFromOutsider = await listAuditsForLeadCore(clientA, orgAId, leadBId)
      expect(historyFromOutsider).toEqual([])
    })
  })

  describe('listLatestAuditsByLeadCore', () => {
    it('8 · uma auditoria atual por lead aplicável, nenhuma duplicação, lead sem auditoria ausente da Map', async () => {
      const x1 = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadXId, researched_at: '2026-08-01' })
      const x2 = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadXId, researched_at: '2026-08-10' })
      const x3 = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadXId, researched_at: '2026-08-20' })
      const y1 = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadYId, researched_at: '2026-08-05' })
      const y2 = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadYId, researched_at: '2026-08-18' })
      for (const result of [x1, x2, x3, y1, y2]) {
        expect(result.error).toBeNull()
      }

      const latestByLead = await listLatestAuditsByLeadCore(clientA, orgAId, [leadXId, leadYId, leadZId])

      expect(latestByLead.size).toBe(2)
      expect(latestByLead.has(leadZId)).toBe(false)
      expect(latestByLead.get(leadXId)?.id).toBe(x3.auditId)
      expect(latestByLead.get(leadXId)?.researched_at).toBe('2026-08-20')
      expect(latestByLead.get(leadYId)?.id).toBe(y2.auditId)
      expect(latestByLead.get(leadYId)?.researched_at).toBe('2026-08-18')
    })

    it('leadIds vazio devolve Map vazia sem consultar o banco', async () => {
      const fromSpy = vi.spyOn(clientA, 'from')
      const result = await listLatestAuditsByLeadCore(clientA, orgAId, [])
      expect(result.size).toBe(0)
      expect(fromSpy).not.toHaveBeenCalled()
      fromSpy.mockRestore()
    })

    it('9 · uma única query para N leads — não uma consulta por lead (sem N+1)', async () => {
      const fromSpy = vi.spyOn(clientA, 'from')
      await listLatestAuditsByLeadCore(clientA, orgAId, [leadXId, leadYId, leadZId])
      // `.from` é sobrecarregado por tabela nos types gerados — o espião do
      // vitest resolve isso para um único overload, então a comparação
      // precisa passar por `String()` em vez de contar com o literal exato.
      const auditTableCalls = fromSpy.mock.calls.filter((call) => String(call[0]) === 'lead_digital_audits')
      expect(auditTableCalls).toHaveLength(1)
      fromSpy.mockRestore()
    })

    it('cross-tenant: leads de outra organização não entram na Map, mesmo pedidos explicitamente', async () => {
      const auditB = await saveDigitalAuditCore(clientB, orgBId, userBId, { lead_id: leadBId })
      expect(auditB.error).toBeNull()

      const latestByLead = await listLatestAuditsByLeadCore(clientA, orgAId, [leadBId])
      expect(latestByLead.size).toBe(0)
    })
  })
})
