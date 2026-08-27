-- Fase 5.1 — infra de IA: ai_prompts (prompt versionado por organização,
-- nunca hardcoded no código) e ai_runs (histórico completo de execução,
-- inclusive falhas). Ver docs/DATABASE.md → Tabelas — Fase 5 (IA).
--
-- Dado operacional (D-017 não se aplica: gerar/revisar mensagem de IA não
-- muda quem manda nem se o tenant existe) — segue o padrão tenant_isolation
-- "for all" padrão do schema, mesma classificação de activities (4.1).
--
-- Enum `ai_run_status` já existe desde a 0001 (referência antecipada
-- deliberada, mesmo padrão do enum de activity_type/lead_status).

create table sales.ai_prompts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  slug text not null,
  version smallint not null default 1,
  system_prompt text not null,
  user_prompt_template text not null,
  model text not null default 'anthropic/claude-sonnet-5',
  temperature numeric(3, 2) not null default 0.7,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug, version)
);

-- Garante um prompt ativo por slug por organização — é nele que
-- runAiPrompt() busca (lib/ai/gateway.ts).
create unique index ai_prompts_org_slug_active_idx on sales.ai_prompts (org_id, slug) where is_active;

alter table sales.ai_prompts enable row level security;

create policy tenant_isolation on sales.ai_prompts
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

create trigger ai_prompts_set_updated_at
  before update on sales.ai_prompts
  for each row execute function sales.fn_set_updated_at();

create table sales.ai_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  prompt_id uuid references sales.ai_prompts(id),
  lead_id uuid references sales.leads(id) on delete cascade,
  contact_id uuid references sales.contacts(id),
  input_payload jsonb,
  raw_response text,
  parsed_output jsonb,
  status sales.ai_run_status not null default 'pending_review',
  model text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  error_message text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table sales.ai_runs enable row level security;

create policy tenant_isolation on sales.ai_runs
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

-- Referência antecipada da 0006: activities.ai_run_id nasceu sem FK porque
-- esta tabela ainda não existia. Fecha agora.
alter table sales.activities
  add constraint activities_ai_run_id_fkey
  foreign key (ai_run_id) references sales.ai_runs(id);
