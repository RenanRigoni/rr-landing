import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { digitalAuditSchema, type DigitalAuditInput } from '@/lib/validation/digital-audit'
import { computeDigitalScore, type DigitalAuditFields } from '@/lib/domain/digital-score'
import { resolveClearedFields, type DigitalAuditDependentField } from '@/lib/domain/digital-audit-cascade'
import { checkBelongsToOrg } from '@/lib/actions/leads-core'
import { logAudit } from '@/lib/actions/audit'
import type { Database, Json } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>
type AuditInsert = Database['sales']['Tables']['lead_digital_audits']['Insert']
type AuditUpdate = Database['sales']['Tables']['lead_digital_audits']['Update']

export interface DigitalAuditResult {
  error: string | null
  auditId?: string
  /** Score calculado no servidor (D-038). `null` quando nada foi avaliável. */
  digitalScore?: number | null
  completeness?: number
}

const SAVE_ERROR = 'Não foi possível salvar o dossiê digital.'
const VERIFY_ERROR = 'Não foi possível verificar a entidade relacionada.'
const NOT_FOUND_ERROR = 'Auditoria não encontrada.'
const LEAD_MISMATCH_ERROR = 'Esta auditoria pertence a outro lead.'

/**
 * Estado necessário para recalcular o score do jeito certo num update: os 46
 * campos que entram em `computeDigitalScore` (que já incluem as três bases de
 * cascata) mais o `lead_id`, que é imutável e precisa ser conferido.
 *
 * String literal única, nunca concatenada — o `.select()` do postgrest-js
 * perde o tipo se a string for montada com `+` (achado registrado em
 * `lib/queries/leads.ts`). Não é `select *` (regra dura do CLAUDE.md).
 *
 * Não é a lista de leitura da 7.5: aqui só entra o que o **caminho de
 * escrita** precisa para não gravar um score que descreve outra coisa.
 */
const AUDIT_STATE_COLUMNS =
  'lead_id, google_business_profile, google_rating, google_reviews_count, google_recent_reviews, google_replies_reviews, google_has_photos, google_has_hours, google_has_phone, google_has_website, google_easy_whatsapp, google_has_booking, website_exists, website_https, website_mobile_friendly, website_visual_quality, website_perceived_speed, website_services_clear, website_has_target_service_page, website_has_clear_cta, website_has_whatsapp, website_has_contact_form, website_has_online_booking, website_phone_visible, website_has_social_proof, conversion_clear_contact_path, conversion_clicks_to_whatsapp, conversion_cta_above_fold, conversion_repeated_cta, conversion_alternative_capture, conversion_has_friction, pagespeed_mobile_performance, pagespeed_mobile_core_web_vitals, pagespeed_mobile_seo, pagespeed_mobile_accessibility, pagespeed_mobile_best_practices, pagespeed_desktop_performance, pagespeed_desktop_core_web_vitals, instagram_exists, instagram_has_bio_link, instagram_clear_bio, instagram_has_cta, instagram_easy_whatsapp, instagram_easy_website, instagram_active, instagram_visual_quality, instagram_services_content'

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
 * (campo ausente) e `null` (campo limpo) são a mesma coisa aqui: "não
 * avaliado" (D-037), então coalesce para `null`.
 *
 * Recebe o **estado final** (persistido + patch + cascata), não o patch cru —
 * ver `saveDigitalAuditCore`.
 */
