import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { digitalAuditSchema, type DigitalAuditInput } from '@/lib/validation/digital-audit'
import { computeDigitalScore, type DigitalAuditFields } from '@/lib/domain/digital-score'
import { checkBelongsToOrg } from '@/lib/actions/leads-core'
import { logAudit } from '@/lib/actions/audit'
import type { Database, Json } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>
type AuditInsert = Database['sales']['Tables']['lead_digital_audits']['Insert']

export interface DigitalAuditResult {
  error: string | null
  auditId?: string
  /** Score calculado no servidor (D-038). `null` quando nada foi avaliável. */
  digitalScore?: number | null
  completeness?: number
}

const SAVE_ERROR = 'Não foi possível salvar o dossiê digital.'

/**
 * `audit_id` (quando existe) chega junto do payload — não faz parte de
 * `digitalAuditSchema` (não é coluna que o formulário preenche, é o
 * identificador da linha a atualizar). Extrai só se for uuid; presente porém
 * malformado é erro (não cai em "cria nova" silenciosamente). É id vindo do
 * cliente: a checagem de `org_id` acontece depois, antes de gravar (D-020).
 */
function readAuditId(input: unknown): { auditId: string | null; error: string | null } {
  if (typeof input === 'object' && input !== null && 'audit_id' in input) {
    const raw = input.audit_id
    if (raw === null || raw === undefined || raw === '') {
      return { auditId: null, error: null }
    }
    if (typeof raw === 'string' && z.string().uuid().safeParse(raw).success) {
      return { auditId: raw, error: null }
    }
    return { auditId: null, error: 'Auditoria inválida.' }
  }
  return { auditId: null, error: null }
}

/**
 * Subconjunto que alimenta o score (D-038 — nunca o inverso). `undefined`
 * (campo ausente) e `null` (campo limpo) são a mesma coisa para o score:
 * "não avaliado" (D-037), então coalesce para `null` — os conversores de
 * `digital-score.ts` já tratam `null` como não avaliado.
 */
function toScoreInput(data: DigitalAuditInput): DigitalAuditFields {
  return {
    google_business_profile: data.google_business_profile ?? null,
    google_rating: data.google_rating ?? null,
    google_reviews_count: data.google_reviews_count ?? null,
    google_recent_reviews: data.google_recent_reviews ?? null,
    google_replies_reviews: data.google_replies_reviews ?? null,
    google_has_photos: data.google_has_photos ?? null,
    google_has_hours: data.google_has_hours ?? null,
    google_has_phone: data.google_has_phone ?? null,
    google_has_website: data.google_has_website ?? null,
    google_easy_whatsapp: data.google_easy_whatsapp ?? null,
    google_has_booking: data.google_has_booking ?? null,
    website_exists: data.website_exists ?? null,
    website_https: data.website_https ?? null,
    website_mobile_friendly: data.website_mobile_friendly ?? null,
    website_visual_quality: data.website_visual_quality ?? null,
    website_perceived_speed: data.website_perceived_speed ?? null,
    website_services_clear: data.website_services_clear ?? null,
    website_has_target_service_page: data.website_has_target_service_page ?? null,
    website_has_clear_cta: data.website_has_clear_cta ?? null,
    website_has_whatsapp: data.website_has_whatsapp ?? null,
    website_has_contact_form: data.website_has_contact_form ?? null,
    website_has_online_booking: data.website_has_online_booking ?? null,
    website_phone_visible: data.website_phone_visible ?? null,
    website_has_social_proof: data.website_has_social_proof ?? null,
    conversion_clear_contact_path: data.conversion_clear_contact_path ?? null,
    conversion_clicks_to_whatsapp: data.conversion_clicks_to_whatsapp ?? null,
    conversion_cta_above_fold: data.conversion_cta_above_fold ?? null,
    conversion_repeated_cta: data.conversion_repeated_cta ?? null,
    conversion_alternative_capture: data.conversion_alternative_capture ?? null,
    conversion_has_friction: data.conversion_has_friction ?? null,
    pagespeed_mobile_performance: data.pagespeed_mobile_performance ?? null,
    pagespeed_mobile_core_web_vitals: data.pagespeed_mobile_core_web_vitals ?? null,
    pagespeed_mobile_seo: data.pagespeed_mobile_seo ?? null,
    pagespeed_mobile_accessibility: data.pagespeed_mobile_accessibility ?? null,
    pagespeed_mobile_best_practices: data.pagespeed_mobile_best_practices ?? null,
    pagespeed_desktop_performance: data.pagespeed_desktop_performance ?? null,
    pagespeed_desktop_core_web_vitals: data.pagespeed_desktop_core_web_vitals ?? null,
    instagram_exists: data.instagram_exists ?? null,
    instagram_has_bio_link: data.instagram_has_bio_link ?? null,
    instagram_clear_bio: data.instagram_clear_bio ?? null,
    instagram_has_cta: data.instagram_has_cta ?? null,
    instagram_easy_whatsapp: data.instagram_easy_whatsapp ?? null,
    instagram_easy_website: data.instagram_easy_website ?? null,
    instagram_active: data.instagram_active ?? null,
    instagram_visual_quality: data.instagram_visual_quality ?? null,
    instagram_services_content: data.instagram_services_content ?? null,
  }
}

