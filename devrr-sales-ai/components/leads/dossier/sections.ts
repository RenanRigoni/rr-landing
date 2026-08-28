// Configuração declarativa das 7 seções do dossiê digital (7.6). Um único
// lugar descreve: em qual seção cada campo vive, o tipo de input, o
// vocabulário do select, os limites numéricos e de qual base a visibilidade
// do campo depende.
//
// Não é abstração especulativa: este mesmo arquivo alimenta o formulário E o
// teste `tests/domain/dossier-sections.test.ts`, que confere campo a campo
// contra `digitalAuditSchema` — 101 campos de entrada, e é fácil esquecer 5.
//
// Sem React aqui de propósito: `.ts` puro, importável pela suíte vitest
// (`environment: 'node'`, sem RTL/jsdom). Os componentes `.tsx` importam
// desta config; nada aqui importa deles.

import type { DigitalAuditInput } from '@/lib/validation/digital-audit'
import {
  WEBSITE_DEPENDENT_FIELDS,
  PAGESPEED_DEPENDENT_FIELDS,
  INSTAGRAM_DEPENDENT_FIELDS,
  GOOGLE_PROFILE_DEPENDENT_FIELDS,
} from '@/lib/domain/digital-audit-cascade'
import type { DossierEnumGroup } from '@/lib/domain/digital-labels'

/** Nome de campo que é chave real do schema de entrada do dossiê (7.3). */
export type DossierFieldName = keyof DigitalAuditInput & string

export type DossierFieldType =
  | 'text'
  | 'url'
  | 'number'
  | 'textarea'
  | 'select'
  | 'date'
  | 'datetime'
  | 'multicheck'

/**
 * De qual base de seção a visibilidade do campo depende. `undefined` = campo
 * sempre visível (é a própria base, ou um campo independente de pesquisa /
 * identificação / nota livre que sobrevive mesmo quando a base é `nao` —
 * ver `lib/domain/digital-audit-cascade.ts`).
 */
export type DossierCondition = 'website' | 'instagram' | 'google_profile'

export interface DossierFieldSpec {
  name: DossierFieldName
  type: DossierFieldType
  /** Vocabulário do enum (para `type: 'select'`). Só os valores afirmativos —
   * a opção vazia "Não analisado" é sempre acrescentada pelo primitivo. */
  options?: readonly string[]
  /** Grupo de rótulos do enum, para o primitivo resolver o texto de cada opção. */
  enumGroup?: DossierEnumGroup
  min?: number
  max?: number
  step?: number
  dependsOn?: DossierCondition
}

export interface DossierSectionSpec {
  key: string
  title: string
  fields: DossierFieldSpec[]
  /** Seção que carrega os checkboxes de `digital_opportunities` + o sentinel
   * `digital_opportunities_present` (contrato da 7.4). */
  hasOpportunities?: boolean
}

// --- Vocabulários reutilizados (subconjuntos dos enums do Postgres) ---------

const SIM_NAO = ['sim', 'nao'] as const
const SIM_NAO_NAOID = ['sim', 'nao', 'nao_identificado'] as const
const SIM_PARCIAL_NAO = ['sim', 'parcialmente', 'nao'] as const
const QUALITY = ['excelente', 'boa', 'regular', 'ruim'] as const
const SPEED = ['rapido', 'aceitavel', 'lento', 'muito_lento'] as const
const ACTIVITY = ['ativo', 'pouco_ativo', 'inativo'] as const
const CWV = ['aprovado', 'reprovado', 'dados_insuficientes'] as const
const RESULT_TYPE = ['organico', 'patrocinado', 'maps', 'outro', 'nao_identificado'] as const
const REPLIES = ['frequentemente', 'algumas', 'nao'] as const
const CONTENT_CTA = ['frequentemente', 'algumas', 'raramente', 'nao'] as const
const WHATSAPP_CLICKABLE = ['sim', 'nao', 'nao_se_aplica'] as const

const tri = (name: DossierFieldName, dependsOn?: DossierCondition): DossierFieldSpec => ({
  name,
  type: 'select',
  options: SIM_NAO,
  enumGroup: 'tri_state',
  dependsOn,
})

const lighthouse = (name: DossierFieldName): DossierFieldSpec => ({
  name,
  type: 'number',
  min: 0,
  max: 100,
  step: 1,
  dependsOn: 'website',
})

