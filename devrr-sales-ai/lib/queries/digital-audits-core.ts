import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>

export type DigitalAudit = Database['sales']['Tables']['lead_digital_audits']['Row']

/**
 * Núcleo de leitura do dossiê digital (7.5). Mesmo motivo de existir que
 * `buildFollowupContext` em `lib/queries/ai-context.ts` (D-030) e de todo
 * `*-core` de `lib/actions/` (D-020): recebe `supabase`/`orgId` já
 * resolvidos, sem `'use server'`/`server-only`/`next/headers` — testável
 * direto contra o Supabase real, com os dois usuários de teste, sem mock de
 * `cookies()`.
 *
 * `import 'server-only'` (que a camada de `queries/` normalmente carrega)
 * lança sempre que o módulo é importado fora do bundler do Next, mesmo em
 * Node puro (mesma nota de `tests/helpers/rls-fixtures.ts` sobre
 * `lib/supabase/admin.ts` — confirmado lendo `node_modules/server-only/index.js`:
 * o `export default` dessa dependência é só `throw new Error(...)`, sem
 * condição alguma fora do `exports.react-server` do bundler). Um arquivo com
 * essa guarda não pode ser importado por nenhum teste vitest — é por isso
 * que nenhuma das outras camadas de `queries/` sem separação `-core`
 * (`leads.ts`, `activities.ts`, `today.ts`, `orgs.ts`) tem teste direto hoje.
 * `lib/queries/digital-audits.ts` é o wrapper `server-only`, com as
 * assinaturas exatas de `IMPLEMENTATION_PLAN.md` → 7.5, que só resolve
 * `requireOrgId()`/`createClient()` e delega para cá.
 */

/**
 * Todas as 109 colunas de `sales.lead_digital_audits` (migration 0012), na
 * mesma ordem do `create table` — nunca `select *` (regra dura do
 * `CLAUDE.md`). String literal única, nunca concatenada: `.select()` do
 * postgrest-js perde o tipo (cai em `GenericStringError`) se a string vier de
 * `+` — mesmo achado já registrado em `lib/queries/leads.ts`/`today.ts`.
 *
 * Nenhuma coluna recalculada aqui: `digital_score`/`digital_score_completeness`
 * são as que a action da 7.4 já persistiu — leitura não reavalia score nem
 * normaliza nada (regra da fase: `IMPLEMENTATION_PLAN.md` → Fase 7). Datas
 * de calendário (`researched_at`, `instagram_last_post_date`) chegam como
 * string `AAAA-MM-DD` do próprio driver, sem conversão; `pagespeed_analyzed_at`
 * chega como string ISO de `timestamptz` — nenhuma das duas é tocada aqui.
 */
const DIGITAL_AUDIT_COLUMNS =
  'id, org_id, lead_id, researched_at, created_by, created_at, updated_at, search_query, search_location, found_on_google, google_result_type, google_ads_active, google_ads_position, google_organic_position, google_search_result_url, google_business_profile, google_business_name, google_business_category, google_rating, google_reviews_count, google_recent_reviews, google_replies_reviews, google_has_photos, google_has_hours, google_has_phone, google_has_website, google_easy_whatsapp, google_has_booking, google_profile_completeness, google_notes, website_exists, website_url, website_https, website_mobile_friendly, website_visual_quality, website_perceived_speed, website_services_clear, website_has_target_service_page, website_target_service_url, website_has_clear_cta, website_has_whatsapp, website_whatsapp_clickable, website_whatsapp_floating, website_has_contact_form, website_has_online_booking, website_phone_visible, website_address_visible, website_has_social_proof, website_has_clear_differentiators, website_has_team, website_content_updated, website_notes, conversion_clear_contact_path, conversion_clicks_to_whatsapp, conversion_cta_above_fold, conversion_repeated_cta, conversion_alternative_capture, conversion_has_friction, conversion_friction_notes, instagram_exists, instagram_username, instagram_url, instagram_has_bio_link, instagram_clear_bio, instagram_has_cta, instagram_easy_whatsapp, instagram_easy_website, instagram_active, instagram_last_post_date, instagram_visual_quality, instagram_services_content, instagram_content_cta, instagram_notes, pagespeed_mobile_performance, pagespeed_mobile_accessibility, pagespeed_mobile_best_practices, pagespeed_mobile_seo, pagespeed_mobile_core_web_vitals, pagespeed_mobile_lcp, pagespeed_mobile_inp, pagespeed_mobile_cls, pagespeed_mobile_fcp, pagespeed_mobile_tbt, pagespeed_mobile_speed_index, pagespeed_desktop_performance, pagespeed_desktop_accessibility, pagespeed_desktop_best_practices, pagespeed_desktop_seo, pagespeed_desktop_core_web_vitals, pagespeed_desktop_lcp, pagespeed_desktop_inp, pagespeed_desktop_cls, pagespeed_desktop_fcp, pagespeed_desktop_tbt, pagespeed_desktop_speed_index, pagespeed_analyzed_url, pagespeed_analyzed_at, pagespeed_mobile_report_url, pagespeed_desktop_report_url, pagespeed_field_data_available, pagespeed_notes, digital_problems, digital_strengths, digital_opportunities, digital_sales_priority, digital_opportunity_score, digital_opportunity_reason, digital_score, digital_score_completeness'

