import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { stubTableError } from '../helpers/stub-client'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadIntakeCore } from '@/lib/actions/lead-intake-core'
import { normalizePhoneBR } from '@/lib/domain/phone'
import { computeDigitalScore, type DigitalAuditFields } from '@/lib/domain/digital-score'
import { emptyScoreFields } from '../helpers/digital-score-fields'
import { DIGITAL_AUDIT_FIELD_NAMES } from '@/lib/validation/digital-audit'

/**
 * Testa lib/actions/lead-intake-core.ts (tarefa 3.6) contra o Supabase real,
 * mesmo padrão de tests/actions/leads.test.ts (D-020): a core não usa
 * cookies(), só a action `'use server'` de verdade usa. Cobre
 * especificamente o que é próprio deste fluxo — deduplicação por telefone,
 * confirmação de vínculo/criação, resolução do estágio inicial — e reusa os
 * mesmos casos de proteção cross-tenant já provados em leads-core.ts
 * (belongsToOrg é a mesma função, importada, não reimplementada).
 *
 * A partir da 7.7 cobre também o dossiê digital opcional que pode vir no mesmo
 * submit de `/leads/new` — ver o bloco "7.7 ·" no fim do arquivo.
 */

/** Dossiê preenchido estilo formulário (tudo string, como chega do FormData) e
 * o equivalente tipado que alimenta o oráculo do score. Os dois descrevem a
 * MESMA auditoria. */
const RICH_DOSSIER_INPUT: Record<string, string> = {
  website_exists: 'sim',
  google_business_profile: 'sim',
  google_rating: '4.5',
  google_reviews_count: '30',
  website_https: 'sim',
  conversion_clicks_to_whatsapp: '2',
  pagespeed_mobile_performance: '80',
}

const RICH_DOSSIER_SCORE_FIELDS: DigitalAuditFields = {
  ...emptyScoreFields(),
  website_exists: 'sim',
  google_business_profile: 'sim',
  google_rating: 4.5,
  google_reviews_count: 30,
  website_https: 'sim',
  conversion_clicks_to_whatsapp: 2,
  pagespeed_mobile_performance: 80,
}

