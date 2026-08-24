-- Fase 2.2 — organizations + org_members: o tenant e a associação usuário↔org.
-- Ver docs/DATABASE.md → Tabelas — Fase 2 (multiempresa).

create table sales.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Sao_Paulo',
  business_hours jsonb not null default '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sales.organizations enable row level security;

-- Sem org_id próprio: a PK é o discriminador. Insert direto pelo cliente nunca
-- passa (a org não existe em current_org_ids() antes de a membership existir)
-- — por isso a criação é sempre via RPC create_organization(), security definer,
-- que faz as duas gravações na mesma transação. Ver docs/DATABASE.md.
create policy tenant_isolation on sales.organizations
  for all to authenticated
  using (id in (select sales.current_org_ids()))
  with check (id in (select sales.current_org_ids()));

create trigger organizations_set_updated_at
  before update on sales.organizations
  for each row execute function sales.fn_set_updated_at();

create table sales.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role sales.org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- current_org_ids() já consulta esta tabela por user_id em toda policy do
-- schema (é o hot path de todo o RLS multi-tenant) — sem este índice, cada
-- checagem de policy em qualquer tabela faria sequential scan aqui.
create index org_members_user_id_idx on sales.org_members (user_id);

alter table sales.org_members enable row level security;

-- Resolve o papel do usuário logado numa org específica, sem recursão.
-- Mesmo motivo de current_org_ids() (docs/DATABASE.md → Fundação de
-- multi-tenancy): uma policy de escrita em org_members que precisasse
-- consultar org_members diretamente disparia a própria policy. security
-- definer bypassa RLS nessa leitura interna. (org_members já existe acima
-- neste mesmo arquivo — sem referência antecipada, sem precisar do toggle
-- de check_function_bodies que a 0001 usou para current_org_ids().)
create or replace function sales.current_org_role(p_org_id uuid)
returns sales.org_role
language sql
stable
security definer
set search_path = sales, public
as $fn$
  select role from sales.org_members
   where org_id = p_org_id and user_id = auth.uid()
$fn$;

revoke all on function sales.current_org_role(uuid) from public;
grant execute on function sales.current_org_role(uuid) to authenticated;

-- org_members não segue o padrão tenant_isolation "for all" de uma policy só
-- (docs/DATABASE.md → org_members: "policy de escrita restrita a role in
-- ('owner','admin')") — leitura é por associação (todo membro vê os outros
-- membros da própria org), escrita é só para owner/admin. Duas regras
-- diferentes por operação exigem policies separadas.
create policy tenant_isolation_select on sales.org_members
  for select to authenticated
  using (org_id in (select sales.current_org_ids()));

create policy owner_admin_insert on sales.org_members
  for insert to authenticated
  with check (sales.current_org_role(org_id) in ('owner', 'admin'));

create policy owner_admin_update on sales.org_members
  for update to authenticated
  using (sales.current_org_role(org_id) in ('owner', 'admin'))
  with check (sales.current_org_role(org_id) in ('owner', 'admin'));

create policy owner_admin_delete on sales.org_members
  for delete to authenticated
  using (sales.current_org_role(org_id) in ('owner', 'admin'));

-- RPC de criação: precisa ser security definer porque a policy de insert de
-- organizations não passa antes da membership existir (bootstrap). Gera slug
-- a partir do nome (kebab-case, ascii), com sufixo numérico em colisão.
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

  return v_org_id;
end;
$fn$;

revoke all on function sales.create_organization(text) from public;
grant execute on function sales.create_organization(text) to authenticated;
