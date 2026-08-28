import { describe, it, expect, vi } from 'vitest'
import {
  buildDossierJson,
  buildDossierMarkdown,
  buildDossierCsvRow,
  buildDossierCsv,
  DOSSIER_CSV_COLUMNS,
  DOSSIER_DATA_COLUMNS,
  DOSSIER_TECHNICAL_COLUMNS,
  DOSSIER_DIAGNOSTIC_SCORE_COLUMNS,
  DOSSIER_ENUM_COLUMN_GROUP,
  type DigitalAudit,
  type DossierLeadInput,
} from '@/lib/domain/dossier-export'
import { DIGITAL_AUDIT_FIELD_NAMES } from '@/lib/validation/digital-audit'
import { ENUM_LABELS, FIELD_LABELS } from '@/lib/domain/digital-labels'
import * as scoreModule from '@/lib/domain/digital-score'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAudit(overrides: Partial<DigitalAudit> = {}): DigitalAudit {
  const base: Record<string, unknown> = {}
  for (const column of [...DOSSIER_DATA_COLUMNS, ...DOSSIER_DIAGNOSTIC_SCORE_COLUMNS]) {
    base[column] = null
  }
  base.digital_opportunities = []
  base.id = '00000000-0000-0000-0000-0000000000a1'
  base.org_id = '00000000-0000-0000-0000-0000000000b1'
  base.lead_id = '00000000-0000-0000-0000-0000000000c1'
  base.created_by = '00000000-0000-0000-0000-0000000000d1'
  base.researched_at = '2026-08-27'
  base.created_at = '2026-08-27T12:00:00.000Z'
  base.updated_at = '2026-08-27T12:30:00.000Z'
  return { ...(base as DigitalAudit), ...overrides }
}

function makeLead(overrides: Partial<DossierLeadInput> = {}): DossierLeadInput {
  return {
    title: 'Landing page para clínica odontológica',
    companyName: 'Clínica Sorriso Uberlândia',
    contactName: 'Dra. Ana Prado',
    phone: '+55 34 99999-0000',
    email: 'contato@sorriso.com.br',
    interest: 'Site novo + Google Ads',
    source: 'Instagram',
    valueCents: 250000,
    ...overrides,
  }
}

/** Auditoria "rica": ao menos um valor de cada natureza (enum, número,
 * ms→segundos, ms puro, decimal, data, timestamp, array, texto livre). */
function makeRichAudit(): DigitalAudit {
  return makeAudit({
    search_query: 'clareamento dental',
    search_location: 'Uberlândia - MG',
    found_on_google: 'sim',
    google_result_type: 'patrocinado',
    google_ads_active: 'sim',
    google_ads_position: 1,
    google_organic_position: 7,
    google_search_result_url: '  https://exemplo.com/anuncio  ',
    google_business_profile: 'sim',
    google_rating: 4.9,
    google_reviews_count: 128,
    google_replies_reviews: 'algumas',
    google_profile_completeness: 'boa',
    google_notes: 'Perfil ativo, responde parte das avaliações.',
    website_exists: 'sim',
    website_url: 'https://sorriso.com.br',
    website_mobile_friendly: 'parcialmente',
    website_perceived_speed: 'aceitavel',
    website_visual_quality: 'regular',
    conversion_clear_contact_path: 'parcialmente',
    conversion_clicks_to_whatsapp: 3,
    conversion_friction_notes: 'WhatsApp escondido, formulário longo.',
    instagram_exists: 'sim',
    instagram_username: '@clinicasorriso',
    instagram_last_post_date: '2026-08-10',
    instagram_active: 'pouco_ativo',
    instagram_content_cta: 'raramente',
    pagespeed_mobile_performance: 44,
    pagespeed_mobile_seo: 92,
    pagespeed_mobile_core_web_vitals: 'reprovado',
    pagespeed_mobile_lcp: 4820,
    pagespeed_mobile_inp: 260,
    pagespeed_mobile_cls: 0.21,
    pagespeed_desktop_performance: 71,
    pagespeed_desktop_core_web_vitals: 'aprovado',
    pagespeed_desktop_lcp: 2480,
    pagespeed_analyzed_url: 'https://sorriso.com.br',
    pagespeed_analyzed_at: '2026-08-27T10:00:00.000Z',
    pagespeed_field_data_available: 'sim',
    digital_problems: 'Site lento no mobile; Core Web Vitals reprovado.',
    digital_strengths: 'Boa reputação no Google.',
    digital_opportunities: ['website', 'performance', 'conversao'],
    digital_sales_priority: 'alta',
    digital_opportunity_score: 8,
    digital_opportunity_reason: 'Presença existe mas converte mal.',
    digital_score: 57,
    digital_score_completeness: 61,
  })
}

