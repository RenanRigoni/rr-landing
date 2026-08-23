-- Fase 2.1 — fundação do schema `sales`: schema, trigger de updated_at,
-- helper de multi-tenancy, grants/default privileges e todos os enums.
-- Ver docs/DATABASE.md (fonte de verdade legível) e docs/ARCHITECTURE.md → Multiempresa.

create schema if not exists sales;

create or replace function sales.fn_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- Resolve as organizações do usuário logado.
-- security definer é OBRIGATÓRIO: sem ele a policy de org_members consultaria
-- org_members, disparando a própria policy → recursão infinita.
create or replace function sales.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = sales, public
as $fn$
  select org_id from sales.org_members where user_id = auth.uid()
$fn$;

revoke all on function sales.current_org_ids() from public;
grant execute on function sales.current_org_ids() to authenticated;

-- Grants — docs/DATABASE.md → Grants. Sem `alter default privileges`, a
-- primeira tabela criada pela migration 0002 nasce sem privilégio e o
-- PostgREST devolve "permission denied" antes de a RLS ser consultada.
-- Nada concedido a `anon`: todas as policies deste schema são `to authenticated`.
grant usage on schema sales to authenticated, service_role;

grant select, insert, update, delete on all tables in schema sales
  to authenticated, service_role;

alter default privileges in schema sales
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema sales
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema sales
  grant execute on functions to authenticated, service_role;

-- Enums
create type sales.org_role        as enum ('owner', 'admin', 'member');
create type sales.lead_status     as enum ('open', 'won', 'lost');
create type sales.lead_temp       as enum ('cold', 'warm', 'hot');
create type sales.activity_type   as enum (
  'note', 'call', 'whatsapp', 'email', 'meeting', 'task', 'followup', 'proposal_sent'
);
create type sales.activity_status as enum ('pending', 'done', 'cancelled');
create type sales.ai_run_status   as enum ('pending_review', 'reviewed', 'discarded', 'error');
