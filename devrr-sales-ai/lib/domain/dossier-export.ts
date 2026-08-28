// Exportação do dossiê digital (7.8): JSON aninhado, Markdown para IA e CSV
// achatado. Lógica **pura** — sem `@/lib/supabase`, sem `next`, sem `ai`
// (regra de dependência da ARCHITECTURE.md). A exportação é uma REPRESENTAÇÃO
// fiel da linha já persistida em `sales.lead_digital_audits`:
//
//   • não recalcula `digital_score`/`digital_score_completeness` — usa os
//     valores que a action da 7.4 gravou (D-038);
//   • não normaliza nada, não infere campo ausente, não converte `null` em
//     `nao`;
//   • preserva enums especiais (`nao_identificado`, `nao_se_aplica`,
//     `nao_analisado`, `dados_insuficientes`) verbatim — no CSV como o valor
//     canônico do banco, no Markdown traduzidos por `digital-labels.ts`;
//   • datas de calendário (`researched_at`, `instagram_last_post_date`) e o
//     instante `pagespeed_analyzed_at` passam como o driver os entregou, sem
//     `new Date()` / UTC.
//
// EXCEÇÃO à regra de import do domínio, deliberada e exigida pelo texto da
// 7.8 ("prefira receber `DigitalAudit` tipado completo; não crie outro tipo
// manual com 100 propriedades"): este arquivo faz `import type` de
// `database.types.ts`. É import SÓ DE TIPO (zero runtime — o arquivo de tipos
// não importa nada) e é o que permite a checagem de paridade em tempo de
// compilação abaixo: uma coluna nova em `lead_digital_audits` (via
// `gen:types`, D-042) que ninguém mapear para uma seção quebra o `typecheck`.

import type { Database } from '@/lib/types/database.types'
import {
  ENUM_LABELS,
  DIGITAL_OPPORTUNITY_OPTIONS,
  FIELD_LABELS,
  NOT_ANALYZED_LABEL,
  type DossierEnumGroup,
} from '@/lib/domain/digital-labels'
import { formatMsAsSeconds } from '@/lib/domain/pagespeed'
import { formatBRL } from '@/lib/domain/money'

/** Linha completa de `sales.lead_digital_audits` (as 109 colunas). Mesmo tipo
 * que `lib/queries/digital-audits-core.ts` expõe; redeclarado aqui a partir
 * da fonte para não acoplar o domínio à camada de `queries/`. */
export type DigitalAudit = Database['sales']['Tables']['lead_digital_audits']['Row']

type AuditColumn = keyof DigitalAudit

/** Valor cru de qualquer coluna do dossiê. Enums são strings; oportunidades
 * são `string[]`; o resto é `string | number | null`. */
export type DossierValue = string | number | string[] | null

/**
 * Dados de identificação do lead que entram no dossiê. O domínio declara a
 * própria entrada (mesmo princípio de `digital-score.ts`): o Server Component
 * da 7.9 monta isto a partir de `LeadWithDisplay` — `companyName` vem de
 * `contact.company_name` (a empresa real), NUNCA de `lead.title` (que é o
 * título do lead).
 */
export interface DossierLeadInput {
  /** `leads.title` — título do lead, não a empresa. */
  title: string
  /** `contacts.company_name` — a empresa real. */
  companyName: string | null
  /** `contacts.full_name`. */
  contactName: string | null
  /** `contacts.phone`. */
  phone: string | null
  /** `contacts.email`. */
  email: string | null
  /** `leads.interest`. */
  interest: string | null
  /** Nome da fonte (`lead_sources.name`), já resolvido. */
  source: string | null
  /** `leads.value_cents` — unidade canônica de dinheiro do produto. */
  valueCents: number
}

// ---------------------------------------------------------------------------
// Mapa de paridade: cada coluna do dossiê pertence a exatamente um destino
// ---------------------------------------------------------------------------