/**
 * Auditoria mais recente do lead — a "atual" (D-035, sem `is_current`,
 * DOSSIE §17). Critério de desempate, do mais para o menos específico:
 *
 * 1. `researched_at desc` — a definição de "atual" em si (data da pesquisa);
 * 2. `created_at desc` — duas auditorias pesquisadas no mesmo dia (`date`,
 *    sem hora): a gravada por último é a mais recente de verdade;
 * 3. `id desc` — mesmo padrão de `listActivitiesForLead`
 *    (`lib/queries/activities.ts`, achado E do checkpoint da Fase 4): linhas
 *    nascidas no mesmo instante (`created_at` idêntico) ficariam com ordem
 *    instável de uma carga para outra sem um terceiro critério sempre
 *    distinto.
 *
 * O índice `(org_id, lead_id, researched_at desc)` (migration 0012) cobre a
 * primeira ordenação e o filtro; os dois desempates recaem sobre um
 * conjunto já pequeno (as auditorias de um único lead). `org_id` é filtro
 * explícito aqui — nunca implícito via join na FK `lead_id`.
 *
 * Ordem da cadeia importa: `.limit(1)` **antes** de `.maybeSingle()`. O corte
 * é do Postgres (vira `Range: 0-0`), então o `maybeSingle` nunca vê mais de
 * uma linha — histórico com N auditorias não é "múltiplas linhas" para ele.
 * Nenhuma variante de `.single()` aqui: lead sem auditoria é estado normal
 * (`null`), não erro. Erro do banco continua erro — nunca vira `null` (o
 * `if (error) throw` abaixo roda antes do `return data`).
 */
export async function getLatestAuditForLeadCore(
  supabase: SalesClient,
  orgId: string,
  leadId: string,
): Promise<DigitalAudit | null> {
  const { data, error } = await supabase
    .from('lead_digital_audits')
    .select(DIGITAL_AUDIT_COLUMNS)
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .order('researched_at', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao carregar a auditoria atual do lead: ${error.message}`)
  }

  return data
}

/**
 * Auditoria por id, restrita à organização atual (`orgId` — nunca do
 * cliente, D-020). `audit_id` de outra organização e `audit_id` inexistente
 * são indistinguíveis por design: os dois voltam `null`, nunca um erro que
 * revele "existe, mas não é seu".
 *
 * `maybeSingle()` sem `limit` aqui é proposital: `id` é PK, então o filtro
 * devolve zero ou uma linha por definição do schema — não há "N linhas" a
 * cortar. Se um dia devolvesse mais de uma, o `maybeSingle` levantaria
 * `PGRST116` e o `throw` abaixo propagaria, em vez de mascarar em `null`.
 */
export async function getAuditByIdCore(
  supabase: SalesClient,
  orgId: string,
  auditId: string,
): Promise<DigitalAudit | null> {
  const { data, error } = await supabase
    .from('lead_digital_audits')
    .select(DIGITAL_AUDIT_COLUMNS)
    .eq('id', auditId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao carregar a auditoria: ${error.message}`)
  }

  return data
}