// ---------------------------------------------------------------------------
// 10 + 11. Paridade schema × export e listas explícitas
// ---------------------------------------------------------------------------

describe('paridade schema × export', () => {
  it('DOSSIER_DATA_COLUMNS = todos os campos de entrada do schema, menos lead_id', () => {
    const exportable = DIGITAL_AUDIT_FIELD_NAMES.filter((name) => name !== 'lead_id')
    expect([...DOSSIER_DATA_COLUMNS].sort()).toEqual([...exportable].sort())
  })

  it('tem exatamente 101 colunas de dado, sem nenhuma repetida', () => {
    expect(DOSSIER_DATA_COLUMNS).toHaveLength(101)
    expect(new Set(DOSSIER_DATA_COLUMNS).size).toBe(DOSSIER_DATA_COLUMNS.length)
  })

  it('falha se um campo exportável entrar no contrato sem ser mapeado a uma seção', () => {
    // A prova real é a igualdade acima: DIGITAL_AUDIT_FIELD_NAMES é derivado de
    // `digitalAuditObject.shape` (nunca escrito à mão), então um campo novo no
    // schema quebra o `toEqual`. Aqui a versão direta: todo campo do schema
    // (menos lead_id) está coberto.
    for (const name of DIGITAL_AUDIT_FIELD_NAMES) {
      if (name === 'lead_id') continue
      expect(DOSSIER_DATA_COLUMNS, name).toContain(name)
    }
  })

  it('colunas técnicas deliberadamente fora da exportação, listadas explicitamente', () => {
    expect([...DOSSIER_TECHNICAL_COLUMNS].sort()).toEqual([
      'created_at',
      'created_by',
      'id',
      'lead_id',
      'org_id',
      'updated_at',
    ])
  })

  it('digital_score / digital_score_completeness são saída de diagnóstico, nunca entrada', () => {
    expect([...DOSSIER_DIAGNOSTIC_SCORE_COLUMNS]).toEqual([
      'digital_score',
      'digital_score_completeness',
    ])
    for (const column of DOSSIER_DIAGNOSTIC_SCORE_COLUMNS) {
      expect(DIGITAL_AUDIT_FIELD_NAMES).not.toContain(column)
    }
  })

  it('toda coluna de dado tem rótulo PT em FIELD_LABELS (7.6)', () => {
    for (const column of DOSSIER_DATA_COLUMNS) {
      expect(typeof FIELD_LABELS[column], column).toBe('string')
    }
  })
})

