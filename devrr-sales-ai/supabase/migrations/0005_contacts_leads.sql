-- Fase 3.2 — contatos e leads: as duas tabelas centrais do produto.
-- Ver docs/DATABASE.md → Tabelas — Fase 3 (leads).
--
-- Dado operacional (D-017): todo membro da organização trabalha o funil da
-- empresa — segue o padrão tenant_isolation "for all" padrão do schema, sem
-- restrição por papel. Mesma classificação já usada em lead_sources e
-- pipeline_stages na 3.1.

create table sales.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  company_name text,
  city text,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usado pela deduplicação no cadastro (3.6) e, na Fase 10, pelo match do
-- webhook do WhatsApp.
create index contacts_org_phone_idx on sales.contacts (org_id, phone) where phone is not null;

alter table sales.contacts enable row level security;

create policy tenant_isolation on sales.contacts
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

create trigger contacts_set_updated_at
  before update on sales.contacts
  for each row execute function sales.fn_set_updated_at();

create table sales.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references sales.organizations(id) on delete cascade,
  contact_id uuid not null references sales.contacts(id) on delete cascade,
  title text not null,
  interest text,
  source_id uuid references sales.lead_sources(id),
  stage_id uuid not null references sales.pipeline_stages(id),
  status sales.lead_status not null default 'open',
  temperature sales.lead_temp,
  value_cents bigint not null default 0,
  currency text not null default 'BRL',
  last_contact_at timestamptz,
  next_action_at timestamptz,
  responded_at timestamptz,
  closed_at timestamptz,
  lost_reason text,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_org_status_next_action_idx on sales.leads (org_id, status, next_action_at);
create index leads_org_stage_idx on sales.leads (org_id, stage_id);
create index leads_org_contact_idx on sales.leads (org_id, contact_id);

alter table sales.leads enable row level security;

create policy tenant_isolation on sales.leads
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));

create trigger leads_set_updated_at
  before update on sales.leads
  for each row execute function sales.fn_set_updated_at();
