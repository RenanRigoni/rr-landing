-- Fase 7.1 — dossiê digital: 8 enums compartilhados + sales.lead_digital_audits.
-- Contrato campo a campo em docs/DATABASE.md → Tabelas — Fase 7 (dossiê digital),
-- derivado do DOSSIE.md §2–§10. Não inventar/renomear/omitir coluna.
--
-- Dado operacional, não de governança (D-017 não se aplica) — policy
-- tenant_isolation "for all" padrão do schema, mesma classificação de
-- contacts/leads/activities.
--
-- 1:N com leads (D-035): um lead pode ter várias auditorias em datas
-- diferentes; a "atual" é a de maior researched_at (empate por created_at),
-- sem flag is_current. Todo campo é nullable exceto os de identidade — nulo
-- significa "não foi possível encontrar/avaliar", nunca zero (D-037).
--
-- lead_id NÃO garante organização por FK (mesma armadilha de leads.contact_id,
-- D-020): a checagem de tenant é da camada de lib/actions/ (checkBelongsToOrg),
-- fora do escopo desta migration.
--
-- Nenhuma coluna nova em sales.leads. Tabela nasce vazia; todo lead atual
-- continua válido sem auditoria nenhuma.

-- Enums do dossiê (D-036): vocabulários compartilhados entre dezenas de
-- colunas. A UI escolhe o subconjunto que faz sentido em cada campo; o banco
-- só garante que nada fora do vocabulário entra.
create type sales.tri_state as enum (
  'sim', 'nao', 'parcialmente', 'nao_identificado', 'nao_analisado', 'nao_se_aplica'
);
create type sales.quality_level      as enum ('excelente', 'boa', 'regular', 'ruim', 'nao_analisado');
create type sales.frequency_level    as enum ('frequentemente', 'algumas', 'raramente', 'nao', 'nao_analisado');
create type sales.speed_level        as enum ('rapido', 'aceitavel', 'lento', 'muito_lento', 'nao_analisado');
create type sales.activity_level     as enum ('ativo', 'pouco_ativo', 'inativo', 'nao_analisado');
create type sales.cwv_status         as enum ('aprovado', 'reprovado', 'dados_insuficientes', 'nao_analisado');
create type sales.google_result_type as enum ('organico', 'patrocinado', 'maps', 'outro', 'nao_identificado');
create type sales.sales_priority     as enum ('muito_alta', 'alta', 'media', 'baixa', 'nao_avaliada');

