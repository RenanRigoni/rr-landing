-- Fase 4.1 — activities: histórico, tarefa manual e follow-up automático na
-- mesma tabela. Ver docs/DATABASE.md → Tabelas — Fase 4 (follow-up).
--
-- Dado operacional (D-017 não se aplica: registrar/agendar atividade não
-- muda quem manda nem se o tenant existe) — segue o padrão tenant_isolation
-- "for all" padrão do schema, mesma classificação de contacts/leads (3.2).
--
-- `rule_id` referencia sales.followup_rules, criada só na migration 0007
-- (mesma tarefa 4.1, ordem documentada em DATABASE.md → Ordem das
-- migrations: 0006 activities antes de 0007 followup_rules). Nasce aqui sem
-- FK — a constraint entra via ALTER TABLE em 0007, depois que a tabela
-- referenciada existe. Mesma classe de referência antecipada que
-- current_org_ids()/org_members resolveu em 0001, agora para FK de tabela
-- em vez de corpo de função.
--
-- `ai_run_id` referencia sales.ai_runs, que só nasce na migration 0008
-- (Fase 5.1) — mesma situação, FK entra lá, fora do escopo desta tarefa.

create table sales.activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  lead_id uuid not null references sales.leads(id) on delete cascade,
  contact_id uuid references sales.contacts(id),
  type sales.activity_type not null,
  title text not null,
  body text,
  status sales.activity_status not null default 'done',
  due_at timestamptz,
  done_at timestamptz,
  is_auto boolean not null default false,
  rule_id uuid,
  step_number smallint,
  ai_run_id uuid,
  is_demo boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tela "Ações de hoje" filtra por pendente + vencimento — hot path da Fase 4.
create index activities_org_status_due_idx on sales.activities (org_id, status, due_at) where status = 'pending';
-- Timeline do lead, mais recente primeiro.
create index activities_org_lead_created_idx on sales.activities (org_id, lead_id, created_at desc);

alter table sales.activities enable row level security;

create policy tenant_isolation on sales.activities
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

create trigger activities_set_updated_at
  before update on sales.activities
  for each row execute function sales.fn_set_updated_at();
