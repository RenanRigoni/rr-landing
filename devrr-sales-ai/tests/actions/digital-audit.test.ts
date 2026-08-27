import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { stubTableError } from '../helpers/stub-client'
import { createLeadIntakeCore } from '@/lib/actions/lead-intake-core'
import { saveDigitalAuditCore } from '@/lib/actions/digital-audit-core'
import { computeDigitalScore, type DigitalAuditFields } from '@/lib/domain/digital-score'

type SalesClient = SupabaseClient<Database, 'sales'>

/**
 * Testa lib/actions/digital-audit-core.ts (7.4) contra o Supabase real, mesmo
 * padrão de tests/actions/lead-intake.test.ts (D-020): a core recebe
 * supabase/orgId/userId prontos, sem cookies(). Cobre tenant/lead cross-tenant,
 * score calculado só no servidor (D-038), 1:N preservado (D-035), conversão de
 * Date, e erro de banco tratado como erro (não como "não encontrado").
 */

function emptyScoreFields(): DigitalAuditFields {
  return {
    google_business_profile: null,
    google_rating: null,
    google_reviews_count: null,
    google_recent_reviews: null,
    google_replies_reviews: null,
    google_has_photos: null,
    google_has_hours: null,
    google_has_phone: null,
    google_has_website: null,
    google_easy_whatsapp: null,
    google_has_booking: null,
    website_exists: null,
    website_https: null,
    website_mobile_friendly: null,
    website_visual_quality: null,
    website_perceived_speed: null,
    website_services_clear: null,
    website_has_target_service_page: null,
    website_has_clear_cta: null,
    website_has_whatsapp: null,
    website_has_contact_form: null,
    website_has_online_booking: null,
    website_phone_visible: null,
    website_has_social_proof: null,
    conversion_clear_contact_path: null,
    conversion_clicks_to_whatsapp: null,
    conversion_cta_above_fold: null,
    conversion_repeated_cta: null,
    conversion_alternative_capture: null,
    conversion_has_friction: null,
    pagespeed_mobile_performance: null,
    pagespeed_mobile_core_web_vitals: null,
    pagespeed_mobile_seo: null,
    pagespeed_mobile_accessibility: null,
    pagespeed_mobile_best_practices: null,
    pagespeed_desktop_performance: null,
    pagespeed_desktop_core_web_vitals: null,
    instagram_exists: null,
    instagram_has_bio_link: null,
    instagram_clear_bio: null,
    instagram_has_cta: null,
    instagram_easy_whatsapp: null,
    instagram_easy_website: null,
    instagram_active: null,
    instagram_visual_quality: null,
    instagram_services_content: null,
  }
}

// Entrada estilo formulário (strings) e o equivalente tipado que alimenta o
// oráculo do score. Os dois têm que descrever a MESMA auditoria.
const RICH_FORM_INPUT: Record<string, string> = {
  website_exists: 'sim',
  google_business_profile: 'sim',
  google_rating: '4.5',
  google_reviews_count: '30',
  google_has_photos: 'sim',
  website_https: 'sim',
  website_mobile_friendly: 'parcialmente',
  conversion_clicks_to_whatsapp: '2',
  pagespeed_mobile_performance: '80',
  pagespeed_mobile_core_web_vitals: 'reprovado',
  instagram_exists: 'sim',
}

const RICH_SCORE_FIELDS: DigitalAuditFields = {
  ...emptyScoreFields(),
  website_exists: 'sim',
  google_business_profile: 'sim',
  google_rating: 4.5,
  google_reviews_count: 30,
  google_has_photos: 'sim',
  website_https: 'sim',
  website_mobile_friendly: 'parcialmente',
  conversion_clicks_to_whatsapp: 2,
  pagespeed_mobile_performance: 80,
  pagespeed_mobile_core_web_vitals: 'reprovado',
  instagram_exists: 'sim',
}

