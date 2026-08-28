import { z } from 'zod'
import { optionalText, optionalUuid } from '@/lib/validation/leads'
import {
  WEBSITE_DEPENDENT_FIELDS,
  INSTAGRAM_DEPENDENT_FIELDS,
  GOOGLE_PROFILE_DEPENDENT_FIELDS,
} from '@/lib/domain/digital-audit-cascade'

// Schema de entrada do dossiê digital (7.3). Espelha `sales.lead_digital_audits`
// (migration 0012): **tudo opcional/nullable exceto `lead_id`**. Salvar parcial
// é o caminho normal (regra 6 da Fase 7) — criar hoje, completar depois.
//
// D-037 — "não avaliado" × "não":
//   • `null`/`undefined` (campo em branco) e os valores de enum
//     `nao_analisado`/`nao_identificado`/`nao_se_aplica` = NÃO AVALIADO.
//   • `nao` = avaliado e ausente. Os dois são estados distintos e o schema
//     preserva a diferença: campo vazio nunca é coagido para `nao` nem para 0.
// D-038 — `digital_score`/`digital_score_completeness` NÃO existem neste schema.
//   São derivados no servidor por `lib/domain/digital-score.ts` (mesmo motivo
//   de `org_id`/`status` não estarem em `createLeadSchema`). Chaves
//   desconhecidas são descartadas pelo `z.object` (comportamento padrão).

// --- Helpers ---

/** `''`/espaços → `null`; qualquer outro valor passa adiante. Roda ANTES do
 * `z.coerce` para um campo em branco nunca virar `0` (regra 1 da Fase 7). */
const emptyToNull = (value: unknown): unknown => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  return value
}

/** Texto opcional que, quando presente, precisa ser uma URL válida. O
 * `z.string().url()` roda DEPOIS do transform vazio→null de `optionalText`
 * (campo vazio não pode virar erro de URL). */
const optionalUrl = optionalText.refine(
  (value) => value === null || value === undefined || z.string().url().safeParse(value).success,
  { message: 'URL inválida' },
)

/** Inteiro opcional (form manda string → `z.coerce`), `''`→`null` antes do coerce. */
function optionalInt(min?: number, max?: number) {
  let schema = z.coerce.number().int('Precisa ser um número inteiro')
  if (min !== undefined) schema = schema.min(min, `Não pode ser menor que ${min}`)
  if (max !== undefined) schema = schema.max(max, `Não pode ser maior que ${max}`)
  return z.preprocess(emptyToNull, schema.nullable().optional())
}

/** Número decimal opcional (mesmo tratamento de vazio que `optionalInt`). */
function optionalDecimal(opts: { min?: number; max?: number; multipleOf?: number } = {}) {
  let schema = z.coerce.number()
  if (opts.min !== undefined) schema = schema.min(opts.min, `Não pode ser menor que ${opts.min}`)
  if (opts.max !== undefined) schema = schema.max(opts.max, `Não pode ser maior que ${opts.max}`)
  if (opts.multipleOf !== undefined) {
    schema = schema.multipleOf(opts.multipleOf, 'No máximo uma casa decimal')
  }
  return z.preprocess(emptyToNull, schema.nullable().optional())
}

/** Enum do Postgres, opcional/nullable. `''` (nenhuma opção selecionada no
 * form) → `null`; o valor `nao_analisado` continua sendo um valor legítimo. */
function optionalEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(emptyToNull, z.enum(values).nullable().optional())
}

const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * `2026-02-31` existe como string mas não como dia. `new Date()` normaliza em
 * silêncio para `2026-03-03` — este check reprova em vez de deixar passar.
 * Comparação em UTC só para conferir o calendário; nenhum valor derivado daqui
 * é usado como instante.
 */
function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return false
  const asUtc = new Date(Date.UTC(year, month - 1, day))
  return (
    asUtc.getUTCFullYear() === year && asUtc.getUTCMonth() === month - 1 && asUtc.getUTCDate() === day
  )
}

/**
 * Data de CALENDÁRIO (`date` no Postgres: `researched_at`,
 * `instagram_last_post_date`). Fica string `AAAA-MM-DD` do começo ao fim —
 * nunca vira `Date`.
 *
 * `z.coerce.date()` era errado aqui: `2026-08-27T23:00:00-03:00` vira
 * `2026-08-28` depois de passar por UTC (verificado), e `2026-02-31` é
 * silenciosamente normalizada para `2026-03-03`. Um dossiê datado é comparado
 * com outro ("melhorou desde agosto?", DOSSIE §17) — deslocar o dia por fuso
 * corrompe exatamente essa comparação.
 */
const optionalCalendarDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(CALENDAR_DATE_RE, 'Data inválida (use AAAA-MM-DD)')
    .refine(isRealCalendarDate, 'Data inexistente no calendário')
    .nullable()
    .optional(),
)

/**
 * Instante (`timestamptz` no Postgres: `pagespeed_analyzed_at`). Aqui `Date` é
 * a representação certa — o valor É um ponto no tempo, com fuso, e o
 * round-trip por UTC é o comportamento desejado.
 */
const optionalTimestamp = z.preprocess(emptyToNull, z.coerce.date().nullable().optional())

// --- Vocabulários dos enums (idênticos aos do Postgres — migration 0012) ---

const TRI_STATE = ['sim', 'nao', 'parcialmente', 'nao_identificado', 'nao_analisado', 'nao_se_aplica'] as const
const QUALITY_LEVEL = ['excelente', 'boa', 'regular', 'ruim', 'nao_analisado'] as const
const FREQUENCY_LEVEL = ['frequentemente', 'algumas', 'raramente', 'nao', 'nao_analisado'] as const
const SPEED_LEVEL = ['rapido', 'aceitavel', 'lento', 'muito_lento', 'nao_analisado'] as const
const ACTIVITY_LEVEL = ['ativo', 'pouco_ativo', 'inativo', 'nao_analisado'] as const
const CWV_STATUS = ['aprovado', 'reprovado', 'dados_insuficientes', 'nao_analisado'] as const
const GOOGLE_RESULT_TYPE = ['organico', 'patrocinado', 'maps', 'outro', 'nao_identificado'] as const
const SALES_PRIORITY = ['muito_alta', 'alta', 'media', 'baixa', 'nao_avaliada'] as const

const DIGITAL_OPPORTUNITY = [
  'google_business', 'google_reputation', 'website', 'landing_page', 'seo_local',
  'performance', 'ux_mobile', 'conversao', 'whatsapp', 'automacao', 'agendamento',
  'captacao_leads', 'instagram', 'crm', 'analytics', 'outro',
] as const

// --- Schema (objeto base; o refinamento de estados contraditórios vem depois) ---

