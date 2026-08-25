-- Fase 4.1 — followup_rules: uma linha por passo da sequência de follow-up,
-- configurável por organização. Ver docs/DATABASE.md → sales.followup_rules.
--
-- Dado operacional/configuração (D-017 não se aplica) — tenant_isolation
-- "for all" padrão, mesma classificação de lead_sources/pipeline_stages
-- (3.1). Sem `is_demo`: é tabela de configuração, não recebe seed de
-- demonstração — mesma regra já aplicada nas duas tabelas de catálogo.

create table sales.followup_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  trigger_stage_id uuid not null references sales.pipeline_stages(id),
  step_number smallint not null,
  delay_days smallint not null,
  channel sales.activity_type not null default 'whatsapp',
  prompt_slug text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, trigger_stage_id, step_number)
);

alter table sales.followup_rules enable row level security;

create policy tenant_isolation on sales.followup_rules
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

create trigger followup_rules_set_updated_at
  before update on sales.followup_rules
  for each row execute function sales.fn_set_updated_at();

-- Referência antecipada da 0006: activities.rule_id nasceu sem FK porque
-- esta tabela ainda não existia. Fecha agora.
alter table sales.activities
  add constraint activities_rule_id_fkey
  foreign key (rule_id) references sales.followup_rules(id);

-- Estende seed_org_defaults (0004) para semear também a sequência padrão de
-- follow-up em 'proposta_enviada': 3 passos, +1d/+3d/+7d (docs/DATABASE.md,
-- valores do roadmap seção 2). CREATE OR REPLACE preserva os grants
-- existentes da função (revogada de public/authenticated na 0004, chamável
-- só de dentro de create_organization) — nada repetido aqui, mesmo padrão já
-- confirmado por execução na tarefa 3.1.
create or replace function sales.seed_org_defaults(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = sales, public
as $fn$
declare
  v_proposta_stage_id uuid;
begin
  insert into sales.lead_sources (org_id, name, position) values
    (p_org_id, 'Site', 0),
    (p_org_id, 'WhatsApp', 1),
    (p_org_id, 'Google', 2),
    (p_org_id, 'Instagram', 3),
    (p_org_id, 'Indicação', 4),
    (p_org_id, 'Outro', 5);

  insert into sales.pipeline_stages (org_id, key, label, position, probability, is_won, is_lost) values
    (p_org_id, 'novo', 'Novo', 0, 5, false, false),
    (p_org_id, 'contatado', 'Contatado', 1, 15, false, false),
    (p_org_id, 'qualificado', 'Qualificado', 2, 30, false, false),
    (p_org_id, 'proposta_enviada', 'Proposta enviada', 3, 50, false, false),
    (p_org_id, 'negociacao', 'Negociação', 4, 75, false, false),
    (p_org_id, 'ganho', 'Ganho', 5, 100, true, false),
    (p_org_id, 'perdido', 'Perdido', 6, 0, false, true);

  select id into v_proposta_stage_id
    from sales.pipeline_stages
   where org_id = p_org_id and key = 'proposta_enviada';

  insert into sales.followup_rules (org_id, trigger_stage_id, step_number, delay_days, channel, prompt_slug) values
    (p_org_id, v_proposta_stage_id, 1, 1, 'whatsapp', 'followup_proposta'),
    (p_org_id, v_proposta_stage_id, 2, 3, 'whatsapp', 'followup_proposta'),
    (p_org_id, v_proposta_stage_id, 3, 7, 'whatsapp', 'followup_proposta');
end;
$fn$;