const PROSPECTING_COLUMNS = [
  'researched_at',
  'search_query',
  'search_location',
  'found_on_google',
  'google_result_type',
  'google_ads_active',
  'google_ads_position',
  'google_organic_position',
  'google_search_result_url',
] as const

const GOOGLE_COLUMNS = [
  'google_business_profile',
  'google_business_name',
  'google_business_category',
  'google_rating',
  'google_reviews_count',
  'google_recent_reviews',
  'google_replies_reviews',
  'google_has_photos',
  'google_has_hours',
  'google_has_phone',
  'google_has_website',
  'google_easy_whatsapp',
  'google_has_booking',
  'google_profile_completeness',
  'google_notes',
] as const

const WEBSITE_COLUMNS = [
  'website_exists',
  'website_url',
  'website_https',
  'website_mobile_friendly',
  'website_visual_quality',
  'website_perceived_speed',
  'website_services_clear',
  'website_has_target_service_page',
  'website_target_service_url',
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
  'website_notes',
] as const

const CONVERSION_COLUMNS = [
  'conversion_clear_contact_path',
  'conversion_clicks_to_whatsapp',
  'conversion_cta_above_fold',
  'conversion_repeated_cta',
  'conversion_alternative_capture',
  'conversion_has_friction',
  'conversion_friction_notes',
] as const

const INSTAGRAM_COLUMNS = [
  'instagram_exists',
  'instagram_username',
  'instagram_url',
  'instagram_has_bio_link',
  'instagram_clear_bio',
  'instagram_has_cta',
  'instagram_easy_whatsapp',
  'instagram_easy_website',
  'instagram_active',
  'instagram_last_post_date',
  'instagram_visual_quality',
  'instagram_services_content',
  'instagram_content_cta',
  'instagram_notes',
] as const

const PAGESPEED_MOBILE_COLUMNS = [
  'pagespeed_mobile_performance',
  'pagespeed_mobile_accessibility',
  'pagespeed_mobile_best_practices',
  'pagespeed_mobile_seo',
  'pagespeed_mobile_core_web_vitals',
  'pagespeed_mobile_lcp',
  'pagespeed_mobile_inp',
  'pagespeed_mobile_cls',
  'pagespeed_mobile_fcp',
  'pagespeed_mobile_tbt',
  'pagespeed_mobile_speed_index',
  'pagespeed_mobile_report_url',
] as const

const PAGESPEED_DESKTOP_COLUMNS = [
  'pagespeed_desktop_performance',
  'pagespeed_desktop_accessibility',
  'pagespeed_desktop_best_practices',
  'pagespeed_desktop_seo',
  'pagespeed_desktop_core_web_vitals',
  'pagespeed_desktop_lcp',
  'pagespeed_desktop_inp',
  'pagespeed_desktop_cls',
  'pagespeed_desktop_fcp',
  'pagespeed_desktop_tbt',
  'pagespeed_desktop_speed_index',
  'pagespeed_desktop_report_url',
] as const

const PAGESPEED_GENERAL_COLUMNS = [
  'pagespeed_analyzed_url',
  'pagespeed_analyzed_at',
  'pagespeed_field_data_available',
  'pagespeed_notes',
] as const

const DIAGNOSTIC_COLUMNS = [
  'digital_problems',
  'digital_strengths',
  'digital_opportunities',
  'digital_sales_priority',
  'digital_opportunity_score',
  'digital_opportunity_reason',
] as const

/**
 * `digital_score` e `digital_score_completeness`: são colunas da linha, mas
 * NÃO são entrada do dossiê (D-038). Aparecem só no bloco de diagnóstico /
 * resumo da saída, com o valor persistido — nunca recalculadas aqui.
 */
const DIAGNOSTIC_SCORE_COLUMNS = ['digital_score', 'digital_score_completeness'] as const

/**
 * Colunas técnicas de `lead_digital_audits` deliberadamente FORA de toda
 * exportação de dados: identidade da linha e metadados de rastreio. Listadas
 * explicitamente para a checagem de paridade (schema × export) não as
 * confundir com campo esquecido.
 */