describe('lib/actions/lead-intake-core', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string
  let stageNovoA: string
  let sourceA: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Intake Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Intake Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    stageNovoA = stagesA!.find((s) => s.key === 'novo')!.id

    const { data: sourcesA } = await clientA.from('lead_sources').select('id').eq('org_id', orgAId).limit(1)
    sourceA = sourcesA![0]!.id
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  it('cria contato e lead juntos quando não há telefone informado', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Maria Sem Telefone',
      title: 'Orçamento site institucional',
    })

    expect(result.status).toBe('success')
    expect(result.leadId).toBeDefined()

    const { data: lead } = await clientA
      .from('leads')
      .select('org_id, title, stage_id, value_cents, currency')
      .eq('id', result.leadId!)
      .single()

    expect(lead?.org_id).toBe(orgAId)
    expect(lead?.stage_id).toBe(stageNovoA)
    expect(lead?.value_cents).toBe(0)
    expect(lead?.currency).toBe('BRL')
  })

  it('cria contato e lead juntos quando o telefone é novo na organização', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Carlos Telefone Novo',
      phone: '11988887777',
      title: 'Landing page',
      source_id: sourceA,
      value_reais: '2500.50',
    })

    expect(result.status).toBe('success')

    const { data: lead } = await clientA.from('leads').select('value_cents, source_id').eq('id', result.leadId!).single()
    expect(lead?.value_cents).toBe(250050)
    expect(lead?.source_id).toBe(sourceA)
  })

  it('devolve duplicate sem gravar nada quando o telefone já existe na organização', async () => {
    const existing = await createContactCore(clientA, orgAId, userAId, {
      full_name: 'Contato Existente',
      phone: '11999998888',
    })

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Diferente',
      phone: '11999998888',
      title: 'Lead Duplicado',
    })

    expect(result.status).toBe('duplicate')
    expect(result.duplicateContact?.id).toBe(existing.id)
    expect(result.leadId).toBeUndefined()

    const { data: leads } = await clientA.from('leads').select('id').eq('title', 'Lead Duplicado')
    expect(leads).toEqual([])
  })

  it('vincula ao contato existente quando contact_id é reenviado (confirmação de vínculo)', async () => {
    const existing = await createContactCore(clientA, orgAId, userAId, {
      full_name: 'Contato Para Vincular',
      phone: '11977776666',
    })

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Ignorado',
      phone: '11977776666',
      title: 'Lead Vinculado',
      contact_id: existing.id,
    })

    expect(result.status).toBe('success')

    const { data: lead } = await clientA.from('leads').select('contact_id').eq('id', result.leadId!).single()
    expect(lead?.contact_id).toBe(existing.id)

    const { data: contacts } = await clientA.from('contacts').select('id').eq('phone', normalizePhoneBR('11977776666')!)
    expect(contacts).toHaveLength(1)
  })

  it('cria contato novo mesmo com telefone repetido quando force_new_contact é enviado', async () => {
    await createContactCore(clientA, orgAId, userAId, {
      full_name: 'Original Força Nova',
      phone: '11966665555',
    })

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Segundo Contato Mesmo Telefone',
      phone: '11966665555',
      title: 'Lead Forçado',
      force_new_contact: 'true',
    })

    expect(result.status).toBe('success')

    const { data: contacts } = await clientA
      .from('contacts')
      .select('id, full_name')
      .eq('phone', normalizePhoneBR('11966665555')!)
    expect(contacts).toHaveLength(2)
  })

  it('continua devolvendo duplicate depois que "criar mesmo assim" já produziu 2 contatos no mesmo telefone (achado A do checkpoint da Fase 3)', async () => {
    const phoneRaw = '11955554444'
    const phoneNormalized = normalizePhoneBR(phoneRaw)!

    // 1) telefone novo — cria o primeiro contato
    const first = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Primeiro',
      phone: phoneRaw,
      title: 'Lead 1',
    })
    expect(first.status).toBe('success')

    // 2) mesmo telefone, usuário escolhe "criar contato novo mesmo assim" —
    // estado legítimo por D-022/D-023, e é ele que expunha o bug: antes da
    // correção, .maybeSingle() sem .limit(1) contra 2+ linhas devolvia
    // erro, o error era descartado, e todo cadastro seguinte no mesmo
    // telefone virava 'success' em silêncio, sem nunca mais avisar.
    const second = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Segundo',
      phone: phoneRaw,
      title: 'Lead 2',
      force_new_contact: 'true',
    })
    expect(second.status).toBe('success')

    const { data: contactsAfterTwo } = await clientA.from('contacts').select('id').eq('phone', phoneNormalized)
    expect(contactsAfterTwo).toHaveLength(2)

    // 3) terceiro cadastro no mesmo telefone, SEM force — precisa continuar
    // avisando duplicata, não criar um terceiro contato em silêncio.
    const third = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Terceiro',
      phone: phoneRaw,
      title: 'Lead 3',
    })
    expect(third.status).toBe('duplicate')
    expect(third.leadId).toBeUndefined()

    const { data: contactsAfterThree } = await clientA.from('contacts').select('id').eq('phone', phoneNormalized)
    expect(contactsAfterThree).toHaveLength(2)

    const { data: leadsWithTitle3 } = await clientA.from('leads').select('id').eq('title', 'Lead 3')
    expect(leadsWithTitle3).toEqual([])
  })

  it('rejeita payload inválido — título vazio', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Válido',
      title: '',
    })
    expect(result.status).toBe('error')
  })

  it('rejeita value_reais negativo', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Válido',
      title: 'Lead Valor Negativo',
      value_reais: '-10',
    })
    expect(result.status).toBe('error')
  })

  it('rejeita source_id de outra organização e não cria nada', async () => {
    const { data: sourcesB } = await clientB.from('lead_sources').select('id').eq('org_id', orgBId).limit(1)

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Válido',
      title: 'Lead Fonte Cross-Tenant',
      source_id: sourcesB![0]!.id,
    })

    expect(result.status).toBe('error')

    const { data: leads } = await clientA.from('leads').select('id').eq('title', 'Lead Fonte Cross-Tenant')
    expect(leads).toEqual([])
  })

  it('rejeita contact_id de outra organização enviado direto (tentativa de mass assignment) e não cria nada', async () => {
    const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato de B' })

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Ignorado',
      title: 'Lead Contato Cross-Tenant',
      contact_id: contactB.id!,
    })

    expect(result.status).toBe('error')

    const { data: leads } = await clientA.from('leads').select('id').eq('title', 'Lead Contato Cross-Tenant')
    expect(leads).toEqual([])
  })

  it('ignora org_id enviado no payload — usa sempre o orgId resolvido pelo servidor', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Válido',
      title: 'Tentativa Org Id Intake',
      org_id: orgBId,
    })

    expect(result.status).toBe('success')

    const { data: lead } = await clientA.from('leads').select('org_id').eq('id', result.leadId!).single()
    expect(lead?.org_id).toBe(orgAId)
  })

  // --- 7.7 · dossiê digital opcional junto do cadastro ---------------------
  //
  // `/leads/new` manda os campos comerciais e as 7 seções do dossiê no MESMO
  // submit. O que estes testes fixam: quando uma auditoria nasce, quando NÃO
  // nasce, e que uma falha do anexo nunca custa o lead já criado.

  describe('7.7 · dossiê digital opcional no mesmo submit', () => {
    /** O que o browser manda quando o operador abre `/leads/new` e não toca em
     * nada do dossiê: todo campo visível vai como `''`, o sentinel de
     * oportunidades está lá (a seção foi renderizada) com nenhuma marcada, e
     * `researched_at` chega PRÉ-PREENCHIDO com hoje pelo `buildInitialValues`
     * da 7.6. Nada disso é diagnóstico. */
    function blankDossierSubmit(): Record<string, unknown> {
      const blank: Record<string, unknown> = {}
      for (const field of DIGITAL_AUDIT_FIELD_NAMES) {
        if (field === 'lead_id' || field === 'digital_opportunities') continue
        blank[field] = ''
      }
      blank.researched_at = '2026-08-28'
      blank.digital_opportunities = []
      return blank
    }

    async function auditsOfLead(leadId: string) {
      const { data } = await clientA
        .from('lead_digital_audits')
        .select('id, org_id, lead_id')
        .eq('lead_id', leadId)
      return data ?? []
    }

    async function countAuditsInOrgA(): Promise<number> {
      const { data } = await clientA.from('lead_digital_audits').select('id').eq('org_id', orgAId)
      return (data ?? []).length
    }

    // A. Lead sem dossiê
    it('A · cria só o lead quando nenhum campo do dossiê foi preenchido — nenhuma auditoria', async () => {
      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Sem Dossiê',
        title: 'Sem diagnóstico digital',
        ...blankDossierSubmit(),
      })

      expect(result.status).toBe('success')
      expect(result.leadId).toBeDefined()
      expect(result.auditId).toBeUndefined()
      expect(result.auditError).toBeUndefined()

      expect(await auditsOfLead(result.leadId!)).toEqual([])
    })

    it('A2 · payload sem chave nenhuma de dossiê também não cria auditoria (cadastro de antes da 7.7)', async () => {
      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Payload Antigo',
        title: 'Cadastro sem seção de dossiê',
      })

      expect(result.status).toBe('success')
      expect(result.auditId).toBeUndefined()
      expect(await auditsOfLead(result.leadId!)).toEqual([])
    })

    // B. Lead + dossiê
    it('B · cria lead e auditoria juntos, com vínculo, org e scores resolvidos no servidor', async () => {
      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Com Dossiê',
        title: 'Diagnóstico no cadastro',
        ...blankDossierSubmit(),
        ...RICH_DOSSIER_INPUT,
      })

      expect(result.status).toBe('success')
      expect(result.leadId).toBeDefined()
      expect(result.auditId).toBeDefined()
      expect(result.auditError).toBeUndefined()

      const { data: audit } = await clientA
        .from('lead_digital_audits')
        .select(
          'id, org_id, lead_id, created_by, researched_at, website_exists, google_business_profile, google_rating, google_reviews_count, website_https, conversion_clicks_to_whatsapp, pagespeed_mobile_performance, digital_score, digital_score_completeness',
        )
        .eq('id', result.auditId!)
        .single()

      // Vínculo e tenant vêm do servidor, nunca do payload.
      expect(audit?.lead_id).toBe(result.leadId)
      expect(audit?.org_id).toBe(orgAId)
      expect(audit?.created_by).toBe(userAId)

      // Campos do dossiê persistidos com o tipo certo (string do form →
      // numeric/enum da coluna).
      expect(audit?.website_exists).toBe('sim')
      expect(audit?.google_business_profile).toBe('sim')
      expect(audit?.google_rating).toBe(4.5)
      expect(audit?.google_reviews_count).toBe(30)
      expect(audit?.website_https).toBe('sim')
      expect(audit?.conversion_clicks_to_whatsapp).toBe(2)
      expect(audit?.pagespeed_mobile_performance).toBe(80)
      expect(audit?.researched_at).toBe('2026-08-28')

      // Score e completude são do servidor (D-038) — o formulário não os envia.
      const expected = computeDigitalScore(RICH_DOSSIER_SCORE_FIELDS)
      expect(audit?.digital_score).toBe(expected.score)
      expect(audit?.digital_score_completeness).toBe(expected.completeness)

      // Exatamente uma auditoria para este lead — o cadastro não duplica.
      expect(await auditsOfLead(result.leadId!)).toHaveLength(1)
    })

    // C. Best-effort
    it('C · falha de banco na auditoria NÃO desfaz o lead — devolve success com aviso', async () => {
      // Erro real de banco na tabela da auditoria, depois de o lead já existir.
      const brokenAudits = stubTableError(clientA, 'lead_digital_audits')

      const result = await createLeadIntakeCore(brokenAudits, orgAId, userAId, {
        full_name: 'Lead Best Effort',
        title: 'Dossiê que falhou',
        ...blankDossierSubmit(),
        ...RICH_DOSSIER_INPUT,
      })

      // O cadastro NÃO se perde por causa do anexo.
      expect(result.status).toBe('success')
      expect(result.leadId).toBeDefined()
      expect(result.error).toBeNull()
      // ...e a falha parcial é reportada, não engolida.
      expect(result.auditError).toBe('Não foi possível salvar o dossiê digital.')
      expect(result.auditId).toBeUndefined()

      // O lead continua no banco (nenhum rollback/compensação destrutiva).
      const { data: lead } = await clientA
        .from('leads')
        .select('id, org_id')
        .eq('id', result.leadId!)
        .maybeSingle()
      expect(lead?.id).toBe(result.leadId)
      expect(lead?.org_id).toBe(orgAId)

      // E nenhuma auditoria meia-boca ficou para trás — o dossiê é refeito
      // depois em /leads/[leadId]/dossie.
      expect(await auditsOfLead(result.leadId!)).toEqual([])
    })

    it('C2 · dossiê rejeitado pelo Zod também preserva o lead e reporta o aviso', async () => {
      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Dossiê Inválido',
        title: 'Nota fora do limite',
        ...blankDossierSubmit(),
        // `google_rating` vai até 5 (schema 7.3).
        google_rating: '9',
      })

      expect(result.status).toBe('success')
      expect(result.leadId).toBeDefined()
      expect(result.auditError).toBeTruthy()
      expect(result.auditId).toBeUndefined()

      const { data: lead } = await clientA.from('leads').select('id').eq('id', result.leadId!).maybeSingle()
      expect(lead?.id).toBe(result.leadId)
      expect(await auditsOfLead(result.leadId!)).toEqual([])
    })

    // D. Falha do lead
    it('D · lead que não é criado não deixa auditoria órfã', async () => {
      const before = await countAuditsInOrgA()

      const { data: sourcesB } = await clientB.from('lead_sources').select('id').eq('org_id', orgBId).limit(1)

      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Que Falha',
        title: 'Lead Falho Com Dossiê',
        source_id: sourcesB![0]!.id,
        ...blankDossierSubmit(),
        ...RICH_DOSSIER_INPUT,
      })

      expect(result.status).toBe('error')
      expect(result.leadId).toBeUndefined()
      expect(result.auditId).toBeUndefined()

      const { data: leads } = await clientA.from('leads').select('id').eq('title', 'Lead Falho Com Dossiê')
      expect(leads).toEqual([])
      expect(await countAuditsInOrgA()).toBe(before)
    })

    it('D2 · payload inválido do lead nem chega a tentar a auditoria', async () => {
      const before = await countAuditsInOrgA()

      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Nome Válido',
        title: '',
        ...blankDossierSubmit(),
        ...RICH_DOSSIER_INPUT,
      })

      expect(result.status).toBe('error')
      expect(result.auditId).toBeUndefined()
      expect(await countAuditsInOrgA()).toBe(before)
    })

    // E. Cross-tenant
    it('E · lead_id do navegador é ignorado: a auditoria nasce no lead novo, nunca em lead de outra org', async () => {
      const leadB = await createLeadIntakeCore(clientB, orgBId, userBId, {
        full_name: 'Lead da Org B',
        title: 'Alvo cross-tenant',
      })
      expect(leadB.status).toBe('success')

      const { data: auditsBBefore } = await clientB
        .from('lead_digital_audits')
        .select('id')
        .eq('lead_id', leadB.leadId!)
      expect(auditsBBefore ?? []).toEqual([])

      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Cross Tenant',
        title: 'Tentativa de sequestro de vínculo',
        ...blankDossierSubmit(),
        ...RICH_DOSSIER_INPUT,
        // Tudo o que o navegador poderia forjar para desviar a auditoria.
        lead_id: leadB.leadId!,
        org_id: orgBId,
      })

      expect(result.status).toBe('success')
      expect(result.auditId).toBeDefined()

      const { data: audit } = await clientA
        .from('lead_digital_audits')
        .select('lead_id, org_id')
        .eq('id', result.auditId!)
        .single()

      expect(audit?.lead_id).toBe(result.leadId)
      expect(audit?.lead_id).not.toBe(leadB.leadId)
      expect(audit?.org_id).toBe(orgAId)

      // O lead da org B continua sem dossiê nenhum.
      const { data: auditsBAfter } = await clientB
        .from('lead_digital_audits')
        .select('id')
        .eq('lead_id', leadB.leadId!)
      expect(auditsBAfter ?? []).toEqual([])
    })

    it('E2 · audit_id do navegador não faz o cadastro atualizar auditoria existente', async () => {
      // Auditoria legítima de outro lead da MESMA org — o alvo mais perigoso,
      // porque nem a RLS nem o filtro de org a rejeitariam sozinhos.
      const alvo = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Alvo do Audit Id',
        title: 'Dossiê existente',
        ...blankDossierSubmit(),
        website_notes: 'texto original',
      })
      expect(alvo.auditId).toBeDefined()

      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Sequestrador',
        title: 'Tentativa de update via cadastro',
        ...blankDossierSubmit(),
        website_notes: 'texto injetado',
        audit_id: alvo.auditId!,
        expected_updated_at: new Date().toISOString(),
      })

      expect(result.status).toBe('success')
      expect(result.auditId).toBeDefined()
      // Auditoria NOVA, do lead novo — não um update da outra.
      expect(result.auditId).not.toBe(alvo.auditId)

      const { data: original } = await clientA
        .from('lead_digital_audits')
        .select('lead_id, website_notes')
        .eq('id', alvo.auditId!)
        .single()
      expect(original?.lead_id).toBe(alvo.leadId)
      expect(original?.website_notes).toBe('texto original')
    })

    // F. Opportunities
    it('F · digital_opportunities com vários valores persiste completo', async () => {
      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Oportunidades',
        title: 'Várias oportunidades',
        ...blankDossierSubmit(),
        digital_opportunities: ['website', 'seo_local', 'whatsapp'],
      })

      expect(result.status).toBe('success')
      expect(result.auditId).toBeDefined()

      const { data: audit } = await clientA
        .from('lead_digital_audits')
        .select('digital_opportunities')
        .eq('id', result.auditId!)
        .single()

      expect(audit?.digital_opportunities).toEqual(['website', 'seo_local', 'whatsapp'])
    })

    it('F2 · uma oportunidade marcada é, sozinha, motivo para criar o dossiê', async () => {
      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Só Oportunidade',
        title: 'Uma oportunidade marcada',
        ...blankDossierSubmit(),
        digital_opportunities: ['instagram'],
      })

      expect(result.auditId).toBeDefined()
      const { data: audit } = await clientA
        .from('lead_digital_audits')
        .select('digital_opportunities')
        .eq('id', result.auditId!)
        .single()
      expect(audit?.digital_opportunities).toEqual(['instagram'])
    })

    // G. Campos parciais
    it('G · dossiê parcial é aceito: um campo preenchido basta, o resto fica nulo', async () => {
      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Dossiê Parcial',
        title: 'Só o perfil do Google',
        ...blankDossierSubmit(),
        google_business_profile: 'sim',
      })

      expect(result.status).toBe('success')
      expect(result.auditId).toBeDefined()

      const { data: audit } = await clientA
        .from('lead_digital_audits')
        .select(
          'google_business_profile, website_exists, instagram_exists, google_rating, website_url, digital_opportunities, researched_at, digital_score_completeness',
        )
        .eq('id', result.auditId!)
        .single()

      expect(audit?.google_business_profile).toBe('sim')
      // Campo em branco vira `null`, nunca `nao` nem `0` (D-037 / regra 1 da Fase 7).
      expect(audit?.website_exists).toBeNull()
      expect(audit?.instagram_exists).toBeNull()
      expect(audit?.google_rating).toBeNull()
      expect(audit?.website_url).toBeNull()
      expect(audit?.digital_opportunities).toEqual([])
      // `researched_at` não decide criar o dossiê, mas é gravado quando ele nasce.
      expect(audit?.researched_at).toBe('2026-08-28')
      // Completude sai do servidor mesmo com quase tudo em branco.
      expect(audit?.digital_score_completeness).toBeGreaterThan(0)
    })

    it('G2 · a cascata da 7.4 vale igual no cadastro: base "nao" não deixa campo dependente entrar', async () => {
      const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
        full_name: 'Lead Cascata',
        title: 'Site inexistente',
        ...blankDossierSubmit(),
        website_exists: 'nao',
        instagram_exists: 'nao',
      })

      expect(result.status).toBe('success')
      expect(result.auditId).toBeDefined()

      const { data: audit } = await clientA
        .from('lead_digital_audits')
        .select(
          'website_exists, website_url, website_https, instagram_exists, instagram_url, pagespeed_mobile_performance',
        )
        .eq('id', result.auditId!)
        .single()

      expect(audit?.website_exists).toBe('nao')
      expect(audit?.website_url).toBeNull()
      expect(audit?.website_https).toBeNull()
      expect(audit?.instagram_exists).toBe('nao')
      expect(audit?.instagram_url).toBeNull()
      expect(audit?.pagespeed_mobile_performance).toBeNull()
    })
  })
})