/** Métrica de laboratório em milissegundos (LCP/INP/FCP/TBT/Speed Index). */
const msMetric = (name: DossierFieldName): DossierFieldSpec => ({
  name,
  type: 'number',
  min: 0,
  step: 1,
  dependsOn: 'website',
})

const pagespeedMetrics = (prefix: 'pagespeed_mobile' | 'pagespeed_desktop'): DossierFieldSpec[] => [
  lighthouse(`${prefix}_performance` as DossierFieldName),
  lighthouse(`${prefix}_accessibility` as DossierFieldName),
  lighthouse(`${prefix}_best_practices` as DossierFieldName),
  lighthouse(`${prefix}_seo` as DossierFieldName),
  {
    name: `${prefix}_core_web_vitals` as DossierFieldName,
    type: 'select',
    options: CWV,
    enumGroup: 'cwv_status',
    dependsOn: 'website',
  },
  msMetric(`${prefix}_lcp` as DossierFieldName),
  msMetric(`${prefix}_inp` as DossierFieldName),
  { name: `${prefix}_cls` as DossierFieldName, type: 'number', min: 0, step: 0.01, dependsOn: 'website' },
  msMetric(`${prefix}_fcp` as DossierFieldName),
  msMetric(`${prefix}_tbt` as DossierFieldName),
  msMetric(`${prefix}_speed_index` as DossierFieldName),
]

// --- As 7 seções ----------------------------------------------------------