export const DOSSIER_TECHNICAL_COLUMNS = [
  'id',
  'org_id',
  'lead_id',
  'created_by',
  'created_at',
  'updated_at',
] as const

const SECTION_COLUMN_GROUPS = {
  prospecting: PROSPECTING_COLUMNS,
  google: GOOGLE_COLUMNS,
  website: WEBSITE_COLUMNS,
  conversion: CONVERSION_COLUMNS,
  instagram: INSTAGRAM_COLUMNS,
  pagespeed_mobile: PAGESPEED_MOBILE_COLUMNS,
  pagespeed_desktop: PAGESPEED_DESKTOP_COLUMNS,
  pagespeed_general: PAGESPEED_GENERAL_COLUMNS,
  diagnostic: DIAGNOSTIC_COLUMNS,
} as const satisfies Record<string, readonly AuditColumn[]>

/**
 * Toda coluna exportável como DADO do dossiê, na ordem de saída (seção a
 * seção). São exatamente os 101 campos de entrada do schema (7.3) menos
 * `lead_id` — o teste de paridade cruza esta lista com
 * `DIGITAL_AUDIT_FIELD_NAMES` e falha se divergir.
 */
export const DOSSIER_DATA_COLUMNS: readonly AuditColumn[] = [
  ...PROSPECTING_COLUMNS,
  ...GOOGLE_COLUMNS,
  ...WEBSITE_COLUMNS,
  ...CONVERSION_COLUMNS,
  ...INSTAGRAM_COLUMNS,
  ...PAGESPEED_MOBILE_COLUMNS,
  ...PAGESPEED_DESKTOP_COLUMNS,
  ...PAGESPEED_GENERAL_COLUMNS,
  ...DIAGNOSTIC_COLUMNS,
]

export { DIAGNOSTIC_SCORE_COLUMNS as DOSSIER_DIAGNOSTIC_SCORE_COLUMNS }

/**
 * Prova em tempo de compilação: toda coluna de `lead_digital_audits` cai em
 * exatamente um destino — uma seção de dados, os dois campos de score, ou a
 * lista técnica. Uma coluna nova que entre no schema (via `gen:types`, D-042)
 * sem ser mapeada deixa `UnmappedAuditColumn` de ser `never`, e a atribuição
 * `true` abaixo para de compilar.
 */
type MappedAuditColumn =
  | (typeof SECTION_COLUMN_GROUPS)[keyof typeof SECTION_COLUMN_GROUPS][number]
  | (typeof DIAGNOSTIC_SCORE_COLUMNS)[number]
  | (typeof DOSSIER_TECHNICAL_COLUMNS)[number]

type UnmappedAuditColumn = Exclude<AuditColumn, MappedAuditColumn>

const _everyAuditColumnMapped: [UnmappedAuditColumn] extends [never] ? true : never = true
void _everyAuditColumnMapped

// ---------------------------------------------------------------------------
// Enum → grupo de rótulos (para a saída humana do Markdown)
// ---------------------------------------------------------------------------

/**
 * Coluna de enum → vocabulário de `ENUM_LABELS` (D-036). Só o Markdown usa
 * (JSON e CSV carregam o valor canônico). A anotação de tipo garante em
 * compile-time que a chave é coluna real e o valor é grupo real; o teste
 * confere que a cobertura bate com as 51 colunas de enum do schema.
 */