/** `date` do Postgres → `'YYYY-MM-DD'`; nulo/ausente permanece nulo. */
function toDateOnly(value: Date | null | undefined): string | null {
  return value instanceof Date ? value.toISOString().slice(0, 10) : (value ?? null)
}

/** `timestamptz` do Postgres → ISO 8601; nulo/ausente permanece nulo. */
function toTimestamp(value: Date | null | undefined): string | null {
  return value instanceof Date ? value.toISOString() : (value ?? null)
}

/**
 * Monta a linha para `sales.lead_digital_audits`. `null` é preservado como
 * "não avaliado" (D-037). O score entra SÓ daqui (`computeDigitalScore`),
 * nunca do `data` — `digitalAuditSchema` já removeu `digital_score`/
 * `digital_score_completeness` do input (D-038).
 */
function buildPayload(
  data: DigitalAuditInput,
  orgId: string,
  score: { score: number | null; completeness: number },
): AuditInsert {
  const {
    researched_at: researchedAt,
    instagram_last_post_date: lastPostDate,
    pagespeed_analyzed_at: analyzedAt,
    ...columns
  } = data

  const payload: AuditInsert = {
    ...columns,
    org_id: orgId,
    instagram_last_post_date: toDateOnly(lastPostDate),
    pagespeed_analyzed_at: toTimestamp(analyzedAt),
    digital_score: score.score,
    digital_score_completeness: score.completeness,
  }

  // `researched_at` é `not null default current_date` no banco: só grava
  // quando o usuário informou uma data; senão deixa o default do Postgres.
  if (researchedAt instanceof Date) {
    payload.researched_at = researchedAt.toISOString().slice(0, 10)
  }

  return payload
}

/**
 * Núcleo da gravação do dossiê digital (7.4). Mesmo padrão de
 * `lead-intake-core.ts` (D-020): recebe `supabase`/`orgId`/`userId` prontos,
 * sem `'use server'`/`next/headers` — testável direto contra o Supabase real.
 *
 * Ordem: Zod → `checkBelongsToOrg('leads', ...)` → (se `audit_id`)
 * `checkBelongsToOrg('lead_digital_audits', ...)` → `computeDigitalScore` →
 * `insert` (auditoria nova, 1:N — nunca sobrescreve histórico) ou `update`
 * (linha revalidada como da org) → `logAudit`.
 */
export async function saveDigitalAuditCore(
  supabase: SalesClient,
  orgId: string,
  userId: string | null,
  input: unknown,
): Promise<DigitalAuditResult> {
  const parsed = digitalAuditSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { auditId, error: auditIdError } = readAuditId(input)
  if (auditIdError) {
    return { error: auditIdError }
  }

  // D-020: `lead_id` é só um uuid do cliente. A FK prova que a linha existe
  // em algum lugar, não que é desta organização; a RLS de
  // `lead_digital_audits` filtra pelo `org_id` da própria linha, não cruza
  // com o lead referenciado. Erro de banco vira erro reportado, ausência
  // vira "não encontrado" — distinção feita por `checkBelongsToOrg`.
  const leadError = await checkBelongsToOrg(supabase, 'leads', parsed.data.lead_id, orgId, 'Lead não encontrado.')
  if (leadError) {
    return { error: leadError }
  }

  if (auditId) {
    const auditError = await checkBelongsToOrg(
      supabase,
      'lead_digital_audits',
      auditId,
      orgId,
      'Auditoria não encontrada.',
    )
    if (auditError) {
      return { error: auditError }
    }
  }

  const score = computeDigitalScore(toScoreInput(parsed.data))
  const payload = buildPayload(parsed.data, orgId, score)

  const diff: Json = {
    lead_id: parsed.data.lead_id,
    digital_score: score.score,
    digital_score_completeness: score.completeness,
  }

  if (auditId) {
    const { data, error } = await supabase
      .from('lead_digital_audits')
      .update(payload)
      .eq('id', auditId)
      .eq('org_id', orgId)
      .select('id')
      .single()

    if (error || !data) {
      return { error: SAVE_ERROR }
    }

    await logAudit(supabase, orgId, userId, 'lead_digital_audit', data.id, 'update', diff)
    return { error: null, auditId: data.id, digitalScore: score.score, completeness: score.completeness }
  }

  const { data, error } = await supabase
    .from('lead_digital_audits')
    .insert({ ...payload, created_by: userId })
    .select('id')
    .single()

  if (error || !data) {
    return { error: SAVE_ERROR }
  }

  await logAudit(supabase, orgId, userId, 'lead_digital_audit', data.id, 'create', diff)
  return { error: null, auditId: data.id, digitalScore: score.score, completeness: score.completeness }
}