const digitalAuditObject = z.object({
  // Identidade — o único campo obrigatório. `researched_at` tem default no
  // banco (current_date); aqui é opcional (regra "tudo opcional exceto lead_id").
  lead_id: z.string().uuid('Lead inválido'),
  researched_at: optionalCalendarDate,

  // Origem da prospecção (DOSSIE §2)
  search_query: optionalText,
  search_location: optionalText,
  found_on_google: optionalEnum(TRI_STATE),
  google_result_type: optionalEnum(GOOGLE_RESULT_TYPE),
  google_ads_active: optionalEnum(TRI_STATE),
  google_ads_position: optionalInt(1),
  google_organic_position: optionalInt(1),
  google_search_result_url: optionalUrl,

  // Google Business Profile / Maps (DOSSIE §3)
  google_business_profile: optionalEnum(TRI_STATE),
  google_business_name: optionalText,
  google_business_category: optionalText,
  google_rating: optionalDecimal({ min: 0, max: 5, multipleOf: 0.1 }),
  google_reviews_count: optionalInt(0),
  google_recent_reviews: optionalEnum(TRI_STATE),
  google_replies_reviews: optionalEnum(FREQUENCY_LEVEL),
  google_has_photos: optionalEnum(TRI_STATE),
  google_has_hours: optionalEnum(TRI_STATE),
  google_has_phone: optionalEnum(TRI_STATE),
  google_has_website: optionalEnum(TRI_STATE),
  google_easy_whatsapp: optionalEnum(TRI_STATE),
  google_has_booking: optionalEnum(TRI_STATE),
  google_profile_completeness: optionalEnum(QUALITY_LEVEL),
  google_notes: optionalText,

  // Website (DOSSIE §4)
  website_exists: optionalEnum(TRI_STATE),
  website_url: optionalUrl,
  website_https: optionalEnum(TRI_STATE),
  website_mobile_friendly: optionalEnum(TRI_STATE),
  website_visual_quality: optionalEnum(QUALITY_LEVEL),
  website_perceived_speed: optionalEnum(SPEED_LEVEL),
  website_services_clear: optionalEnum(TRI_STATE),
  website_has_target_service_page: optionalEnum(TRI_STATE),
  website_target_service_url: optionalUrl,
  website_has_clear_cta: optionalEnum(TRI_STATE),
  website_has_whatsapp: optionalEnum(TRI_STATE),
  website_whatsapp_clickable: optionalEnum(TRI_STATE),
  website_whatsapp_floating: optionalEnum(TRI_STATE),
  website_has_contact_form: optionalEnum(TRI_STATE),
  website_has_online_booking: optionalEnum(TRI_STATE),
  website_phone_visible: optionalEnum(TRI_STATE),
  website_address_visible: optionalEnum(TRI_STATE),
  website_has_social_proof: optionalEnum(TRI_STATE),
  website_has_clear_differentiators: optionalEnum(TRI_STATE),
  website_has_team: optionalEnum(TRI_STATE),
  website_content_updated: optionalEnum(TRI_STATE),
  website_notes: optionalText,

  // Conversão digital (DOSSIE §5)
  conversion_clear_contact_path: optionalEnum(TRI_STATE),
  conversion_clicks_to_whatsapp: optionalInt(0),
  conversion_cta_above_fold: optionalEnum(TRI_STATE),
  conversion_repeated_cta: optionalEnum(TRI_STATE),
  conversion_alternative_capture: optionalEnum(TRI_STATE),
  conversion_has_friction: optionalEnum(TRI_STATE),
  conversion_friction_notes: optionalText,

  // Instagram (DOSSIE §6)
  instagram_exists: optionalEnum(TRI_STATE),
  instagram_username: optionalText,
  instagram_url: optionalUrl,
  instagram_has_bio_link: optionalEnum(TRI_STATE),
  instagram_clear_bio: optionalEnum(TRI_STATE),
  instagram_has_cta: optionalEnum(TRI_STATE),
  instagram_easy_whatsapp: optionalEnum(TRI_STATE),
  instagram_easy_website: optionalEnum(TRI_STATE),
  instagram_active: optionalEnum(ACTIVITY_LEVEL),
  instagram_last_post_date: optionalCalendarDate,
  instagram_visual_quality: optionalEnum(QUALITY_LEVEL),
  instagram_services_content: optionalEnum(TRI_STATE),
  instagram_content_cta: optionalEnum(FREQUENCY_LEVEL),
  instagram_notes: optionalText,

  // PageSpeed mobile (DOSSIE §7). Tempos em ms inteiro; CLS decimal.
  pagespeed_mobile_performance: optionalInt(0, 100),
  pagespeed_mobile_accessibility: optionalInt(0, 100),
  pagespeed_mobile_best_practices: optionalInt(0, 100),
  pagespeed_mobile_seo: optionalInt(0, 100),
  pagespeed_mobile_core_web_vitals: optionalEnum(CWV_STATUS),
  pagespeed_mobile_lcp: optionalInt(0),
  pagespeed_mobile_inp: optionalInt(0),
  pagespeed_mobile_cls: optionalDecimal({ min: 0 }),
  pagespeed_mobile_fcp: optionalInt(0),
  pagespeed_mobile_tbt: optionalInt(0),
  pagespeed_mobile_speed_index: optionalInt(0),

  // PageSpeed desktop — mesmas 11 colunas
  pagespeed_desktop_performance: optionalInt(0, 100),
  pagespeed_desktop_accessibility: optionalInt(0, 100),
  pagespeed_desktop_best_practices: optionalInt(0, 100),
  pagespeed_desktop_seo: optionalInt(0, 100),
  pagespeed_desktop_core_web_vitals: optionalEnum(CWV_STATUS),
  pagespeed_desktop_lcp: optionalInt(0),
  pagespeed_desktop_inp: optionalInt(0),
  pagespeed_desktop_cls: optionalDecimal({ min: 0 }),
  pagespeed_desktop_fcp: optionalInt(0),
  pagespeed_desktop_tbt: optionalInt(0),
  pagespeed_desktop_speed_index: optionalInt(0),

  // PageSpeed, informações gerais
  pagespeed_analyzed_url: optionalUrl,
  pagespeed_analyzed_at: optionalTimestamp,
  pagespeed_mobile_report_url: optionalUrl,
  pagespeed_desktop_report_url: optionalUrl,
  pagespeed_field_data_available: optionalEnum(TRI_STATE),
  pagespeed_notes: optionalText,

  // Diagnóstico digital (DOSSIE §9)
  digital_problems: optionalText,
  digital_strengths: optionalText,
  // SEM `.default([])`: `.default` faz o Zod gravar `[]` no output mesmo
  // quando a chave não veio no request, quebrando a semântica de "campo
  // ausente não altera o valor persistido" que todo o resto do schema segue
  // (7.4, revisão corretiva — achado 1). Ausente aqui vira `undefined`, igual
  // a qualquer outro campo opcional; `buildColumns` só grava a coluna quando
  // a chave está presente em `parsed.data`. Insert sem a chave cai no
  // default do próprio banco (`text[] not null default '{}'`, migration
  // 0012) — resultado observável idêntico, sem duplicar a regra aqui.
  digital_opportunities: z.array(z.enum(DIGITAL_OPPORTUNITY)).optional(),
  digital_sales_priority: optionalEnum(SALES_PRIORITY),
  digital_opportunity_score: optionalInt(0, 10),
  digital_opportunity_reason: optionalText,

  // digital_score / digital_score_completeness: ausentes de propósito (D-038).
})