/**
 * Histórico completo do lead (DOSSIE §17), mais recente primeiro. Mesmo
 * critério de desempate de `getLatestAuditForLeadCore` — a primeira linha
 * deste array é sempre exatamente o que `getLatestAuditForLeadCore`
 * devolveria.
 */
export async function listAuditsForLeadCore(
  supabase: SalesClient,
  orgId: string,
  leadId: string,
): Promise<DigitalAudit[]> {
  const { data, error } = await supabase
    .from('lead_digital_audits')
    .select(DIGITAL_AUDIT_COLUMNS)
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .order('researched_at', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    throw new Error(`Falha ao carregar o histórico de auditorias do lead: ${error.message}`)
  }

  return data ?? []
}

/**
 * Auditoria atual de vários leads de uma vez — usado pela exportação em
 * massa (7.9) e por listagens que precisam comparar leads sem abrir cada
 * dossiê. **Uma única query** (nunca uma por lead — isso escalaria como
 * N+1): busca todas as auditorias dos leads pedidos, já ordenadas pelo mesmo
 * critério de "atual" de `getLatestAuditForLeadCore`, e agrupa em memória —
 * como a primeira linha de cada `lead_id` já é a mais recente dele (mérito
 * da ordenação, não de lógica extra aqui), o loop só precisa guardar a
 * primeira ocorrência e ignorar as seguintes do mesmo lead.
 *
 * Lead sem nenhuma auditoria simplesmente não aparece na Map — é o mesmo
 * "estado vazio" de `getLatestAuditForLeadCore` (`null`), só que expresso
 * como ausência de chave em vez de valor nulo.
 *
 * `leadIds` vazio é estado normal (nenhum lead selecionado na listagem), não
 * erro: devolve a Map vazia **antes** de tocar o Supabase — nada a consultar,
 * e o resultado não fica dependendo do que `.in('lead_id', [])` gera do outro
 * lado (`lead_id=in.()`), que é ida à rede sem propósito.
 *
 * `leadIds` repetido também é estado normal (a mesma lista de leads podendo
 * conter o mesmo id duas vezes): o `Set` deduplica antes do `.in(...)` para
 * não mandar o id repetido no filtro. O contrato não muda — a Map já era
 * chaveada por `lead_id`, então repetição nunca duplicou resultado; o que se
 * evita é a consulta maior à toa.
 *
 * Limitação conhecida, aceita nesta fase: esta query carrega **todo** o
 * histórico de auditorias dos leads pedidos para ficar com a primeira linha
 * de cada um. É o preço de manter uma única query sem `distinct on`/view/RPC
 * (fora do escopo da 7.5). Escala com o número total de auditorias, não com o
 * de leads — aceitável no volume de um dossiê por lead a cada pesquisa.
 */
export async function listLatestAuditsByLeadCore(
  supabase: SalesClient,
  orgId: string,
  leadIds: string[],
): Promise<Map<string, DigitalAudit>> {
  const latestByLead = new Map<string, DigitalAudit>()
  const uniqueLeadIds = [...new Set(leadIds)]

  if (uniqueLeadIds.length === 0) {
    return latestByLead
  }

  const { data, error } = await supabase
    .from('lead_digital_audits')
    .select(DIGITAL_AUDIT_COLUMNS)
    .eq('org_id', orgId)
    .in('lead_id', uniqueLeadIds)
    .order('researched_at', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    throw new Error(`Falha ao carregar as auditorias atuais dos leads: ${error.message}`)
  }

  for (const row of data ?? []) {
    if (!latestByLead.has(row.lead_id)) {
      latestByLead.set(row.lead_id, row)
    }
  }

  return latestByLead
}
