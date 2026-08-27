-- Fase 5.4 — audit_logs: trilha de auditoria de operações comerciais
-- (create / update / stage_change / cancel_followups / ai_used). Ver
-- docs/DATABASE.md → sales.audit_logs.
--
-- Dado operacional, não de governança (D-017 não se aplica: registrar que
-- algo aconteceu não muda quem manda nem se o tenant existe) — segue o
-- padrão tenant_isolation "for all" do schema, mesma classificação de
-- activities (4.1) e ai_runs (5.1).
--
-- Sem trigger de updated_at: a tabela não tem essa coluna (é append-only por
-- natureza — docs/DATABASE.md), só `created_at default now()`.

create table sales.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  entity text not null,
  entity_id uuid,
  action text not null,
  diff jsonb,
  created_at timestamptz not null default now()
);

-- Consulta típica: "o que aconteceu com esta entidade, mais recente primeiro".
create index audit_logs_org_entity_idx on sales.audit_logs (org_id, entity, entity_id, created_at desc);

alter table sales.audit_logs enable row level security;

create policy tenant_isolation on sales.audit_logs
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));