const ENUM_COLUMN_GROUP: Partial<Record<AuditColumn, DossierEnumGroup>> = {
  found_on_google: 'tri_state',
  google_result_type: 'google_result_type',
  google_ads_active: 'tri_state',
  google_business_profile: 'tri_state',
  google_recent_reviews: 'tri_state',
  google_replies_reviews: 'frequency_level',
  google_has_photos: 'tri_state',
  google_has_hours: 'tri_state',
  google_has_phone: 'tri_state',
  google_has_website: 'tri_state',
  google_easy_whatsapp: 'tri_state',
  google_has_booking: 'tri_state',
  google_profile_completeness: 'quality_level',
  website_exists: 'tri_state',
  website_https: 'tri_state',
  website_mobile_friendly: 'tri_state',
  website_visual_quality: 'quality_level',
  website_perceived_speed: 'speed_level',
  website_services_clear: 'tri_state',
  website_has_target_service_page: 'tri_state',
  website_has_clear_cta: 'tri_state',
  website_has_whatsapp: 'tri_state',
  website_whatsapp_clickable: 'tri_state',
  website_whatsapp_floating: 'tri_state',
  website_has_contact_form: 'tri_state',
  website_has_online_booking: 'tri_state',
  website_phone_visible: 'tri_state',
  website_address_visible: 'tri_state',
  website_has_social_proof: 'tri_state',
  website_has_clear_differentiators: 'tri_state',
  website_has_team: 'tri_state',
  website_content_updated: 'tri_state',
  conversion_clear_contact_path: 'tri_state',
  conversion_cta_above_fold: 'tri_state',
  conversion_repeated_cta: 'tri_state',
  conversion_alternative_capture: 'tri_state',
  conversion_has_friction: 'tri_state',
  instagram_exists: 'tri_state',
  instagram_has_bio_link: 'tri_state',
  instagram_clear_bio: 'tri_state',
  instagram_has_cta: 'tri_state',
  instagram_easy_whatsapp: 'tri_state',
  instagram_easy_website: 'tri_state',
  instagram_active: 'activity_level',
  instagram_visual_quality: 'quality_level',
  instagram_services_content: 'tri_state',
  instagram_content_cta: 'frequency_level',
  pagespeed_mobile_core_web_vitals: 'cwv_status',
  pagespeed_desktop_core_web_vitals: 'cwv_status',
  pagespeed_field_data_available: 'tri_state',
  digital_sales_priority: 'sales_priority',
}

export { ENUM_COLUMN_GROUP as DOSSIER_ENUM_COLUMN_GROUP }

/** Colunas (mobile + desktop) cuja métrica está em ms e é exibida em segundos
 * pelo helper compartilhado de `pagespeed.ts` — LCP/FCP/TBT/Speed Index. */
const MS_AS_SECONDS_COLUMNS = new Set<AuditColumn>([
  'pagespeed_mobile_lcp',
  'pagespeed_mobile_fcp',
  'pagespeed_mobile_tbt',
  'pagespeed_mobile_speed_index',
  'pagespeed_desktop_lcp',
  'pagespeed_desktop_fcp',
  'pagespeed_desktop_tbt',
  'pagespeed_desktop_speed_index',
])

/** INP fica em ms (sem conversão para segundos, DOSSIE §7). */
const MS_PLAIN_COLUMNS = new Set<AuditColumn>(['pagespeed_mobile_inp', 'pagespeed_desktop_inp'])

// ---------------------------------------------------------------------------
// Helpers de valor
// ---------------------------------------------------------------------------

/** String em branco ou array vazio = vazio. `0` e `false` NÃO são vazios
 * (medição é dado); `nao` também não (é resposta negativa). `null` é tratado
 * pelos chamadores antes de chegar aqui. */