describe('DOSSIER_ENUM_COLUMN_GROUP', () => {
  // As 51 colunas de enum de sales.lead_digital_audits (migration 0012 /
  // database.types.ts). Referência fixa: enum novo no schema exige entrada aqui.
  const EXPECTED_ENUM_COLUMNS = [
    'found_on_google',
    'google_result_type',
    'google_ads_active',
    'google_business_profile',
    'google_recent_reviews',
    'google_replies_reviews',
    'google_has_photos',
    'google_has_hours',
    'google_has_phone',
    'google_has_website',
    'google_easy_whatsapp',
    'google_has_booking',
    'google_profile_completeness',
    'website_exists',
    'website_https',
    'website_mobile_friendly',
    'website_visual_quality',
    'website_perceived_speed',
    'website_services_clear',
    'website_has_target_service_page',
    'website_has_clear_cta',
    'website_has_whatsapp',
    'website_whatsapp_clickable',
    'website_whatsapp_floating',
    'website_has_contact_form',
    'website_has_online_booking',
    'website_phone_visible',
    'website_address_visible',
    'website_has_social_proof',
    'website_has_clear_differentiators',
    'website_has_team',
    'website_content_updated',
    'conversion_clear_contact_path',
    'conversion_cta_above_fold',
    'conversion_repeated_cta',
    'conversion_alternative_capture',
    'conversion_has_friction',
    'instagram_exists',
    'instagram_has_bio_link',
    'instagram_clear_bio',
    'instagram_has_cta',
    'instagram_easy_whatsapp',
    'instagram_easy_website',
    'instagram_active',
    'instagram_visual_quality',
    'instagram_services_content',
    'instagram_content_cta',
    'pagespeed_mobile_core_web_vitals',
    'pagespeed_desktop_core_web_vitals',
    'pagespeed_field_data_available',
    'digital_sales_priority',
  ]

  it('cobre exatamente as 51 colunas de enum', () => {
    expect(Object.keys(DOSSIER_ENUM_COLUMN_GROUP).sort()).toEqual([...EXPECTED_ENUM_COLUMNS].sort())
  })

  it('todo grupo apontado existe em ENUM_LABELS', () => {
    for (const [column, group] of Object.entries(DOSSIER_ENUM_COLUMN_GROUP)) {
      expect(ENUM_LABELS[group as keyof typeof ENUM_LABELS], column).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// JSON aninhado
// ---------------------------------------------------------------------------

describe('buildDossierJson', () => {
  it('tem as 9 chaves do DOSSIE §13 e nenhuma propriedade solta no topo', () => {
    const json = buildDossierJson(makeLead(), makeRichAudit())
    expect(Object.keys(json)).toEqual([
      'lead',
      'prospecting',
      'google',
      'website',
      'conversion',
      'instagram',
      'pagespeed',
      'diagnostic',
    ])
    // pagespeed é o único aninhado: mobile e desktop separados (as 2 chaves
    // que completam as "9" do plano), mais os metadados gerais da análise.
    expect(Object.keys(json.pagespeed)).toEqual([
      'analyzed_url',
      'analyzed_at',
      'field_data_available',
      'notes',
      'mobile',
      'desktop',
    ])
  })

  it('não é achatado: cada seção é um objeto com as colunas do banco', () => {
    const json = buildDossierJson(makeLead(), makeRichAudit())
    expect(json.google.google_rating).toBe(4.9)
    expect(json.website.website_url).toBe('https://sorriso.com.br')
    expect(json.conversion.conversion_clicks_to_whatsapp).toBe(3)
    expect(json.diagnostic.digital_opportunities).toEqual(['website', 'performance', 'conversao'])
  })

  it('inclui nulos — ausência é informação, não campo omitido', () => {
    const json = buildDossierJson(makeLead(), makeAudit())
    expect('google_rating' in json.google).toBe(true)
    expect(json.google.google_rating).toBeNull()
    expect(json.instagram.instagram_active).toBeNull()
  })

  it('lead vem da identificação: empresa real, título à parte', () => {
    const json = buildDossierJson(makeLead(), makeRichAudit())
    expect(json.lead.company_name).toBe('Clínica Sorriso Uberlândia')
    expect(json.lead.title).toBe('Landing page para clínica odontológica')
    expect(json.lead.value_cents).toBe(250000)
    expect(json.lead.email).toBe('contato@sorriso.com.br')
  })

  it('PageSpeed mobile e desktop ficam separados, com o prefixo removido', () => {
    const json = buildDossierJson(makeLead(), makeRichAudit())
    expect(json.pagespeed.mobile.performance).toBe(44)
    expect(json.pagespeed.mobile.lcp).toBe(4820)
    expect(json.pagespeed.mobile.core_web_vitals).toBe('reprovado')
    expect(json.pagespeed.desktop.performance).toBe(71)
    expect(json.pagespeed.desktop.core_web_vitals).toBe('aprovado')
    expect(json.pagespeed.mobile.performance).not.toBe(json.pagespeed.desktop.performance)
    expect(json.pagespeed.analyzed_at).toBe('2026-08-27T10:00:00.000Z')
  })

  it('datas passam verbatim (calendário sem UTC, timestamp intacto)', () => {
    const json = buildDossierJson(
      makeLead(),
      makeAudit({
        researched_at: '2026-01-01',
        instagram_last_post_date: '2026-12-31',
        pagespeed_analyzed_at: '2026-03-15T23:30:00.000Z',
      }),
    )
    expect(json.prospecting.researched_at).toBe('2026-01-01')
    expect(json.instagram.instagram_last_post_date).toBe('2026-12-31')
    expect(json.pagespeed.analyzed_at).toBe('2026-03-15T23:30:00.000Z')
  })

  it('valores 0 / false-equivalentes permanecem', () => {
    const json = buildDossierJson(
      makeLead(),
      makeAudit({
        google_reviews_count: 0,
        pagespeed_mobile_performance: 0,
        pagespeed_mobile_cls: 0,
        conversion_clicks_to_whatsapp: 0,
      }),
    )
    expect(json.google.google_reviews_count).toBe(0)
    expect(json.pagespeed.mobile.performance).toBe(0)
    expect(json.pagespeed.mobile.cls).toBe(0)
    expect(json.conversion.conversion_clicks_to_whatsapp).toBe(0)
  })

  it('`nao` ≠ `null`: o negativo aparece como valor, o não avaliado como null', () => {
    const json = buildDossierJson(
      makeLead(),
      makeAudit({ website_exists: 'nao', instagram_exists: null }),
    )
    expect(json.website.website_exists).toBe('nao')
    expect(json.instagram.instagram_exists).toBeNull()
  })

  it('enums especiais são preservados verbatim', () => {
    const json = buildDossierJson(
      makeLead(),
      makeAudit({
        google_result_type: 'nao_identificado',
        website_whatsapp_clickable: 'nao_se_aplica',
        google_recent_reviews: 'nao_analisado',
        pagespeed_mobile_core_web_vitals: 'dados_insuficientes',
      }),
    )
    expect(json.prospecting.google_result_type).toBe('nao_identificado')
    expect(json.website.website_whatsapp_clickable).toBe('nao_se_aplica')
    expect(json.google.google_recent_reviews).toBe('nao_analisado')
    expect(json.pagespeed.mobile.core_web_vitals).toBe('dados_insuficientes')
  })

  it('score usa o valor persistido, sem recalcular', () => {
    const spy = vi.spyOn(scoreModule, 'computeDigitalScore')
    const json = buildDossierJson(makeLead(), makeAudit({ digital_score: 42, digital_score_completeness: 73 }))
    expect(json.diagnostic.digital_score).toBe(42)
    expect(json.diagnostic.digital_score_completeness).toBe(73)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('sem auditoria: todas as seções de dado ficam nulas, o lead permanece', () => {
    const json = buildDossierJson(makeLead(), null)
    expect(json.lead.company_name).toBe('Clínica Sorriso Uberlândia')
    expect(json.prospecting.researched_at).toBeNull()
    expect(json.pagespeed.mobile.performance).toBeNull()
    expect(json.diagnostic.digital_score).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Markdown para IA
// ---------------------------------------------------------------------------

describe('buildDossierMarkdown', () => {
  it('auditoria completa: título, todas as seções com conteúdo e agrupamento certo', () => {
    const md = buildDossierMarkdown(makeLead(), makeRichAudit())
    expect(md.startsWith('# DOSSIÊ DIGITAL DO LEAD\n')).toBe(true)
    for (const heading of [
      '## IDENTIFICAÇÃO',
      '## ORIGEM',
      '## GOOGLE',
      '## WEBSITE',
      '## CONVERSÃO',
      '## INSTAGRAM',
      '## PAGESPEED',
      '## PAGESPEED MOBILE',
      '## PAGESPEED DESKTOP',
      '## DIAGNÓSTICO',
    ]) {
      expect(md, heading).toContain(`${heading}\n`)
    }
    // rótulos PT de digital-labels.ts, não nomes de coluna
    expect(md).toContain('Empresa: Clínica Sorriso Uberlândia')
    expect(md).toContain('Título do lead: Landing page para clínica odontológica')
    expect(md).toContain('Nota Google: 4.9')
    expect(md).toContain('Tipo de resultado: Patrocinado')
    expect(md).toContain('Carregamento percebido: Aceitável')
  })

  it('IDENTIFICAÇÃO usa R$ para o valor e a data da análise da auditoria', () => {
    const md = buildDossierMarkdown(makeLead(), makeRichAudit())
    // formatBRL usa espaço não separável (U+00A0) entre "R$" e o número.
    expect(md).toMatch(/Valor potencial: R\$\s2\.500,00/)
    expect(md).toContain('Data da análise: 2026-08-27')
  })

  it('métricas de tempo: LCP/FCP/TBT/Speed Index em segundos; INP em ms; CLS decimal', () => {
    const md = buildDossierMarkdown(makeLead(), makeRichAudit())
    expect(md).toContain('LCP (mobile): 4,82 s')
    expect(md).toContain('INP (mobile): 260 ms')
    expect(md).toContain('CLS (mobile): 0.21')
    expect(md).toContain('LCP (desktop): 2,48 s')
  })

  it('PageSpeed mobile e desktop em seções distintas', () => {
    const md = buildDossierMarkdown(makeLead(), makeRichAudit())
    const mobileIdx = md.indexOf('## PAGESPEED MOBILE')
    const desktopIdx = md.indexOf('## PAGESPEED DESKTOP')
    expect(mobileIdx).toBeGreaterThan(0)
    expect(desktopIdx).toBeGreaterThan(mobileIdx)
    const mobileBlock = md.slice(mobileIdx, desktopIdx)
    expect(mobileBlock).toContain('Performance (mobile): 44')
    expect(mobileBlock).not.toContain('(desktop)')
  })

  it('auditoria parcial: campo vazio é omitido, seção inteira vazia some, sem lixo', () => {
    const md = buildDossierMarkdown(
      makeLead(),
      makeAudit({ google_business_name: 'Clínica Sorriso', google_notes: '   ' }),
    )
    // Google tem só o nome preenchido → seção aparece com uma linha
    expect(md).toContain('## GOOGLE\nNome exibido no Google: Clínica Sorriso')
    // string só com espaços não vira linha
    expect(md).not.toContain('Observações sobre Google:')
    // seções sem nenhum dado somem por completo
    expect(md).not.toContain('## WEBSITE')
    expect(md).not.toContain('## INSTAGRAM')
    expect(md).not.toContain('## PAGESPEED MOBILE')
    // obrigatórias continuam
    expect(md).toContain('## IDENTIFICAÇÃO')
    expect(md).toContain('## DIAGNÓSTICO')
  })

  it('sem auditoria: só IDENTIFICAÇÃO e DIAGNÓSTICO, com "Não analisado" explícito', () => {
    const md = buildDossierMarkdown(makeLead(), null)
    expect(md).toContain('## IDENTIFICAÇÃO')
    expect(md).toContain('## DIAGNÓSTICO')
    expect(md).not.toContain('## ORIGEM')
    expect(md).not.toContain('## GOOGLE')
    expect(md).toContain('Data da análise: Não analisado')
    expect(md).toContain('Score digital: Não analisado')
    expect(md).toContain('Completude: Não analisado')
    expect(md).toContain('Principais problemas digitais encontrados: Não analisado')
  })

  it('identificação sem dado do lead → "Não informado", sem inventar', () => {
    const md = buildDossierMarkdown(
      makeLead({ companyName: null, contactName: '   ', phone: null, email: null, interest: null, source: null }),
      makeAudit(),
    )
    expect(md).toContain('Empresa: Não informado')
    expect(md).toContain('Nome: Não informado')
    expect(md).toContain('Telefone: Não informado')
  })

  it('`nao` aparece como "Não"; `null` no mesmo campo não gera linha', () => {
    const mdNao = buildDossierMarkdown(makeLead(), makeAudit({ website_exists: 'nao' }))
    expect(mdNao).toContain('## WEBSITE\nPossui site?: Não')

    const mdNull = buildDossierMarkdown(makeLead(), makeAudit({ website_exists: null }))
    expect(mdNull).not.toContain('Possui site?:')
    expect(mdNull).not.toContain('## WEBSITE')
  })

  it('valor 0 permanece na saída (não é vazio)', () => {
    const md = buildDossierMarkdown(
      makeLead(),
      makeAudit({ google_business_name: 'x', google_reviews_count: 0 }),
    )
    expect(md).toContain('Quantidade de avaliações: 0')
  })

  it('DIAGNÓSTICO: score/completude persistidos + múltiplas oportunidades traduzidas', () => {
    const spy = vi.spyOn(scoreModule, 'computeDigitalScore')
    const md = buildDossierMarkdown(
      makeLead(),
      makeAudit({
        digital_score: 57,
        digital_score_completeness: 61,
        digital_opportunities: ['website', 'performance', 'conversao'],
      }),
    )
    expect(md).toContain('Score digital: 57')
    expect(md).toContain('Completude: 61%')
    expect(md).toContain('Oportunidades identificadas: Website, Performance do site, Conversão')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('oportunidade fora do vocabulário é preservada verbatim', () => {
    const md = buildDossierMarkdown(
      makeLead(),
      makeAudit({ digital_opportunities: ['website', 'valor_desconhecido'] as string[] }),
    )
    expect(md).toContain('Oportunidades identificadas: Website, valor_desconhecido')
  })

  it('enum fora do vocabulário conhecido não some — cai para o valor cru', () => {
    const md = buildDossierMarkdown(
      makeLead(),
      makeAudit({ pagespeed_field_data_available: 'talvez' as never }),
    )
    expect(md).toContain('Dados de campo disponíveis?: talvez')
  })

  it('texto livre e URL passam sem tradução (só trim)', () => {
    const md = buildDossierMarkdown(
      makeLead(),
      makeAudit({ google_business_name: '  Clínica Sorriso  ', google_search_result_url: ' https://x.com ' }),
    )
    expect(md).toContain('Nome exibido no Google: Clínica Sorriso')
    expect(md).toContain('URL usada para encontrar a empresa: https://x.com')
  })
})

// ---------------------------------------------------------------------------
// CSV achatado
// ---------------------------------------------------------------------------

describe('CSV', () => {
  it('DOSSIER_CSV_COLUMNS: identificação + colunas de dado + score, ordem estável', () => {
    expect(DOSSIER_CSV_COLUMNS.slice(0, 8)).toEqual([
      'lead_title',
      'company_name',
      'contact_name',
      'phone',
      'email',
      'interest',
      'source',
      'value_cents',
    ])
    expect(DOSSIER_CSV_COLUMNS.slice(-2)).toEqual(['digital_score', 'digital_score_completeness'])
    expect(DOSSIER_CSV_COLUMNS).toHaveLength(8 + 101 + 2)
  })

  it('buildDossierCsvRow alinha à contagem de colunas, cheio ou parcial', () => {
    const full = buildDossierCsvRow(makeLead(), makeRichAudit())
    const partial = buildDossierCsvRow(makeLead(), makeAudit({ google_rating: 4.1 }))
    const none = buildDossierCsvRow(makeLead({ companyName: null, phone: null, email: null, interest: null, source: null, contactName: null }), null)
    expect(full).toHaveLength(DOSSIER_CSV_COLUMNS.length)
    expect(partial).toHaveLength(DOSSIER_CSV_COLUMNS.length)
    expect(none).toHaveLength(DOSSIER_CSV_COLUMNS.length)
  })

  it('enum exportado com o valor do banco, não o rótulo; array por "|"; 0 preservado; null vazio', () => {
    const cells = buildDossierCsvRow(
      makeLead(),
      makeAudit({
        google_result_type: 'nao_identificado',
        google_reviews_count: 0,
        digital_opportunities: ['website', 'crm'],
      }),
    )
    const at = (name: string) => cells[DOSSIER_CSV_COLUMNS.indexOf(name)]
    expect(at('google_result_type')).toBe('nao_identificado')
    expect(at('google_reviews_count')).toBe('0')
    expect(at('digital_opportunities')).toBe('website|crm')
    expect(at('google_rating')).toBe('')
    expect(at('company_name')).toBe('Clínica Sorriso Uberlândia')
    expect(at('value_cents')).toBe('250000')
  })

  it('identificação nula vira célula vazia', () => {
    const cells = buildDossierCsvRow(
      makeLead({ companyName: null, contactName: null, phone: null, email: null, interest: null, source: null }),
      null,
    )
    const at = (name: string) => cells[DOSSIER_CSV_COLUMNS.indexOf(name)]
    expect(at('company_name')).toBe('')
    expect(at('contact_name')).toBe('')
    expect(at('phone')).toBe('')
    expect(at('email')).toBe('')
    expect(at('interest')).toBe('')
    expect(at('source')).toBe('')
    expect(at('lead_title')).toBe('Landing page para clínica odontológica')
  })

  it('buildDossierCsv: BOM, cabeçalho, CRLF entre linhas e ao final', () => {
    const csv = buildDossierCsv([buildDossierCsvRow(makeLead(), makeAudit())])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const withoutBom = csv.slice(1)
    expect(withoutBom.startsWith('lead_title,company_name,')).toBe(true)
    expect(withoutBom).toContain('\r\n')
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(withoutBom.split('\r\n')).toHaveLength(3) // header + 1 linha + '' final
  })

  it('escapa vírgula, aspas e quebra de linha dentro de observações (RFC 4180)', () => {
    const row = buildDossierCsvRow(
      makeLead(),
      makeAudit({ conversion_friction_notes: 'Botão "agendar", link quebrado\nCTA sumido' }),
    )
    const csv = buildDossierCsv([row])
    expect(csv).toContain('"Botão ""agendar"", link quebrado\nCTA sumido"')
  })

  it('título do lead com vírgula é escapado no cabeçalho de dados', () => {
    const csv = buildDossierCsv([buildDossierCsvRow(makeLead({ title: 'Loja, franquia' }), null)])
    expect(csv).toContain('"Loja, franquia"')
  })

  it('sem linhas: só BOM + cabeçalho + CRLF', () => {
    const csv = buildDossierCsv([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe(`${DOSSIER_CSV_COLUMNS.join(',')}\r\n`)
  })
})

// ---------------------------------------------------------------------------
// Determinismo
// ---------------------------------------------------------------------------

describe('determinismo', () => {
  it('mesmo input → saída idêntica (Markdown, JSON, CSV)', () => {
    const lead = makeLead()
    const audit = makeRichAudit()

    expect(buildDossierMarkdown(lead, audit)).toBe(buildDossierMarkdown(lead, audit))
    expect(JSON.stringify(buildDossierJson(lead, audit))).toBe(
      JSON.stringify(buildDossierJson(lead, audit)),
    )
    const row = () => buildDossierCsvRow(lead, audit)
    expect(buildDossierCsv([row(), row()])).toBe(buildDossierCsv([row(), row()]))
  })

  it('a ordem das colunas do CSV não muda com preenchimento parcial', () => {
    const header = buildDossierCsv([]).slice(1).split('\r\n')[0]
    const fromFull = buildDossierCsv([buildDossierCsvRow(makeLead(), makeRichAudit())]).slice(1).split('\r\n')[0]
    const fromPartial = buildDossierCsv([buildDossierCsvRow(makeLead(), makeAudit())]).slice(1).split('\r\n')[0]
    expect(fromFull).toBe(header)
    expect(fromPartial).toBe(header)
  })
})