function toScoreInput(state: DigitalAuditInput): DigitalAuditFields {
  return {
    google_business_profile: state.google_business_profile ?? null,
    google_rating: state.google_rating ?? null,
    google_reviews_count: state.google_reviews_count ?? null,
    google_recent_reviews: state.google_recent_reviews ?? null,
    google_replies_reviews: state.google_replies_reviews ?? null,
    google_has_photos: state.google_has_photos ?? null,
    google_has_hours: state.google_has_hours ?? null,
    google_has_phone: state.google_has_phone ?? null,
    google_has_website: state.google_has_website ?? null,
    google_easy_whatsapp: state.google_easy_whatsapp ?? null,
    google_has_booking: state.google_has_booking ?? null,
    website_exists: state.website_exists ?? null,
    website_https: state.website_https ?? null,
    website_mobile_friendly: state.website_mobile_friendly ?? null,
    website_visual_quality: state.website_visual_quality ?? null,
    website_perceived_speed: state.website_perceived_speed ?? null,
    website_services_clear: state.website_services_clear ?? null,
    website_has_target_service_page: state.website_has_target_service_page ?? null,
    website_has_clear_cta: state.website_has_clear_cta ?? null,
    website_has_whatsapp: state.website_has_whatsapp ?? null,
    website_has_contact_form: state.website_has_contact_form ?? null,
    website_has_online_booking: state.website_has_online_booking ?? null,
    website_phone_visible: state.website_phone_visible ?? null,
    website_has_social_proof: state.website_has_social_proof ?? null,
    conversion_clear_contact_path: state.conversion_clear_contact_path ?? null,
    conversion_clicks_to_whatsapp: state.conversion_clicks_to_whatsapp ?? null,
    conversion_cta_above_fold: state.conversion_cta_above_fold ?? null,
    conversion_repeated_cta: state.conversion_repeated_cta ?? null,
    conversion_alternative_capture: state.conversion_alternative_capture ?? null,
    conversion_has_friction: state.conversion_has_friction ?? null,
    pagespeed_mobile_performance: state.pagespeed_mobile_performance ?? null,
    pagespeed_mobile_core_web_vitals: state.pagespeed_mobile_core_web_vitals ?? null,
    pagespeed_mobile_seo: state.pagespeed_mobile_seo ?? null,
    pagespeed_mobile_accessibility: state.pagespeed_mobile_accessibility ?? null,
    pagespeed_mobile_best_practices: state.pagespeed_mobile_best_practices ?? null,
    pagespeed_desktop_performance: state.pagespeed_desktop_performance ?? null,
    pagespeed_desktop_core_web_vitals: state.pagespeed_desktop_core_web_vitals ?? null,
    instagram_exists: state.instagram_exists ?? null,
    instagram_has_bio_link: state.instagram_has_bio_link ?? null,
    instagram_clear_bio: state.instagram_clear_bio ?? null,
    instagram_has_cta: state.instagram_has_cta ?? null,
    instagram_easy_whatsapp: state.instagram_easy_whatsapp ?? null,
    instagram_easy_website: state.instagram_easy_website ?? null,
    instagram_active: state.instagram_active ?? null,
    instagram_visual_quality: state.instagram_visual_quality ?? null,
    instagram_services_content: state.instagram_services_content ?? null,
  }
}

/** `timestamptz` do Postgres → ISO 8601; nulo permanece nulo. */
function toTimestamp(value: Date | null | undefined): string | null {
  return value instanceof Date ? value.toISOString() : null
}

/**
 * Colunas que o request pediu para escrever. `lead_id` sai daqui de propósito:
 * é imutável depois de criada a auditoria e só entra no `insert`.
 *
 * Campo ausente do patch **não vira chave** no payload (Zod não põe a chave no
 * output quando ela não veio — verificado), então update parcial não apaga
 * coluna que o usuário não tocou. Campo enviado vazio vira `null` e limpa, que
 * é o comportamento pedido.
 *
 * `researched_at` e `instagram_last_post_date` já são strings `AAAA-MM-DD`
 * vindas do schema (7.3/7.4): datas de calendário não passam por `Date` em
 * nenhum ponto, então não há como o fuso deslocar o dia.
 * `pagespeed_analyzed_at` é instante e continua `Date` → ISO.
 */
function buildColumns(data: DigitalAuditInput): AuditUpdate {
  const {
    lead_id: _leadId,
    researched_at: researchedAt,
    pagespeed_analyzed_at: analyzedAt,
    ...columns
  } = data

  const payload: AuditUpdate = { ...columns }

  // Só toca a coluna se o request a enviou — e `researched_at` é `not null` no
  // banco, então enviá-la vazia significa "mantém o que está lá" (no insert,
  // o default `current_date`), nunca gravar `null`.
  if (researchedAt !== null && researchedAt !== undefined) {
    payload.researched_at = researchedAt
  }
  if ('pagespeed_analyzed_at' in data) {
    payload.pagespeed_analyzed_at = toTimestamp(analyzedAt)
  }

  return payload
}

/**
 * Prova, em tempo de compilação, que todo campo das listas de cascata é uma
 * coluna real de `sales.lead_digital_audits` — `lib/domain/` não importa
 * `database.types.ts` (regra de dependência), então a conferência acontece
 * aqui, na camada que conhece os dois lados. Sem isto, um nome errado numa
 * lista viraria uma coluna fantasma no `update`, rejeitada só em runtime.
 */
type ClearedPatch = Partial<Record<DigitalAuditDependentField, null>>
type DependentFieldsAreRealColumns = DigitalAuditDependentField extends keyof AuditUpdate ? true : never
const dependentFieldsAreRealColumns: DependentFieldsAreRealColumns = true
void dependentFieldsAreRealColumns