export const DOSSIER_SECTIONS: DossierSectionSpec[] = [
  {
    key: 'origem',
    title: 'Origem da prospecção',
    fields: [
      { name: 'researched_at', type: 'date' },
      { name: 'search_query', type: 'text' },
      { name: 'search_location', type: 'text' },
      { name: 'found_on_google', type: 'select', options: SIM_NAO, enumGroup: 'tri_state' },
      { name: 'google_result_type', type: 'select', options: RESULT_TYPE, enumGroup: 'google_result_type' },
      { name: 'google_ads_active', type: 'select', options: SIM_NAO_NAOID, enumGroup: 'tri_state' },
      { name: 'google_ads_position', type: 'number', min: 1, step: 1 },
      { name: 'google_organic_position', type: 'number', min: 1, step: 1 },
      { name: 'google_search_result_url', type: 'url' },
    ],
  },
  {
    key: 'google',
    title: 'Google / Google Business',
    fields: [
      { name: 'google_business_profile', type: 'select', options: SIM_NAO_NAOID, enumGroup: 'tri_state' },
      { name: 'google_business_name', type: 'text' },
      { name: 'google_business_category', type: 'text' },
      { name: 'google_rating', type: 'number', min: 0, max: 5, step: 0.1, dependsOn: 'google_profile' },
      { name: 'google_reviews_count', type: 'number', min: 0, step: 1, dependsOn: 'google_profile' },
      tri('google_recent_reviews', 'google_profile'),
      {
        name: 'google_replies_reviews',
        type: 'select',
        options: REPLIES,
        enumGroup: 'frequency_level',
        dependsOn: 'google_profile',
      },
      tri('google_has_photos', 'google_profile'),
      tri('google_has_hours', 'google_profile'),
      tri('google_has_phone', 'google_profile'),
      tri('google_has_website', 'google_profile'),
      tri('google_easy_whatsapp', 'google_profile'),
      tri('google_has_booking', 'google_profile'),
      {
        name: 'google_profile_completeness',
        type: 'select',
        options: QUALITY,
        enumGroup: 'quality_level',
        dependsOn: 'google_profile',
      },
      { name: 'google_notes', type: 'textarea' },
    ],
  },
  {
    key: 'website',
    title: 'Website',
    fields: [
      { name: 'website_exists', type: 'select', options: SIM_NAO, enumGroup: 'tri_state' },
      { name: 'website_url', type: 'url', dependsOn: 'website' },
      tri('website_https', 'website'),
      { name: 'website_mobile_friendly', type: 'select', options: SIM_PARCIAL_NAO, enumGroup: 'tri_state', dependsOn: 'website' },
      { name: 'website_visual_quality', type: 'select', options: QUALITY, enumGroup: 'quality_level', dependsOn: 'website' },
      { name: 'website_perceived_speed', type: 'select', options: SPEED, enumGroup: 'speed_level', dependsOn: 'website' },
      { name: 'website_services_clear', type: 'select', options: SIM_PARCIAL_NAO, enumGroup: 'tri_state', dependsOn: 'website' },
      tri('website_has_target_service_page', 'website'),
      { name: 'website_target_service_url', type: 'url', dependsOn: 'website' },
      tri('website_has_clear_cta', 'website'),
      tri('website_has_whatsapp', 'website'),
      { name: 'website_whatsapp_clickable', type: 'select', options: WHATSAPP_CLICKABLE, enumGroup: 'tri_state', dependsOn: 'website' },
      tri('website_whatsapp_floating', 'website'),
      tri('website_has_contact_form', 'website'),
      tri('website_has_online_booking', 'website'),
      tri('website_phone_visible', 'website'),
      tri('website_address_visible', 'website'),
      tri('website_has_social_proof', 'website'),
      tri('website_has_clear_differentiators', 'website'),
      tri('website_has_team', 'website'),
      { name: 'website_content_updated', type: 'select', options: SIM_NAO_NAOID, enumGroup: 'tri_state', dependsOn: 'website' },
      { name: 'website_notes', type: 'textarea' },
    ],
  },
  {
    key: 'conversao',
    title: 'Conversão',
    fields: [
      { name: 'conversion_clear_contact_path', type: 'select', options: SIM_PARCIAL_NAO, enumGroup: 'tri_state' },
      { name: 'conversion_clicks_to_whatsapp', type: 'number', min: 0, step: 1 },
      tri('conversion_cta_above_fold'),
      tri('conversion_repeated_cta'),
      tri('conversion_alternative_capture'),
      tri('conversion_has_friction'),
      { name: 'conversion_friction_notes', type: 'textarea' },
    ],
  },
  {
    key: 'instagram',
    title: 'Instagram',
    fields: [
      { name: 'instagram_exists', type: 'select', options: SIM_NAO, enumGroup: 'tri_state' },
      { name: 'instagram_username', type: 'text' },
      { name: 'instagram_url', type: 'url', dependsOn: 'instagram' },
      tri('instagram_has_bio_link', 'instagram'),
      { name: 'instagram_clear_bio', type: 'select', options: SIM_PARCIAL_NAO, enumGroup: 'tri_state', dependsOn: 'instagram' },
      tri('instagram_has_cta', 'instagram'),
      tri('instagram_easy_whatsapp', 'instagram'),
      tri('instagram_easy_website', 'instagram'),
      { name: 'instagram_active', type: 'select', options: ACTIVITY, enumGroup: 'activity_level', dependsOn: 'instagram' },
      { name: 'instagram_last_post_date', type: 'date', dependsOn: 'instagram' },
      { name: 'instagram_visual_quality', type: 'select', options: QUALITY, enumGroup: 'quality_level', dependsOn: 'instagram' },
      { name: 'instagram_services_content', type: 'select', options: SIM_PARCIAL_NAO, enumGroup: 'tri_state', dependsOn: 'instagram' },
      { name: 'instagram_content_cta', type: 'select', options: CONTENT_CTA, enumGroup: 'frequency_level', dependsOn: 'instagram' },
      { name: 'instagram_notes', type: 'textarea' },
    ],
  },
  {
    key: 'pagespeed',
    title: 'PageSpeed',
    fields: [
      ...pagespeedMetrics('pagespeed_mobile'),
      ...pagespeedMetrics('pagespeed_desktop'),
      { name: 'pagespeed_analyzed_url', type: 'url', dependsOn: 'website' },
      { name: 'pagespeed_analyzed_at', type: 'datetime', dependsOn: 'website' },
      { name: 'pagespeed_mobile_report_url', type: 'url', dependsOn: 'website' },
      { name: 'pagespeed_desktop_report_url', type: 'url', dependsOn: 'website' },
      { name: 'pagespeed_field_data_available', type: 'select', options: SIM_NAO, enumGroup: 'tri_state', dependsOn: 'website' },
      { name: 'pagespeed_notes', type: 'textarea' },
    ],
  },
  {
    key: 'diagnostico',
    title: 'Diagnóstico digital',
    hasOpportunities: true,
    fields: [
      { name: 'digital_problems', type: 'textarea' },
      { name: 'digital_strengths', type: 'textarea' },
      { name: 'digital_opportunities', type: 'multicheck' },
      { name: 'digital_sales_priority', type: 'select', options: ['muito_alta', 'alta', 'media', 'baixa', 'nao_avaliada'], enumGroup: 'sales_priority' },
      { name: 'digital_opportunity_score', type: 'number', min: 0, max: 10, step: 1 },
      { name: 'digital_opportunity_reason', type: 'textarea' },
    ],
  },
]