function isBlankValue(value: string | number | string[]): boolean {
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function auditValue(audit: DigitalAudit | null, column: AuditColumn): DossierValue {
  return audit ? (audit[column] as DossierValue) : null
}

function enumLabel(group: DossierEnumGroup, value: string): string {
  const table: Record<string, string> = ENUM_LABELS[group]
  // Valor fora do vocabulário conhecido é preservado verbatim, nunca some.
  return table[value] ?? value
}

function opportunityLabel(value: string): string {
  const option = DIGITAL_OPPORTUNITY_OPTIONS.find((entry) => entry.value === value)
  return option ? option.label : value
}

/** Rótulo PT da coluna. Toda coluna de `DOSSIER_DATA_COLUMNS` tem entrada em
 * `FIELD_LABELS` (7.6) — o teste de paridade prova; o acesso assume presença. */
function columnLabel(column: AuditColumn): string {
  return FIELD_LABELS[column] as string
}

/** Valor de uma coluna formatado para a saída humana (Markdown). `null` já
 * foi filtrado pelo chamador. */
function humanValue(column: AuditColumn, value: string | number | string[]): string {
  if (Array.isArray(value)) {
    return value.map(opportunityLabel).join(', ')
  }
  if (typeof value === 'number') {
    if (MS_AS_SECONDS_COLUMNS.has(column)) return formatMsAsSeconds(value)
    if (MS_PLAIN_COLUMNS.has(column)) return `${value} ms`
    return String(value)
  }
  const group = ENUM_COLUMN_GROUP[column]
  if (group) return enumLabel(group, value)
  return value.trim()
}

const NOT_PROVIDED_LABEL = 'Não informado'

/** Campo de identificação do lead para o Markdown (bloco sempre presente). */
function leadField(value: string | null): string {
  return value && value.trim() !== '' ? value.trim() : NOT_PROVIDED_LABEL
}

// ---------------------------------------------------------------------------
// JSON aninhado (DOSSIE §13)
// ---------------------------------------------------------------------------

export type DossierJsonSection = Record<string, DossierValue>

export interface DossierJson {
  lead: {
    title: string
    company_name: string | null
    contact_name: string | null
    phone: string | null
    email: string | null
    interest: string | null
    source: string | null
    value_cents: number
  }
  /**
   * `true` quando existe uma linha em `sales.lead_digital_audits` para o lead —
   * inclusive a auditoria "iniciada e não preenchida", em que quase toda coluna
   * está `null`. `false` = lead nunca analisado (sem linha). Sem este campo, os
   * dois casos gerariam objetos idênticos (todas as seções nulas + `digital_score`
   * null), apagando a distinção que o resto do produto preserva de propósito
   * (plano 7.7 / D-035). Mesma semântica no export individual e no em massa.
   */
  audit_exists: boolean
  prospecting: DossierJsonSection
  google: DossierJsonSection
  website: DossierJsonSection
  conversion: DossierJsonSection
  instagram: DossierJsonSection
  pagespeed: {
    analyzed_url: string | null
    analyzed_at: string | null
    field_data_available: string | null
    notes: string | null
    mobile: DossierJsonSection
    desktop: DossierJsonSection
  }
  diagnostic: DossierJsonSection
}

function pickSection(audit: DigitalAudit | null, columns: readonly AuditColumn[]): DossierJsonSection {
  const out: DossierJsonSection = {}
  for (const column of columns) {
    out[column] = auditValue(audit, column)
  }
  return out
}

function pickStripped(
  audit: DigitalAudit | null,
  columns: readonly AuditColumn[],
  prefixLength: number,
): DossierJsonSection {
  const out: DossierJsonSection = {}
  for (const column of columns) {
    out[column.slice(prefixLength)] = auditValue(audit, column)
  }
  return out
}

/**
 * Objeto aninhado nas 9 chaves do DOSSIE §13 —
 * `lead · prospecting · google · website · conversion · instagram ·
 * pagespeed.mobile · pagespeed.desktop · diagnostic`. Inclui `null`
 * explícito (ausência é informação). Nunca achatado.
 */
export function buildDossierJson(lead: DossierLeadInput, audit: DigitalAudit | null): DossierJson {
  return {
    lead: {
      title: lead.title,
      company_name: lead.companyName,
      contact_name: lead.contactName,
      phone: lead.phone,
      email: lead.email,
      interest: lead.interest,
      source: lead.source,
      value_cents: lead.valueCents,
    },
    audit_exists: audit !== null,
    prospecting: pickSection(audit, PROSPECTING_COLUMNS),
    google: pickSection(audit, GOOGLE_COLUMNS),
    website: pickSection(audit, WEBSITE_COLUMNS),
    conversion: pickSection(audit, CONVERSION_COLUMNS),
    instagram: pickSection(audit, INSTAGRAM_COLUMNS),
    pagespeed: {
      analyzed_url: auditValue(audit, 'pagespeed_analyzed_url') as string | null,
      analyzed_at: auditValue(audit, 'pagespeed_analyzed_at') as string | null,
      field_data_available: auditValue(audit, 'pagespeed_field_data_available') as string | null,
      notes: auditValue(audit, 'pagespeed_notes') as string | null,
      mobile: pickStripped(audit, PAGESPEED_MOBILE_COLUMNS, 'pagespeed_mobile_'.length),
      desktop: pickStripped(audit, PAGESPEED_DESKTOP_COLUMNS, 'pagespeed_desktop_'.length),
    },
    diagnostic: {
      ...pickSection(audit, DIAGNOSTIC_COLUMNS),
      digital_score: auditValue(audit, 'digital_score'),
      digital_score_completeness: auditValue(audit, 'digital_score_completeness'),
    },
  }
}

// ---------------------------------------------------------------------------
// Markdown para IA (DOSSIE §14)
// ---------------------------------------------------------------------------

const MARKDOWN_DATA_SECTIONS: { heading: string; columns: readonly AuditColumn[] }[] = [
  { heading: 'ORIGEM', columns: PROSPECTING_COLUMNS },
  { heading: 'GOOGLE', columns: GOOGLE_COLUMNS },
  { heading: 'WEBSITE', columns: WEBSITE_COLUMNS },
  { heading: 'CONVERSÃO', columns: CONVERSION_COLUMNS },
  { heading: 'INSTAGRAM', columns: INSTAGRAM_COLUMNS },
  { heading: 'PAGESPEED', columns: PAGESPEED_GENERAL_COLUMNS },
  { heading: 'PAGESPEED MOBILE', columns: PAGESPEED_MOBILE_COLUMNS },
  { heading: 'PAGESPEED DESKTOP', columns: PAGESPEED_DESKTOP_COLUMNS },
]

function identificationLines(lead: DossierLeadInput, audit: DigitalAudit | null): string[] {
  const researched = audit ? audit.researched_at : null
  return [
    '## IDENTIFICAÇÃO',
    `Empresa: ${leadField(lead.companyName)}`,
    `Título do lead: ${leadField(lead.title)}`,
    `Nome: ${leadField(lead.contactName)}`,
    `Telefone: ${leadField(lead.phone)}`,
    `E-mail: ${leadField(lead.email)}`,
    `Interesse: ${leadField(lead.interest)}`,
    `Fonte: ${leadField(lead.source)}`,
    `Valor potencial: ${formatBRL(lead.valueCents)}`,
    `Data da análise: ${researched ?? NOT_ANALYZED_LABEL}`,
  ]
}

function dataSectionLines(
  section: { heading: string; columns: readonly AuditColumn[] },
  audit: DigitalAudit | null,
): string[] {
  const body: string[] = []
  for (const column of section.columns) {
    // `researched_at` já aparece em IDENTIFICAÇÃO ("Data da análise").
    if (column === 'researched_at') continue
    const value = auditValue(audit, column)
    if (value === null || isBlankValue(value)) continue
    body.push(`${columnLabel(column)}: ${humanValue(column, value)}`)
  }
  if (body.length === 0) return []
  return [`## ${section.heading}`, ...body]
}

function diagnosticLines(audit: DigitalAudit | null): string[] {
  const score = audit ? audit.digital_score : null
  const completeness = audit ? audit.digital_score_completeness : null
  const lines = [
    '## DIAGNÓSTICO',
    // Auditoria "iniciada e vazia" tem score null igual a "nunca analisada" — a
    // IA precisa saber qual é o caso (pedir para completar vs. pedir para
    // começar). Ver `audit_exists` no JSON.
    `Auditoria digital: ${audit ? 'iniciada' : 'não iniciada'}`,
    `Score digital: ${score === null ? NOT_ANALYZED_LABEL : String(score)}`,
    `Completude: ${completeness === null ? NOT_ANALYZED_LABEL : `${completeness}%`}`,
  ]
  for (const column of DIAGNOSTIC_COLUMNS) {
    const value = auditValue(audit, column)
    const rendered =
      value === null || isBlankValue(value) ? NOT_ANALYZED_LABEL : humanValue(column, value)
    lines.push(`${columnLabel(column)}: ${rendered}`)
  }
  return lines
}

/**
 * Markdown limpo para colar direto numa IA. Layout do DOSSIE §14: rótulos PT
 * de `digital-labels.ts`, segundos para LCP/FCP/TBT/Speed Index, `R$` para o
 * valor. Campo vazio é omitido; uma seção de dados inteiramente vazia some.
 * IDENTIFICAÇÃO e DIAGNÓSTICO aparecem SEMPRE (com "Não analisado"/"Não
 * informado" explícito) — é o que a IA precisa para saber o que falta.
 */
export function buildDossierMarkdown(lead: DossierLeadInput, audit: DigitalAudit | null): string {
  const blocks: string[][] = [['# DOSSIÊ DIGITAL DO LEAD'], identificationLines(lead, audit)]

  for (const section of MARKDOWN_DATA_SECTIONS) {
    const lines = dataSectionLines(section, audit)
    if (lines.length > 0) blocks.push(lines)
  }

  blocks.push(diagnosticLines(audit))

  return blocks.map((lines) => lines.join('\n')).join('\n\n') + '\n'
}

// ---------------------------------------------------------------------------
// CSV achatado (DOSSIE §15) — RFC 4180
// ---------------------------------------------------------------------------

const CSV_LEAD_COLUMNS = [
  'lead_title',
  'company_name',
  'contact_name',
  'phone',
  'email',
  'interest',
  'source',
  'value_cents',
] as const

/**
 * Ordem estável das colunas do CSV: identificação do lead, o marcador
 * `audit_exists`, depois todas as colunas de dado do dossiê na ordem das
 * seções, depois os dois campos de score. Nomes iguais aos das colunas do
 * banco (menos o prefixo `lead_` da identificação). Não muda quando o dossiê
 * está parcialmente preenchido — campo ausente vira célula vazia, nunca coluna
 * a menos.
 *
 * `audit_exists` (`true`/`false`): mesma distinção do JSON — linha de auditoria
 * existente (mesmo que vazia) vs. lead nunca analisado. Sem ela, os dois casos
 * dariam linhas idênticas de células vazias.
 */
export const DOSSIER_CSV_COLUMNS: readonly string[] = [
  ...CSV_LEAD_COLUMNS,
  'audit_exists',
  ...DOSSIER_DATA_COLUMNS,
  ...DIAGNOSTIC_SCORE_COLUMNS,
]

function csvLeadCell(column: (typeof CSV_LEAD_COLUMNS)[number], lead: DossierLeadInput): string {
  switch (column) {
    case 'lead_title':
      return lead.title
    case 'company_name':
      return lead.companyName ?? ''
    case 'contact_name':
      return lead.contactName ?? ''
    case 'phone':
      return lead.phone ?? ''
    case 'email':
      return lead.email ?? ''
    case 'interest':
      return lead.interest ?? ''
    case 'source':
      return lead.source ?? ''
    case 'value_cents':
      return String(lead.valueCents)
  }
}

/** Célula de coluna de auditoria: valor canônico do banco (enum cru, `0`
 * preservado), array por `|`, `null` vira célula vazia. */
function csvAuditCell(value: DossierValue): string {
  if (value === null) return ''
  if (Array.isArray(value)) return value.join('|')
  return String(value)
}

/**
 * Uma linha de CSV como array de células CRUAS (sem escape), alinhada a
 * `DOSSIER_CSV_COLUMNS`. O escape/junção fica em `buildDossierCsv`.
 */
export function buildDossierCsvRow(lead: DossierLeadInput, audit: DigitalAudit | null): string[] {
  const cells: string[] = CSV_LEAD_COLUMNS.map((column) => csvLeadCell(column, lead))
  // Mesma string que uma coluna booleana do banco renderiza (`String(true)`).
  cells.push(audit !== null ? 'true' : 'false')
  for (const column of DOSSIER_DATA_COLUMNS) {
    cells.push(csvAuditCell(auditValue(audit, column)))
  }
  for (const column of DIAGNOSTIC_SCORE_COLUMNS) {
    cells.push(csvAuditCell(auditValue(audit, column)))
  }
  return cells
}

/** Escapa uma célula por RFC 4180: aspas, vírgula ou quebra de linha → toda a
 * célula entre aspas duplas, com as aspas internas duplicadas. */
function escapeRfc4180Cell(cell: string): string {
  if (/["\r\n,]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`
  }
  return cell
}

/** Caracteres que abrem fórmula em Excel / LibreOffice Calc / Google Sheets. */
const CSV_FORMULA_LEADS = new Set(['=', '+', '-', '@'])

/**
 * Neutraliza spreadsheet formula injection numa célula: se o primeiro
 * caractere significativo (ignorando espaços e caracteres de controle à
 * esquerda) for `=` `+` `-` `@`, prefixa `'` (apóstrofo). Excel e LibreOffice
 * passam a tratar a célula inteira como texto literal e não avaliam a fórmula;
 * o apóstrofo inicial não aparece na célula. `"   =SUM(1,1)"` também é coberto
 * (o espaço à esquerda não protege a fórmula no Excel).
 *
 * Número real gerado pelo sistema NÃO é afetado — `value_cents`, scores,
 * métricas, inclusive negativos (`-15`): `/^-?\d+(\.\d+)?$/` sobre o valor
 * aparado devolve `true` e a célula passa intacta. Só texto que *parece*
 * fórmula (`-1+1`, `=HYPERLINK(...)`, `@x`, telefone `+55 ...` — que o Excel
 * também quebra) recebe o prefixo. É a representação CSV que carrega essa
 * defesa; JSON e Markdown entregam o valor original.
 */
function guardCsvFormula(cell: string): string {
  // Primeiro caractere que nao seja espaco/controle C0 (code point <= 0x20).
  let i = 0
  while (i < cell.length && cell.charCodeAt(i) <= 0x20) i += 1
  const lead = cell.charAt(i)
  if (lead === '' || !CSV_FORMULA_LEADS.has(lead)) return cell
  // Número real do sistema (inclusive negativo) passa intacto.
  if (/^-?\d+(\.\d+)?$/.test(cell.trim())) return cell
  return `'${cell}`
}

/**
 * Único ponto de serialização de célula do CSV: primeiro neutraliza formula
 * injection (dado textual), depois aplica o escape RFC 4180.
 */
function serializeCsvCell(cell: string): string {
  return escapeRfc4180Cell(guardCsvFormula(cell))
}

/** BOM UTF-8 (U+FEFF) para o Excel pt-BR não comer os acentos. */
const CSV_BOM = String.fromCharCode(0xfeff) // '﻿'

/**
 * Monta o CSV completo: BOM + cabeçalho + linhas, separador vírgula, `\r\n`
 * entre linhas (e ao final). Recebe as linhas cruas de `buildDossierCsvRow`.
 */
export function buildDossierCsv(rows: readonly string[][]): string {
  const allRows: readonly (readonly string[])[] = [DOSSIER_CSV_COLUMNS, ...rows]
  const body = allRows.map((row) => row.map(serializeCsvCell).join(',')).join('\r\n')
  return `${CSV_BOM}${body}\r\n`
}