create table sales.lead_digital_audits (
  -- Identidade (não-nullable)
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references sales.organizations(id) on delete cascade,
  lead_id       uuid not null references sales.leads(id) on delete cascade,
  researched_at date not null default current_date,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Origem da prospecção (DOSSIE §2)
  search_query             text,
  search_location          text,
  found_on_google          sales.tri_state,
  google_result_type       sales.google_result_type,
  google_ads_active        sales.tri_state,
  google_ads_position      smallint check (google_ads_position >= 1),
  google_organic_position  smallint check (google_organic_position >= 1),
  google_search_result_url text,

  -- Google Business Profile / Maps (DOSSIE §3)
  google_business_profile     sales.tri_state,
  google_business_name        text,
  google_business_category    text,
  google_rating               numeric(2,1) check (google_rating between 0 and 5),
  google_reviews_count        integer check (google_reviews_count >= 0),
  google_recent_reviews       sales.tri_state,
  google_replies_reviews      sales.frequency_level,
  google_has_photos           sales.tri_state,
  google_has_hours            sales.tri_state,
  google_has_phone            sales.tri_state,
  google_has_website          sales.tri_state,
  google_easy_whatsapp        sales.tri_state,
  google_has_booking          sales.tri_state,
  google_profile_completeness sales.quality_level,
  google_notes                text,

  -- Website (DOSSIE §4)
  website_exists                    sales.tri_state,
  website_url                       text,
  website_https                     sales.tri_state,
  website_mobile_friendly           sales.tri_state,
  website_visual_quality            sales.quality_level,
  website_perceived_speed           sales.speed_level,
  website_services_clear            sales.tri_state,
  website_has_target_service_page   sales.tri_state,
  website_target_service_url        text,
  website_has_clear_cta             sales.tri_state,
  website_has_whatsapp              sales.tri_state,
  website_whatsapp_clickable        sales.tri_state,
  website_whatsapp_floating         sales.tri_state,
  website_has_contact_form          sales.tri_state,
  website_has_online_booking        sales.tri_state,
  website_phone_visible             sales.tri_state,
  website_address_visible           sales.tri_state,
  website_has_social_proof          sales.tri_state,
  website_has_clear_differentiators sales.tri_state,
  website_has_team                  sales.tri_state,
  website_content_updated           sales.tri_state,
  website_notes                     text,

  -- Conversão digital (DOSSIE §5)
  conversion_clear_contact_path  sales.tri_state,
  conversion_clicks_to_whatsapp  smallint check (conversion_clicks_to_whatsapp >= 0),
  conversion_cta_above_fold      sales.tri_state,
  conversion_repeated_cta        sales.tri_state,
  conversion_alternative_capture sales.tri_state,
  conversion_has_friction        sales.tri_state,
  conversion_friction_notes      text,

  -- Instagram (DOSSIE §6)
  instagram_exists           sales.tri_state,
  instagram_username         text,
  instagram_url              text,
  instagram_has_bio_link     sales.tri_state,
  instagram_clear_bio        sales.tri_state,
  instagram_has_cta          sales.tri_state,
  instagram_easy_whatsapp    sales.tri_state,
  instagram_easy_website     sales.tri_state,
  instagram_active           sales.activity_level,
  instagram_last_post_date   date,
  instagram_visual_quality   sales.quality_level,
  instagram_services_content sales.tri_state,
  instagram_content_cta      sales.frequency_level,
  instagram_notes            text,

  -- PageSpeed mobile (DOSSIE §7). Tempo sempre em ms inteiro (formatação em
  -- segundos é da camada de exibição).
  pagespeed_mobile_performance     smallint check (pagespeed_mobile_performance between 0 and 100),
  pagespeed_mobile_accessibility   smallint check (pagespeed_mobile_accessibility between 0 and 100),
  pagespeed_mobile_best_practices  smallint check (pagespeed_mobile_best_practices between 0 and 100),
  pagespeed_mobile_seo             smallint check (pagespeed_mobile_seo between 0 and 100),
  pagespeed_mobile_core_web_vitals sales.cwv_status,
  pagespeed_mobile_lcp             integer check (pagespeed_mobile_lcp >= 0),
  pagespeed_mobile_inp             integer check (pagespeed_mobile_inp >= 0),
  pagespeed_mobile_cls             numeric(6,3) check (pagespeed_mobile_cls >= 0),
  pagespeed_mobile_fcp             integer check (pagespeed_mobile_fcp >= 0),
  pagespeed_mobile_tbt             integer check (pagespeed_mobile_tbt >= 0),
  pagespeed_mobile_speed_index     integer check (pagespeed_mobile_speed_index >= 0),

  -- PageSpeed desktop — mesmas 11 colunas com prefixo pagespeed_desktop_
  pagespeed_desktop_performance     smallint check (pagespeed_desktop_performance between 0 and 100),
  pagespeed_desktop_accessibility   smallint check (pagespeed_desktop_accessibility between 0 and 100),
  pagespeed_desktop_best_practices  smallint check (pagespeed_desktop_best_practices between 0 and 100),
  pagespeed_desktop_seo             smallint check (pagespeed_desktop_seo between 0 and 100),
  pagespeed_desktop_core_web_vitals sales.cwv_status,
  pagespeed_desktop_lcp             integer check (pagespeed_desktop_lcp >= 0),
  pagespeed_desktop_inp             integer check (pagespeed_desktop_inp >= 0),
  pagespeed_desktop_cls             numeric(6,3) check (pagespeed_desktop_cls >= 0),
  pagespeed_desktop_fcp             integer check (pagespeed_desktop_fcp >= 0),
  pagespeed_desktop_tbt             integer check (pagespeed_desktop_tbt >= 0),
  pagespeed_desktop_speed_index     integer check (pagespeed_desktop_speed_index >= 0),

  -- PageSpeed, informações gerais
  pagespeed_analyzed_url         text,
  pagespeed_analyzed_at          timestamptz,
  pagespeed_mobile_report_url    text,
  pagespeed_desktop_report_url   text,
  pagespeed_field_data_available sales.tri_state,
  pagespeed_notes               text,

  -- Diagnóstico digital (DOSSIE §9)
  digital_problems           text,
  digital_strengths          text,
  digital_opportunities      text[] not null default '{}',
  digital_sales_priority     sales.sales_priority,
  digital_opportunity_score  smallint check (digital_opportunity_score between 0 and 10),
  digital_opportunity_reason text,

  -- Score derivado (DOSSIE §10) — nunca vem do formulário (D-038), é gravado
  -- pela camada de action a partir de lib/domain/digital-score.ts.
  digital_score              smallint check (digital_score between 0 and 100),
  digital_score_completeness smallint check (digital_score_completeness between 0 and 100),

  -- digital_opportunities: subconjunto fechado do vocabulário do DOSSIE §9.
  -- Array em vez de tabela de junção — lista curta, sempre lida junto com a
  -- auditoria, nunca consultada de trás para frente (DOSSIE §16).
  constraint lead_digital_audits_opportunities_subset check (
    digital_opportunities <@ array[
      'google_business','google_reputation','website','landing_page','seo_local',
      'performance','ux_mobile','conversao','whatsapp','automacao','agendamento',
      'captacao_leads','instagram','crm','analytics','outro'
    ]::text[]
  )
);

-- Consulta dominante: "auditoria atual deste lead" (mais recente primeiro).
-- Já cobre a FK lead_id (não entra em unindexed_foreign_keys, Q-008).
create index lead_digital_audits_org_lead_researched_idx
  on sales.lead_digital_audits (org_id, lead_id, researched_at desc);
-- Comparação entre dezenas de empresas por score (DOSSIE §15).
create index lead_digital_audits_org_score_idx
  on sales.lead_digital_audits (org_id, digital_score desc nulls last);

alter table sales.lead_digital_audits enable row level security;

create policy tenant_isolation on sales.lead_digital_audits
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

create trigger lead_digital_audits_set_updated_at
  before update on sales.lead_digital_audits
  for each row execute function sales.fn_set_updated_at();