/**
 * Núcleo da gravação do dossiê digital (7.4). Mesmo padrão de
 * `lead-intake-core.ts` (D-020): recebe `supabase`/`orgId`/`userId` prontos,
 * sem `'use server'`/`next/headers` — testável direto contra o Supabase real.
 *
 * Ordem: Zod → `checkBelongsToOrg('leads', ...)` → (update) carrega a
 * auditoria da própria org e confere o vínculo com o lead → mescla estado
 * persistido + patch → aplica cascata → `computeDigitalScore` sobre o estado
 * final → `insert` (auditoria nova, 1:N — nunca sobrescreve histórico) ou
 * `update` → `logAudit`.
 *
 * Três invariantes que este core garante e que nem o schema nem a RLS
 * garantem sozinhos:
 *
 * 1. **Auditoria não troca de lead.** `audit_id` e `lead_id` são dois ids
 *    independentes vindos do cliente; ambos pertencerem à mesma organização
 *    não impede transferir a auditoria histórica do lead A para o lead B.
 *    O vínculo é imutável: conferido antes e reforçado no `WHERE` da escrita.
 * 2. **Score descreve a linha, não o request.** Num update parcial,
 *    `computeDigitalScore` sobre o patch produziria uma completude que não
 *    corresponde a nada persistido.
 * 3. **Sem contradição herdada.** O Zod só enxerga um request; mudar
 *    `website_exists` para `nao` num update parcial deixaria os `website_*` e
 *    o PageSpeed antigos no banco.
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

  let current: Partial<DigitalAuditInput> | null = null

  if (auditId) {
    // Substitui o `checkBelongsToOrg` da versão anterior: além de provar que a
    // linha é da organização, traz o estado que o recálculo do score precisa —
    // uma consulta só, mesma distinção erro × ausência.
    const { data, error } = await supabase
      .from('lead_digital_audits')
      .select(AUDIT_STATE_COLUMNS)
      .eq('id', auditId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) {
      return { error: VERIFY_ERROR }
    }
    if (!data) {
      return { error: NOT_FOUND_ERROR }
    }
    // Uma auditoria é imutavelmente vinculada ao lead para o qual foi criada.
    // Sem esta conferência, `audit_id` do lead A + `lead_id` do lead B (mesma
    // org, ambos válidos) transferiria a auditoria histórica entre leads.
    if (data.lead_id !== parsed.data.lead_id) {
      return { error: LEAD_MISMATCH_ERROR }
    }
    current = data
  }

  // Estado final = o que já estava persistido, sobrescrito pelo que o request
  // mandou. Chave ausente do patch não existe em `parsed.data`, então o valor
  // do banco sobrevive; chave enviada vazia chega como `null` e limpa.
  const mergedState: DigitalAuditInput = { ...current, ...parsed.data }

  // Cascata sobre o estado final, não sobre o patch: é o que impede
  // `website_exists = 'nao'` de conviver com URL/PageSpeed gravados antes.
  const clearedFields = resolveClearedFields(mergedState)
  const clearedPatch: ClearedPatch = {}
  for (const field of clearedFields) {
    clearedPatch[field] = null
  }

  // MESMO estado normalizado alimenta o score e a gravação.
  const normalizedState: DigitalAuditInput = { ...mergedState, ...clearedPatch }
  const score = computeDigitalScore(toScoreInput(normalizedState))

  const payload: AuditUpdate = {
    ...buildColumns(parsed.data),
    ...clearedPatch,
    digital_score: score.score,
    digital_score_completeness: score.completeness,
  }

  const diff: Json = {
    lead_id: parsed.data.lead_id,
    digital_score: score.score,
    digital_score_completeness: score.completeness,
    cleared_by_cascade: clearedFields.length,
  }

  if (auditId) {
    const { data, error } = await supabase
      .from('lead_digital_audits')
      .update(payload)
      .eq('id', auditId)
      .eq('org_id', orgId)
      // Reforça a imutabilidade do vínculo na própria escrita: mesmo que algo
      // mudasse a linha entre a leitura acima e este update, o `WHERE` não
      // alcança uma auditoria de outro lead.
      .eq('lead_id', parsed.data.lead_id)
      .select('id')
      .single()

    if (error || !data) {
      return { error: SAVE_ERROR }
    }

    await logAudit(supabase, orgId, userId, 'lead_digital_audit', data.id, 'update', diff)
    return { error: null, auditId: data.id, digitalScore: score.score, completeness: score.completeness }
  }

  const insertPayload: AuditInsert = {
    ...payload,
    org_id: orgId,
    lead_id: parsed.data.lead_id,
    created_by: userId,
  }

  const { data, error } = await supabase
    .from('lead_digital_audits')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error || !data) {
    return { error: SAVE_ERROR }
  }

  await logAudit(supabase, orgId, userId, 'lead_digital_audit', data.id, 'create', diff)
  return { error: null, auditId: data.id, digitalScore: score.score, completeness: score.completeness }
}
