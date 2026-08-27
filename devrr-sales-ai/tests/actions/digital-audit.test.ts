import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { stubTableError, stubBeforeExecute } from '../helpers/stub-client'
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
  /** Segundo lead da MESMA organização — prova que o vínculo audit→lead não
   * depende só do isolamento por tenant. */
  let leadA2Id: string
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

    const leadA2 = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Segundo Lead da Org A',
      title: 'Prospecção A2',
    })
    if (leadA2.status !== 'success' || !leadA2.leadId) throw new Error('Falha ao criar lead A2')
    leadA2Id = leadA2.leadId

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

  // --- Revisão corretiva da 7.4 ---

  describe('A · vínculo auditoria → lead é imutável', () => {
    it('update com lead_id de OUTRO lead da mesma org é rejeitado e não altera nada', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        researched_at: '2026-08-10',
        google_business_profile: 'sim',
        google_rating: '4.5',
        website_exists: 'sim',
        website_notes: 'estado original',
      })
      expect(created.error).toBeNull()

      const SNAPSHOT =
        'lead_id, researched_at, google_business_profile, google_rating, website_exists, website_notes, digital_score, digital_score_completeness'
      const { data: before } = await clientA
        .from('lead_digital_audits')
        .select(SNAPSHOT)
        .eq('id', created.auditId ?? '')
        .single()

      // Os dois leads são da MESMA organização e ambos existem: só a checagem
      // de tenant não pegaria isso.
      const moved = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadA2Id,
        audit_id: created.auditId,
        google_business_profile: 'nao',
        website_notes: 'tentativa de sequestro',
      })
      expect(moved.error).toBe('Esta auditoria pertence a outro lead.')

      const { data: after } = await clientA
        .from('lead_digital_audits')
        .select(SNAPSHOT)
        .eq('id', created.auditId ?? '')
        .single()

      expect(after?.lead_id).toBe(leadAId)
      expect(after).toEqual(before) // nenhum outro campo tocado
    })

    it('o lead de destino não recebe a auditoria', async () => {
      const { data: rows } = await clientA
        .from('lead_digital_audits')
        .select('id')
        .eq('lead_id', leadA2Id)
        .eq('org_id', orgAId)
      expect(rows).toEqual([])
    })

    it('update com o MESMO lead_id continua funcionando', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        google_has_photos: 'sim',
      })
      const updated = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        google_has_photos: 'nao',
      })
      expect(updated.error).toBeNull()
      expect(updated.auditId).toBe(created.auditId)

      const { data: row } = await clientA
        .from('lead_digital_audits')
        .select('lead_id, google_has_photos')
        .eq('id', created.auditId ?? '')
        .single()
      expect(row?.lead_id).toBe(leadAId)
      expect(row?.google_has_photos).toBe('nao')
    })
  })

  describe('B · score no update parcial reflete o estado final persistido', () => {
    it('patch de um campo só recalcula sobre estado completo, não sobre o patch', async () => {
      const initialFields: DigitalAuditFields = {
        ...emptyScoreFields(),
        google_business_profile: 'sim',
        google_rating: 4.5,
        google_reviews_count: 30,
        website_exists: 'sim',
        website_https: 'sim',
        website_has_clear_cta: 'sim',
        instagram_exists: 'sim',
        instagram_has_bio_link: 'sim',
      }
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        google_business_profile: 'sim',
        google_rating: '4.5',
        google_reviews_count: '30',
        website_exists: 'sim',
        website_https: 'sim',
        website_has_clear_cta: 'sim',
        instagram_exists: 'sim',
        instagram_has_bio_link: 'sim',
      })
      expect(created.error).toBeNull()

      const initialExpected = computeDigitalScore(initialFields)
      expect(created.digitalScore).toBe(initialExpected.score)
      expect(created.completeness).toBe(initialExpected.completeness)

      // Patch de UM campo. O score do patch isolado seria completude 2
      // (só `website_has_clear_cta` avaliado) — nada a ver com a linha.
      const patchOnlyScore = computeDigitalScore({
        ...emptyScoreFields(),
        website_has_clear_cta: 'nao',
      })

      const updated = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        website_has_clear_cta: 'nao',
      })
      expect(updated.error).toBeNull()

      const finalExpected = computeDigitalScore({ ...initialFields, website_has_clear_cta: 'nao' })

      const { data: row } = await clientA
        .from('lead_digital_audits')
        .select('digital_score, digital_score_completeness, google_rating, google_reviews_count, instagram_has_bio_link')
        .eq('id', created.auditId ?? '')
        .single()

      // Dados que não estavam no patch continuam lá.
      expect(row?.google_rating).toBe(4.5)
      expect(row?.google_reviews_count).toBe(30)
      expect(row?.instagram_has_bio_link).toBe('sim')

      expect(row?.digital_score).toBe(finalExpected.score)
      expect(row?.digital_score_completeness).toBe(finalExpected.completeness)
      // E não o score do patch isolado — é este o bug que a correção fecha.
      expect(row?.digital_score_completeness).not.toBe(patchOnlyScore.completeness)
      expect(finalExpected.completeness).toBeGreaterThan(patchOnlyScore.completeness)
    })
  })

  describe('C · website SIM → NÃO limpa dependentes e PageSpeed', () => {
    it('estado final não guarda site nem medição de um site que não existe', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        website_exists: 'sim',
        website_url: 'https://clinica.example',
        website_has_clear_cta: 'sim',
        website_has_whatsapp: 'sim',
        website_notes: 'site antigo, encontrado em agosto',
        pagespeed_mobile_performance: '72',
        pagespeed_mobile_lcp: '3400',
        pagespeed_desktop_performance: '90',
        pagespeed_analyzed_url: 'https://clinica.example',
        pagespeed_analyzed_at: '2026-08-27T10:30:00.000Z',
        pagespeed_notes: 'medido no 4G',
      })
      expect(created.error).toBeNull()

      const { data: before } = await clientA
        .from('lead_digital_audits')
        .select('website_url, pagespeed_mobile_performance, pagespeed_analyzed_at')
        .eq('id', created.auditId ?? '')
        .single()
      expect(before?.website_url).toBe('https://clinica.example')
      expect(before?.pagespeed_mobile_performance).toBe(72)
      expect(before?.pagespeed_analyzed_at).not.toBeNull()

      // Update parcial: só corrige a base.
      const updated = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        website_exists: 'nao',
      })
      expect(updated.error).toBeNull()

      const { data: after } = await clientA
        .from('lead_digital_audits')
        .select(
          'website_exists, website_url, website_has_clear_cta, website_has_whatsapp, website_notes, pagespeed_mobile_performance, pagespeed_mobile_lcp, pagespeed_desktop_performance, pagespeed_analyzed_url, pagespeed_analyzed_at, pagespeed_notes, digital_score, digital_score_completeness',
        )
        .eq('id', created.auditId ?? '')
        .single()

      expect(after?.website_exists).toBe('nao')
      expect(after?.website_url).toBeNull()
      expect(after?.website_has_clear_cta).toBeNull()
      expect(after?.website_has_whatsapp).toBeNull()
      expect(after?.pagespeed_mobile_performance).toBeNull()
      expect(after?.pagespeed_mobile_lcp).toBeNull()
      expect(after?.pagespeed_desktop_performance).toBeNull()
      expect(after?.pagespeed_analyzed_url).toBeNull()
      expect(after?.pagespeed_analyzed_at).toBeNull()

      // Observações sobrevivem (valor documental).
      expect(after?.website_notes).toBe('site antigo, encontrado em agosto')
      expect(after?.pagespeed_notes).toBe('medido no 4G')

      const expected = computeDigitalScore({ ...emptyScoreFields(), website_exists: 'nao' })
      expect(after?.digital_score).toBe(expected.score)
      expect(after?.digital_score_completeness).toBe(expected.completeness)
      // Sem site: os 20 pts restantes de Website contam 0 e PageSpeed sai do
      // denominador (regra de cascata da 7.2).
      expect(after?.digital_score_completeness).toBe(25)
    })
  })

  describe('D · Instagram SIM → NÃO limpa dependentes', () => {
    it('dados estruturados do perfil somem; observação permanece', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        instagram_exists: 'sim',
        instagram_username: 'clinica_exemplo',
        instagram_url: 'https://instagram.com/clinica_exemplo',
        instagram_active: 'ativo',
        instagram_has_bio_link: 'sim',
        instagram_last_post_date: '2026-07-15',
        instagram_notes: 'perfil parecia abandonado',
      })
      expect(created.error).toBeNull()

      const updated = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        instagram_exists: 'nao',
      })
      expect(updated.error).toBeNull()

      const { data: after } = await clientA
        .from('lead_digital_audits')
        .select(
          'instagram_exists, instagram_url, instagram_active, instagram_has_bio_link, instagram_last_post_date, instagram_username, instagram_notes, digital_score_completeness',
        )
        .eq('id', created.auditId ?? '')
        .single()

      expect(after?.instagram_exists).toBe('nao')
      expect(after?.instagram_url).toBeNull()
      expect(after?.instagram_active).toBeNull()
      expect(after?.instagram_has_bio_link).toBeNull()
      expect(after?.instagram_last_post_date).toBeNull()

      // Contrato definido: o identificador procurado e a observação ficam.
      expect(after?.instagram_username).toBe('clinica_exemplo')
      expect(after?.instagram_notes).toBe('perfil parecia abandonado')

      const expected = computeDigitalScore({ ...emptyScoreFields(), instagram_exists: 'nao' })
      expect(after?.digital_score_completeness).toBe(expected.completeness)
    })
  })

  describe('E · Google Business SIM → NÃO limpa só o perfil', () => {
    it('atributos do perfil somem; dados da busca no Google permanecem', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        found_on_google: 'sim',
        google_result_type: 'patrocinado',
        google_ads_active: 'sim',
        google_ads_position: '2',
        google_organic_position: '7',
        google_search_result_url: 'https://www.google.com/search?q=clinica',
        google_business_profile: 'sim',
        google_business_name: 'Clínica Exemplo',
        google_rating: '4.7',
        google_reviews_count: '128',
        google_has_photos: 'sim',
        google_profile_completeness: 'boa',
        google_notes: 'perfil parecia de outra unidade',
      })
      expect(created.error).toBeNull()

      const updated = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        google_business_profile: 'nao',
      })
      expect(updated.error).toBeNull()

      const { data: after } = await clientA
        .from('lead_digital_audits')
        .select(
          'google_business_profile, google_rating, google_reviews_count, google_has_photos, google_profile_completeness, found_on_google, google_result_type, google_ads_active, google_ads_position, google_organic_position, google_search_result_url, google_business_name, google_notes',
        )
        .eq('id', created.auditId ?? '')
        .single()

      // Dependentes do perfil: limpos.
      expect(after?.google_business_profile).toBe('nao')
      expect(after?.google_rating).toBeNull()
      expect(after?.google_reviews_count).toBeNull()
      expect(after?.google_has_photos).toBeNull()
      expect(after?.google_profile_completeness).toBeNull()

      // Busca no Google: intocada — aparecer em anúncio/orgânico não depende
      // de existir Google Business Profile.
      expect(after?.found_on_google).toBe('sim')
      expect(after?.google_result_type).toBe('patrocinado')
      expect(after?.google_ads_active).toBe('sim')
      expect(after?.google_ads_position).toBe(2)
      expect(after?.google_organic_position).toBe(7)
      expect(after?.google_search_result_url).toBe('https://www.google.com/search?q=clinica')
      expect(after?.google_business_name).toBe('Clínica Exemplo')
      expect(after?.google_notes).toBe('perfil parecia de outra unidade')
    })
  })

  describe('F · datas de calendário não deslocam', () => {
    it('researched_at e instagram_last_post_date chegam exatos ao banco', async () => {
      const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        researched_at: '2026-08-27',
        instagram_last_post_date: '2026-08-27',
      })
      expect(result.error).toBeNull()

      const { data: row } = await clientA
        .from('lead_digital_audits')
        .select('researched_at, instagram_last_post_date')
        .eq('id', result.auditId ?? '')
        .single()

      expect(row?.researched_at).toBe('2026-08-27')
      expect(row?.instagram_last_post_date).toBe('2026-08-27')
    })

    it('data inexistente no calendário é rejeitada, não normalizada', async () => {
      const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        researched_at: '2026-02-31',
      })
      expect(result.error).not.toBeNull()
      expect(result.auditId).toBeUndefined()
    })

    it('datetime com fuso é rejeitado em campo de calendário', async () => {
      const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        researched_at: '2026-08-27T23:00:00-03:00',
      })
      expect(result.error).not.toBeNull()
    })

    it('pagespeed_analyzed_at (timestamptz) preserva o instante', async () => {
      const result = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        website_exists: 'sim',
        pagespeed_analyzed_at: '2026-08-27T23:00:00-03:00',
      })
      expect(result.error).toBeNull()

      const { data: row } = await clientA
        .from('lead_digital_audits')
        .select('pagespeed_analyzed_at')
        .eq('id', result.auditId ?? '')
        .single()

      expect(new Date(row?.pagespeed_analyzed_at ?? '').toISOString()).toBe('2026-08-28T02:00:00.000Z')
    })

    it('update parcial não apaga pagespeed_analyzed_at que não foi enviado', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        website_exists: 'sim',
        pagespeed_analyzed_at: '2026-08-27T10:30:00.000Z',
      })
      const updated = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        website_https: 'sim',
      })
      expect(updated.error).toBeNull()

      const { data: row } = await clientA
        .from('lead_digital_audits')
        .select('pagespeed_analyzed_at, website_https')
        .eq('id', created.auditId ?? '')
        .single()
      expect(row?.website_https).toBe('sim')
      expect(new Date(row?.pagespeed_analyzed_at ?? '').toISOString()).toBe('2026-08-27T10:30:00.000Z')
    })
  })

  describe('G · digital_opportunities: ausência preserva, presença substitui, vazio explícito limpa', () => {
    it('cria com array, update parcial de outro campo preserva, update explícito substitui, update com [] limpa', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        digital_opportunities: ['website', 'conversao'],
      })
      expect(created.error).toBeNull()

      const readOpportunities = async () => {
        const { data } = await clientA
          .from('lead_digital_audits')
          .select('digital_opportunities')
          .eq('id', created.auditId ?? '')
          .single()
        return data?.digital_opportunities
      }
      expect(await readOpportunities()).toEqual(['website', 'conversao'])

      // Update parcial de OUTRO campo, sem mandar digital_opportunities: o
      // array persistido tem que sobreviver (achado 1 da revisão corretiva —
      // `.default([])` apagava isto em todo update parcial).
      const patched = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        website_has_clear_cta: 'nao',
      })
      expect(patched.error).toBeNull()
      expect(await readOpportunities()).toEqual(['website', 'conversao'])

      // Update enviando explicitamente um array novo: substitui.
      const replaced = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        digital_opportunities: ['crm'],
      })
      expect(replaced.error).toBeNull()
      expect(await readOpportunities()).toEqual(['crm'])

      // Update com intenção explícita de limpar ([] presente, não ausente).
      const cleared = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        digital_opportunities: [],
      })
      expect(cleared.error).toBeNull()
      expect(await readOpportunities()).toEqual([])
    })

    it('insert mínimo (sem digital_opportunities) continua persistindo []', async () => {
      const result = await saveDigitalAuditCore(clientA, orgAId, userAId, { lead_id: leadAId })
      expect(result.error).toBeNull()

      const { data: row } = await clientA
        .from('lead_digital_audits')
        .select('digital_opportunities')
        .eq('id', result.auditId ?? '')
        .single()
      expect(row?.digital_opportunities).toEqual([])
    })
  })

  describe('H · lock otimista: escrita concorrente com updated_at obsoleto é rejeitada', () => {
    it('duas leituras da mesma versão: a primeira grava, a segunda é rejeitada e não aplica nem parcialmente', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        website_exists: 'sim',
        google_business_profile: 'sim',
        google_rating: '4.0',
      })
      expect(created.error).toBeNull()

      const expectedFields: DigitalAuditFields = {
        ...emptyScoreFields(),
        website_exists: 'nao',
        google_business_profile: 'sim',
        google_rating: 4.0,
      }

      // O client "perdedor" (B) lê a mesma versão que o "vencedor" (A): o
      // stub injeta a chamada completa de A no instante em que B já leu seu
      // `updated_at` e está prestes a escrever — determinístico, sem
      // depender de timing real de rede.
      let winnerError: string | null = 'não executou'
      const raceClient = stubBeforeExecute(clientA, 'lead_digital_audits', 'update', async () => {
        const winner = await saveDigitalAuditCore(clientA, orgAId, userAId, {
          lead_id: leadAId,
          audit_id: created.auditId,
          website_exists: 'nao', // dispara cascata + recalcula score
        })
        winnerError = winner.error
      })

      const loserResult = await saveDigitalAuditCore(raceClient, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        google_business_profile: 'nao',
      })

      expect(winnerError).toBeNull()
      expect(loserResult.error).toBe('Esta auditoria foi alterada por outra operação. Recarregue e tente novamente.')

      const { data: row } = await clientA
        .from('lead_digital_audits')
        .select('website_exists, google_business_profile, google_rating, digital_score, digital_score_completeness')
        .eq('id', created.auditId ?? '')
        .single()

      // A venceu por completo.
      expect(row?.website_exists).toBe('nao')
      // O patch do perdedor (google_business_profile: 'nao') NÃO foi
      // aplicado — nem parcialmente.
      expect(row?.google_business_profile).toBe('sim')
      expect(row?.google_rating).toBe(4.0)

      const expected = computeDigitalScore(expectedFields)
      expect(row?.digital_score).toBe(expected.score)
      expect(row?.digital_score_completeness).toBe(expected.completeness)
    })

    it('conflito não grava audit_log', async () => {
      const created = await saveDigitalAuditCore(clientA, orgAId, userAId, {
        lead_id: leadAId,
        google_has_photos: 'sim',
      })
      expect(created.error).toBeNull()

      const raceClient = stubBeforeExecute(clientA, 'lead_digital_audits', 'update', async () => {
        await saveDigitalAuditCore(clientA, orgAId, userAId, {
          lead_id: leadAId,
          audit_id: created.auditId,
          google_has_photos: 'nao',
        })
      })

      const before = await clientA
        .from('audit_logs')
        .select('id')
        .eq('org_id', orgAId)
        .eq('entity', 'lead_digital_audit')
        .eq('entity_id', created.auditId ?? '')

      const loser = await saveDigitalAuditCore(raceClient, orgAId, userAId, {
        lead_id: leadAId,
        audit_id: created.auditId,
        google_easy_whatsapp: 'sim',
      })
      expect(loser.error).toBe('Esta auditoria foi alterada por outra operação. Recarregue e tente novamente.')

      const after = await clientA
        .from('audit_logs')
        .select('id')
        .eq('org_id', orgAId)
        .eq('entity', 'lead_digital_audit')
        .eq('entity_id', created.auditId ?? '')

      // Só o log da escrita vencedora (update) — o conflito não acrescentou nada.
      expect(after.data?.length).toBe((before.data?.length ?? 0) + 1)
    })
  })
})