type DigitalAuditObjectShape = z.infer<typeof digitalAuditObject>

// --- Estados contraditórios: "seção inexistente" + campo interno afirmativo ---
//
// Regra 6 da Fase 7 (salvar parcial é normal) e D-037 exigem que campo em
// branco / `nao_analisado` NUNCA sejam tratados como contradição: só quando a
// base é EXPLICITAMENTE `nao` ("a coisa não existe") e um campo interno traz um
// valor afirmativo/medido é que há contradição de fato. Notas em texto livre
// ficam de fora (podem descrever justamente a ausência).

const NEUTRAL_ENUM_VALUES = new Set([
  'nao', 'nao_analisado', 'nao_identificado', 'nao_se_aplica',
])

/** Um valor "afirmativo/medido": número, data, URL/texto não vazio, ou enum
 * que não seja negativo/não-avaliado. `null`/`undefined` nunca é afirmativo. */
function isAffirmativeValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return !NEUTRAL_ENUM_VALUES.has(value)
  return true
}

// As listas vivem em `lib/domain/digital-audit-cascade.ts` (7.4): o mesmo
// conjunto que o Zod usa para REJEITAR contradição dentro de um request é o que
// a action usa para LIMPAR contradição herdada do estado já persistido. Duas
// cópias divergiriam na primeira vez que alguém acrescentasse um campo.
// `satisfies` prova, em tempo de compilação, que toda entrada das listas é
// campo real deste schema.
const WEBSITE_INTERNAL_FIELDS =
  WEBSITE_DEPENDENT_FIELDS satisfies readonly (keyof DigitalAuditObjectShape)[]
const INSTAGRAM_INTERNAL_FIELDS =
  INSTAGRAM_DEPENDENT_FIELDS satisfies readonly (keyof DigitalAuditObjectShape)[]
const GOOGLE_PROFILE_INTERNAL_FIELDS =
  GOOGLE_PROFILE_DEPENDENT_FIELDS satisfies readonly (keyof DigitalAuditObjectShape)[]

function guardBaseNao(
  data: DigitalAuditObjectShape,
  ctx: z.RefinementCtx,
  baseField: keyof DigitalAuditObjectShape,
  internalFields: readonly (keyof DigitalAuditObjectShape)[],
  reason: string,
): void {
  if (data[baseField] !== 'nao') return
  for (const field of internalFields) {
    if (isAffirmativeValue(data[field])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `Não pode ser preenchido quando ${reason} (${baseField} = "nao").`,
      })
    }
  }
}

export const digitalAuditSchema = digitalAuditObject.superRefine((data, ctx) => {
  guardBaseNao(data, ctx, 'website_exists', WEBSITE_INTERNAL_FIELDS, 'o site não existe')
  guardBaseNao(data, ctx, 'instagram_exists', INSTAGRAM_INTERNAL_FIELDS, 'o Instagram não existe')
  guardBaseNao(
    data,
    ctx,
    'google_business_profile',
    GOOGLE_PROFILE_INTERNAL_FIELDS,
    'não há perfil no Google Meu Negócio',
  )
})

export type DigitalAuditInput = z.infer<typeof digitalAuditSchema>

/**
 * Nomes de campo deste schema, em runtime. Fonte única para quem precisa
 * SEPARAR campos de dossiê de campos de outro formulário que dividem o mesmo
 * `FormData` — o cadastro em um passo da 7.7, onde `/leads/new` envia os
 * campos comerciais e as 7 seções do dossiê no mesmo submit.
 *
 * Derivado de `digitalAuditObject.shape`, nunca escrito à mão: campo novo no
 * schema entra aqui sozinho, sem uma segunda lista para esquecer de atualizar.
 */
export const DIGITAL_AUDIT_FIELD_NAMES = Object.keys(
  digitalAuditObject.shape,
) as readonly (keyof DigitalAuditObjectShape)[]