describe('lib/actions/digital-audit-core', () => {
  let userAId: string
  let userBId: string
  let clientA: SalesClient
  let clientB: SalesClient
  let orgAId: string
  let orgBId: string
  let leadAId: string
  let leadBId: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Dossier Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Dossier Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const leadA = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Lead do Dossiê A',
      title: 'Prospecção A',
    })
    if (leadA.status !== 'success' || !leadA.leadId) throw new Error('Falha ao criar lead A')
    leadAId = leadA.leadId

    const leadB = await createLeadIntakeCore(clientB, orgBId, userBId, {
      full_name: 'Lead do Dossiê B',
      title: 'Prospecção B',
    })
    if (leadB.status !== 'success' || !leadB.leadId) throw new Error('Falha ao criar lead B')
    leadBId = leadB.leadId
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  it('1 · criação válida mínima (só lead_id): grava org_id/created_by no servidor', async () => {
    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadAId })
    expect(result.error).toBeNull()
    expect(result.auditId).toBeDefined()

    const { data: row } = await clientA
      .from('lead_digital_audits')
      .select('org_id, lead_id, created_by, digital_score, digital_score_completeness, digital_opportunities')
      .eq('id', result.auditId ?? '')
      .single()

    expect(row?.org_id).toBe(orgAId)
    expect(row?.lead_id).toBe(leadAId)
    expect(row?.created_by).toBe(userAId)
    expect(row?.digital_score).toBeNull()
    expect(row?.digital_score_completeness).toBe(0)
    expect(row?.digital_opportunities).toEqual([])
  })

  it('2 · auditoria parcial: campo informado grava, campo ausente fica null (não avaliado)', async () => {
    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: leadAId,
      google_business_profile: 'sim',
      google_notes: 'apenas o perfil por enquanto',
    })
    expect(result.error).toBeNull()

    const { data: row } = await clientA
      .from('lead_digital_audits')
      .select('google_business_profile, google_notes, website_exists, instagram_exists, google_rating')
      .eq('id', result.auditId ?? '')
      .single()

    expect(row?.google_business_profile).toBe('sim')
    expect(row?.google_notes).toBe('apenas o perfil por enquanto')
    expect(row?.website_exists).toBeNull()
    expect(row?.instagram_exists).toBeNull()
    expect(row?.google_rating).toBeNull()
  })

  it('3 · digital_score/completeness são calculados no servidor via computeDigitalScore', async () => {
    const expected = computeDigitalScore(RICH_SCORE_FIELDS)

    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadAId, ...RICH_FORM_INPUT })
    expect(result.error).toBeNull()
    expect(result.digitalScore).toBe(expected.score)
    expect(result.completeness).toBe(expected.completeness)

    const { data: row } = await clientA
      .from('lead_digital_audits')
      .select('digital_score, digital_score_completeness')
      .eq('id', result.auditId ?? '')
      .single()

    expect(row?.digital_score).toBe(expected.score)
    expect(row?.digital_score_completeness).toBe(expected.completeness)
    expect(expected.score).not.toBeNull()
  })

  it('4 · digital_score enviado pelo cliente é ignorado — vale o calculado', async () => {
    const expected = computeDigitalScore(RICH_SCORE_FIELDS)

    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: leadAId,
      ...RICH_FORM_INPUT,
      digital_score: '999',
      digital_score_completeness: '888',
    })
    expect(result.error).toBeNull()

    const { data: row } = await clientA
      .from('lead_digital_audits')
      .select('digital_score, digital_score_completeness')
      .eq('id', result.auditId ?? '')
      .single()

    expect(row?.digital_score).toBe(expected.score)
    expect(row?.digital_score).not.toBe(999)
    expect(row?.digital_score_completeness).toBe(expected.completeness)
    expect(row?.digital_score_completeness).not.toBe(888)
  })

  it('5 · lead de outra organização é rejeitado e nada é gravado', async () => {
    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadBId })
    expect(result.error).toBe('Lead não encontrado.')

    const { data: rows } = await clientA.from('lead_digital_audits').select('id').eq('lead_id', leadBId)
    expect(rows).toEqual([])
  })

  it('6 · lead inexistente é rejeitado', async () => {
    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: '00000000-0000-4000-8000-000000000000',
    })
    expect(result.error).toBe('Lead não encontrado.')
  })

  it('7 · histórico 1:N: nova auditoria não sobrescreve; update com audit_id altera a mesma linha', async () => {
    const first = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: leadAId,
      researched_at: '2026-08-01',
      google_business_profile: 'sim',
    })
    const second = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: leadAId,
      researched_at: '2026-08-15',
      google_business_profile: 'nao',
    })
    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(first.auditId).not.toBe(second.auditId)

    const countByDate = async () => {
      const { data } = await clientA
        .from('lead_digital_audits')
        .select('id')
        .eq('lead_id', leadAId)
        .in('researched_at', ['2026-08-01', '2026-08-15'])
      return data?.length ?? 0
    }
    expect(await countByDate()).toBe(2)

    const updated = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: leadAId,
      audit_id: first.auditId,
      researched_at: '2026-08-01',
      google_business_profile: 'parcialmente',
    })
    expect(updated.error).toBeNull()
    expect(updated.auditId).toBe(first.auditId)
    expect(await countByDate()).toBe(2) // update não criou linha nova

    const { data: firstRow } = await clientA
      .from('lead_digital_audits')
      .select('google_business_profile')
      .eq('id', first.auditId ?? '')
      .single()
    const { data: secondRow } = await clientA
      .from('lead_digital_audits')
      .select('google_business_profile')
      .eq('id', second.auditId ?? '')
      .single()
    expect(firstRow?.google_business_profile).toBe('parcialmente')
    expect(secondRow?.google_business_profile).toBe('nao') // linha vizinha intacta
  })

  it('8 · datas do Zod convertidas para date/timestamptz do Postgres', async () => {
    const withDates = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: leadAId,
      researched_at: '2026-08-27',
      instagram_last_post_date: '2026-07-15',
      pagespeed_analyzed_at: '2026-08-27T10:30:00.000Z',
    })
    expect(withDates.error).toBeNull()

    const { data: row } = await clientA
      .from('lead_digital_audits')
      .select('researched_at, instagram_last_post_date, pagespeed_analyzed_at')
      .eq('id', withDates.auditId ?? '')
      .single()

    expect(row?.researched_at).toBe('2026-08-27')
    expect(row?.instagram_last_post_date).toBe('2026-07-15')
    expect(new Date(row?.pagespeed_analyzed_at ?? '').toISOString()).toBe('2026-08-27T10:30:00.000Z')

    // researched_at ausente → default do banco (current_date)
    const noDate = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadAId })
    const { data: defaultRow } = await clientA
      .from('lead_digital_audits')
      .select('researched_at')
      .eq('id', noDate.auditId ?? '')
      .single()
    expect(defaultRow?.researched_at).toBe(new Date().toISOString().slice(0, 10))
  })

  it('9 · erro de banco na tabela relacionada NÃO vira "não encontrado"', async () => {
    const leadsDown = stubTableError(clientA, 'leads')
    const relatedError = await saveDigitalAuditCore(leadsDown, orgAId, userAId, { lead_id: leadAId })
    expect(relatedError.error).toBe('Não foi possível verificar a entidade relacionada.')
    expect(relatedError.error).not.toBe('Lead não encontrado.')

    const insertDown = stubTableError(clientA, 'lead_digital_audits')
    const insertError = await saveDigitalAuditCore(insertDown, orgAId, userAId, { lead_id: leadAId })
    expect(insertError.error).toBe('Não foi possível salvar o dossiê digital.')
  })

  it('10 · linha gravada bate com database.types.ts (tipos e nulos)', async () => {
    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: leadAId,
      google_rating: '4.2',
      google_reviews_count: '58',
      website_exists: 'sim',
      pagespeed_mobile_cls: '0.08',
      pagespeed_mobile_lcp: '2480',
    })
    expect(result.error).toBeNull()

    // Client tipado <Database,'sales'>: se o core gravasse de forma
    // incompatível com database.types.ts o `npm run typecheck` já teria
    // falhado (AuditInsert vem dos types gerados). Aqui a asserção é o
    // espelho em runtime dos tipos declarados na Row.
    const { data: row } = await clientA
      .from('lead_digital_audits')
      .select(
        'google_rating, google_reviews_count, website_exists, pagespeed_mobile_cls, pagespeed_mobile_lcp, website_notes, digital_score, digital_score_completeness',
      )
      .eq('id', result.auditId ?? '')
      .single()

    const numberOrNull: number | null | undefined = row?.google_rating
    const stringOrNull: string | null | undefined = row?.website_exists
    expect(numberOrNull).toBe(4.2)
    expect(stringOrNull).toBe('sim')
    expect(typeof row?.google_reviews_count).toBe('number')
    expect(row?.google_reviews_count).toBe(58)
    expect(row?.pagespeed_mobile_cls).toBe(0.08)
    expect(row?.pagespeed_mobile_lcp).toBe(2480)
    expect(row?.website_notes).toBeNull() // não avaliado preservado
    expect(typeof row?.digital_score).toBe('number')
    expect(typeof row?.digital_score_completeness).toBe('number')
  })

  it('audit_id de outra organização é rejeitado; a linha da outra org fica intacta', async () => {
    const auditB = await saveDigitalAuditCore(clientB, orgBId, userBId, {
      lead_id: leadBId,
      google_business_profile: 'sim',
    })
    expect(auditB.error).toBeNull()

    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
      lead_id: leadAId,
      audit_id: auditB.auditId,
      google_business_profile: 'nao',
    })
    expect(result.error).toBe('Auditoria não encontrada.')

    const { data: rowB } = await clientB
      .from('lead_digital_audits')
      .select('google_business_profile, org_id')
      .eq('id', auditB.auditId ?? '')
      .single()
    expect(rowB?.org_id).toBe(orgBId)
    expect(rowB?.google_business_profile).toBe('sim')
  })

  it('audit_id malformado (não-uuid) é rejeitado', async () => {
    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadAId, audit_id: 'não-é-uuid' })
    expect(result.error).toBe('Auditoria inválida.')
  })

  it('grava trilha em audit_logs com entity "lead_digital_audit"', async () => {
    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadAId })
    expect(result.error).toBeNull()

    const { data: logs } = await clientA
      .from('audit_logs')
      .select('entity, action, entity_id')
      .eq('org_id', orgAId)
      .eq('entity', 'lead_digital_audit')
      .eq('entity_id', result.auditId ?? '')
    expect(logs?.length).toBe(1)
    expect(logs?.[0]?.action).toBe('create')
  })

  it('rejeita payload inválido (nota fora da faixa) sem gravar', async () => {
    const result = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadAId, google_rating: '5.1' })
    expect(result.error).not.toBeNull()
    expect(result.auditId).toBeUndefined()
  })
})