/** Todo campo renderizado, achatado. */
export const ALL_DOSSIER_FIELDS: DossierFieldSpec[] = DOSSIER_SECTIONS.flatMap((s) => s.fields)

/** Campos do schema de entrada (7.3) que NÃO são renderizados como input, e o
 * motivo. `lead_id` é o vínculo imutável (campo oculto). Ver relatório da 7.6. */
export const DELIBERATELY_UNRENDERED_FIELDS: Record<string, string> = {
  lead_id: 'vínculo imutável lead↔auditoria — vai como <input type="hidden">, nunca editável',
}

// --- Visibilidade condicional (regra pura, testável) ---------------------
//
// O CLIENTE só decide o que MOSTRAR. Quem limpa de fato o dado contraditório
// já persistido é a cascata server-side da 7.4
// (`resolveClearedFields`) — a UI apenas garante que um campo oculto não vá
// no submit com valor antigo, porque campo não renderizado não entra no
// FormData.

/** Valores das três bases que a visibilidade condicional observa. */
export interface DossierConditionState {
  website_exists?: string | null
  instagram_exists?: string | null
  google_business_profile?: string | null
}

/**
 * `website_exists`/`instagram_exists`: campos dependentes só aparecem quando a
 * base é explicitamente `sim` (plano 7.6: "`website_exists != 'sim'` esconde os
 * demais campos de site"). `google_business_profile`: atributos do perfil somem
 * só quando a base é `nao` — em `sim`/`nao_identificado`/vazio continuam
 * disponíveis (o operador ainda pode estar avaliando).
 */
export function isFieldVisible(spec: DossierFieldSpec, state: DossierConditionState): boolean {
  switch (spec.dependsOn) {
    case undefined:
      return true
    case 'website':
      return state.website_exists === 'sim'
    case 'instagram':
      return state.instagram_exists === 'sim'
    case 'google_profile':
      return state.google_business_profile !== 'nao'
  }
}

/** Campos de uma seção visíveis no estado atual das bases. */
export function visibleFields(
  section: DossierSectionSpec,
  state: DossierConditionState,
): DossierFieldSpec[] {
  return section.fields.filter((field) => isFieldVisible(field, state))
}

/**
 * "N de M preenchidos" da seção — conta só os campos visíveis. Um campo conta
 * como preenchido quando o valor não é vazio; `digital_opportunities`
 * (multicheck) conta quando ao menos uma opção está marcada.
 */
export function countSectionFilled(
  section: DossierSectionSpec,
  values: Readonly<Record<string, string>>,
  opportunities: readonly string[],
): { filled: number; total: number } {
  const fields = visibleFields(section, values)
  let filled = 0
  for (const field of fields) {
    if (field.type === 'multicheck') {
      if (opportunities.length > 0) filled += 1
      continue
    }
    if ((values[field.name] ?? '').trim() !== '') filled += 1
  }
  return { filled, total: fields.length }
}

// --- Provas de integridade em tempo de compilação -----------------------
//
// Toda entrada das listas de cascata (7.4) precisa aparecer neste arquivo com
// o `dependsOn` certo, senão a UI mostraria um campo que o servidor limpa —
// contradição visível. O `satisfies` abaixo não cobre isso sozinho; o teste
// `dossier-sections.test.ts` faz a conferência cruzada completa. Aqui fica só
// a garantia de que os nomes das listas são chaves reais do schema (já
// garantido por `DossierFieldName`, reforçado aqui para falha local clara).
type _WebsiteDepsAreFields = (typeof WEBSITE_DEPENDENT_FIELDS)[number] extends DossierFieldName ? true : never
type _PagespeedDepsAreFields = (typeof PAGESPEED_DEPENDENT_FIELDS)[number] extends DossierFieldName ? true : never
type _InstagramDepsAreFields = (typeof INSTAGRAM_DEPENDENT_FIELDS)[number] extends DossierFieldName ? true : never
type _GoogleDepsAreFields = (typeof GOOGLE_PROFILE_DEPENDENT_FIELDS)[number] extends DossierFieldName ? true : never
const _depsCheck: [_WebsiteDepsAreFields, _PagespeedDepsAreFields, _InstagramDepsAreFields, _GoogleDepsAreFields] = [
  true,
  true,
  true,
  true,
]
void _depsCheck
