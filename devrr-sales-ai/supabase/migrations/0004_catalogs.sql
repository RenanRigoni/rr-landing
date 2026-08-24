-- Fase 3.1 — catálogos configuráveis por organização: fontes de lead e
-- estágios do pipeline. Ver docs/DATABASE.md → Tabelas — Fase 3 (leads).
--
-- Dado operacional, não de governança do tenant (D-017 não se aplica aqui:
-- editar fonte/estágio não muda quem manda nem se o tenant existe) — segue o
-- padrão tenant_isolation "for all" padrão do schema.

create table sales.lead_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

alter table sales.lead_sources enable row level security;

create policy tenant_isolation on sales.lead_sources
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

create table sales.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  key text not null,
  label text not null,
  position smallint not null,
  probability smallint not null default 0,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, key),
  unique (org_id, position) deferrable initially deferred
);

alter table sales.pipeline_stages enable row level security;

create policy tenant_isolation on sales.pipeline_stages
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

create trigger pipeline_stages_set_updated_at
  before update on sales.pipeline_stages
  for each row execute function sales.fn_set_updated_at();

-- Semeia os catálogos padrão de uma organização nova: 6 fontes + 7 estágios
-- (docs/DATABASE.md → pipeline_stages, valores do roadmap original).
-- security definer porque roda dentro de create_organization, ANTES de a
-- membership existir — sem isso a policy tenant_isolation bloquearia o
-- próprio insert de seed. Não é chamável direto pelo cliente: revogado de
-- authenticated logo abaixo, único caminho é via create_organization. Sem
-- essa revogação, qualquer usuário autenticado poderia chamar
-- seed_org_defaults(org_id_alheio) e a função, rodando como dona da tabela,
-- ignoraria a RLS e semearia catálogo em organização de outro tenant.
create or replace function sales.seed_org_defaults(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = sales, public
as $fn$
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
end;
$fn$;

revoke all on function sales.seed_org_defaults(uuid) from public;
revoke execute on function sales.seed_org_defaults(uuid) from authenticated;

-- create_organization (0002) passa a semear os catálogos padrão na mesma
-- transação em que cria a org e a membership do owner. CREATE OR REPLACE não
-- altera dono nem grants existentes — a função continua revogada de public e
-- concedida a authenticated como na 0002, nenhum grant repetido aqui.
create or replace function sales.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = sales, public
as $fn$
declare
  v_org_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix int := 0;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Nome da organização é obrigatório';
  end if;

  v_base_slug := lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug = '' then
    v_base_slug := 'org';
  end if;
  v_slug := v_base_slug;

  while exists (select 1 from sales.organizations where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  end loop;

  insert into sales.organizations (name, slug)
  values (btrim(p_name), v_slug)
  returning id into v_org_id;

  insert into sales.org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  perform sales.seed_org_defaults(v_org_id);

  return v_org_id;
end;
$fn$;
