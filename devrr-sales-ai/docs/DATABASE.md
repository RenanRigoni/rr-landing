# Banco de Dados — DevRR Sales AI

Projeto Supabase: `fvgbbixxcapltudonxqx` (reusado, compartilhado com o CRM-RR).
Schema Postgres dedicado: **`sales`** — isolado de `public` e de `crm`.

Este documento é o **contrato entre fases**. Toda migration nova atualiza a seção
correspondente aqui, no mesmo commit. Fonte de verdade definitiva é sempre
`supabase/migrations/*.sql`; este arquivo é a versão legível.

## Regras que valem para toda tabela

- PK: `id uuid primary key default gen_random_uuid()`.
- **`org_id uuid not null references sales.organizations(id) on delete cascade`** em
  toda tabela transacional. Sem exceção.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()` + trigger `sales.fn_set_updated_at()`.
- `created_by uuid references auth.users(id)` onde faz sentido rastrear autoria.
- RLS habilitado, policy `tenant_isolation` (ver abaixo).
- `is_demo boolean not null default false` nas tabelas que recebem seed de demonstração
  — nunca nas de configuração.

## Fundação de multi-tenancy

```sql
create schema if not exists sales;

create or replace function sales.fn_set_updated_at()
returns trigger
language plpgsql
set search_path = sales, public
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- Resolve as organizações do usuário logado.
-- security definer é OBRIGATÓRIO: sem ele a policy de org_members consultaria
-- org_members, disparando a própria policy → recursão infinita.
--
-- `org_members` só é criada na migration 0002 — esta função é criada primeiro
-- de propósito, para já existir quando as policies de tenant_isolation forem
-- escritas. Função `language sql` é validada contra o catálogo na CREATE
-- (pode ser inlined pelo planner), então referenciar uma tabela que ainda não
-- existe falha sem o toggle abaixo. `set local` restringe o efeito a esta
-- transação — mecanismo documentado do Postgres para essa exata situação.
set local check_function_bodies = off;

create or replace function sales.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = sales, public
as $fn$
  select org_id from sales.org_members where user_id = auth.uid()
$fn$;

set local check_function_bodies = on;

revoke all on function sales.current_org_ids() from public;
grant execute on function sales.current_org_ids() to authenticated;
```

Toda função nova neste schema fixa `search_path` — inclusive as que não são
`security definer`, como `fn_set_updated_at()`. `get_advisors(type:'security')`
acusa `function_search_path_mutable` como alerta novo em qualquer função sem
isso, achado real na aplicação desta migration.

Policy padrão, replicada em toda tabela transacional:

```sql
alter table sales.<tabela> enable row level security;

create policy tenant_isolation on sales.<tabela>
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));
```

**Quando o padrão acima NÃO serve:** ele dá a todo membro da org o mesmo poder de
leitura e escrita — correto para dado operacional (contatos, leads, atividades: quem
está na empresa trabalha o funil da empresa), errado para dado de **governança** do
próprio tenant (`organizations`, `org_members`, e futuramente cobrança/assinatura).
Nesses casos a policy é assimétrica por operação: `select` por associação, escrita
por papel via `sales.current_org_role()`. Ver D-013 e D-017. Regra prática: se a
operação altera *quem manda* ou *se o tenant existe*, ela é de owner/admin, nunca
`for all`.

### Grants — o detalhe que quebra a migration 0002 se for esquecido

```sql
grant usage on schema sales to authenticated, service_role;

-- Cobre as tabelas que já existem no momento em que a migration roda.
grant select, insert, update, delete on all tables in schema sales
  to authenticated, service_role;

-- Cobre TODA tabela criada daqui em diante (0002, 0003, ...).
-- Sem isto, a primeira tabela da migration 0002 nasce sem privilégio e o
-- PostgREST devolve "permission denied for table organizations" — antes mesmo
-- da RLS ser consultada. Verificado: o schema `crm` deste mesmo projeto
-- Supabase tem default privileges configurados; é o que faz ele funcionar.
alter default privileges in schema sales
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema sales
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema sales
  grant execute on functions to authenticated, service_role;
```

E adicionar `sales` em **Settings → API → Exposed schemas**.

**Não conceder nada a `anon`.** O `crm` concede (herança de configuração), mas aqui
todas as policies são `for all to authenticated`: dar privilégio de tabela a `anon`
não habilita nada e só aumenta a superfície se alguma policy futura for escrita sem
o `to authenticated`.

## Enums

```sql
create type sales.org_role        as enum ('owner', 'admin', 'member');
create type sales.lead_status     as enum ('open', 'won', 'lost');
create type sales.lead_temp       as enum ('cold', 'warm', 'hot');
create type sales.activity_type   as enum (
  'note', 'call', 'whatsapp', 'email', 'meeting', 'task', 'followup', 'proposal_sent'
);
create type sales.activity_status as enum ('pending', 'done', 'cancelled');
create type sales.ai_run_status   as enum ('pending_review', 'reviewed', 'discarded', 'error');
```

`lead_status` é o ciclo de vida macro (aberto/ganho/perdido). O **estágio** granular
vive em `pipeline_stages`, configurável por organização — não é enum, porque cada PME
tem um funil diferente.

---

## Tabelas — Fase 2 (multiempresa)

### `sales.organizations`

O tenant: a PME que usa o sistema.

```
id            uuid pk
name          text not null
slug          text not null unique
timezone      text not null default 'America/Sao_Paulo'
business_hours jsonb not null default '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}'
created_at, updated_at
```

Sem `org_id`: a própria PK é o discriminador. Insert direto pelo cliente nunca passa
(a org não existe em `current_org_ids()` antes de a membership existir) — a criação é
sempre via RPC `sales.create_organization(p_name)`, `security definer`, que grava
organização e membership na mesma transação e gera o `slug` a partir do nome
(kebab-case ASCII, sufixo numérico em colisão).

**RLS assimétrica por operação, igual a `org_members`** (ver D-017): leitura é por
associação, escrita é só de `owner`/`admin`. Uma policy `for all` única aqui daria a
qualquer `member` o poder de renomear **e apagar** a organização — e `on delete
cascade` de toda tabela transacional faz esse `delete` levar junto contatos, leads,
atividades e histórico do tenant inteiro.

```sql
create policy tenant_isolation_select on sales.organizations
  for select to authenticated
  using (id in (select sales.current_org_ids()));

create policy owner_admin_update on sales.organizations
  for update to authenticated
  using (sales.current_org_role(id) in ('owner', 'admin'))
  with check (sales.current_org_role(id) in ('owner', 'admin'));

create policy owner_delete on sales.organizations
  for delete to authenticated
  using (sales.current_org_role(id) = 'owner');
```

Não existe policy de `insert` para `organizations`: a única criação legítima é pela
RPC `create_organization`, que é `security definer` e não passa por RLS. Sem policy
de insert, todo `insert` direto via PostgREST é negado — que é exatamente o
comportamento desejado.

`delete` é mais restrito que `update` de propósito: renomear a empresa é operação de
administração; apagar o tenant é irreversível e cascateia — só o `owner`.

`timezone` e `business_hours` não são decoração: follow-up agendado para sábado às 3h
da manhã é bug de produto. O cálculo de próxima data respeita os dois.

Trigger `organizations_set_updated_at` chama `sales.fn_set_updated_at()`.

### `sales.org_members`

```
id            uuid pk
org_id        uuid not null -> organizations
user_id       uuid not null -> auth.users
role          sales.org_role not null default 'member'
created_at
unique (org_id, user_id)
```

Índice em `user_id` (`org_members_user_id_idx`): `current_org_ids()` consulta esta
tabela por `user_id` em toda policy do schema — é o hot path de todo o RLS
multi-tenant, sem índice cada checagem faria sequential scan.

Não segue o padrão `tenant_isolation` de uma policy só "for all": leitura é por
associação (qualquer membro vê os outros membros da própria org), escrita é
restrita a `role in ('owner','admin')` — duas regras por operação exigem policies
separadas.

```sql
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
```

`sales.current_org_role(p_org_id)` é helper `security definer` irmão de
`current_org_ids()` — mesmo motivo: uma policy de escrita em `org_members` que
consultasse `org_members` diretamente disparia a própria policy (recursão). Resolve
o papel do usuário logado numa org específica, `security definer` bypassa RLS
nessa leitura interna.

```sql
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
```

Testado ponta a ponta com dois usuários reais simulados via JWT (dentro de
transação com `rollback`, nenhum dado deixado): usuário sem membership não vê
organização nem membership de outra org, `current_org_role` retorna `null` para
org da qual não é membro, e insert direto de membership numa org alheia é
bloqueado pela policy `owner_admin_insert` (não pela FK).

---

## Tabelas — Fase 3 (leads)

### `sales.lead_sources`

Catálogo configurável de origem. Não é enum: cada PME tem canais diferentes.

```
id          uuid pk
org_id      uuid not null
name        text not null
is_active   boolean not null default true
position    smallint not null default 0
created_at
unique (org_id, name)
```

Seed por organização nova: `Site`, `WhatsApp`, `Google`, `Instagram`, `Indicação`,
`Outro`.

### `sales.pipeline_stages`

```
id            uuid pk
org_id        uuid not null
key           text not null          -- estável p/ código: 'novo', 'proposta_enviada'...
label         text not null          -- editável pelo usuário
position      smallint not null
probability   smallint not null default 0   -- 0-100
is_won        boolean not null default false
is_lost       boolean not null default false
color         text
created_at, updated_at
unique (org_id, key)
unique (org_id, position) deferrable initially deferred
```

Seed por organização nova (do roadmap, seção 2):

| position | key | label | prob | won | lost |
|---|---|---|---|---|---|
| 0 | `novo` | Novo | 5 | | |
| 1 | `contatado` | Contatado | 15 | | |
| 2 | `qualificado` | Qualificado | 30 | | |
| 3 | `proposta_enviada` | Proposta enviada | 50 | | |
| 4 | `negociacao` | Negociação | 75 | | |
| 5 | `ganho` | Ganho | 100 | ✓ | |
| 6 | `perdido` | Perdido | 0 | | ✓ |

`aguardando_resposta` e `followup` do roadmap **não viram estágio** — são estado
derivado (existe follow-up pendente para esse lead), não posição no funil. Ver
`DECISIONS.md` D-004.

`key` é imutável depois de criado. `label` o usuário edita à vontade. Código nunca
lê `label`.

### `sales.seed_org_defaults(p_org_id uuid)`

Semeia as 6 fontes e os 7 estágios padrão de uma organização nova. `security definer`
porque roda dentro de `create_organization`, antes de a membership existir (a policy
`tenant_isolation` de `lead_sources`/`pipeline_stages` bloquearia o próprio insert de
seed sem isso).

**Não é chamável direto pelo cliente** — `revoke all ... from public` e
`revoke execute ... from authenticated` logo após a definição, único caminho é via
`create_organization` (que roda como dona da função via `security definer` e por isso
preserva a chamada mesmo sem grant explícito para `authenticated`). Sem essa
revogação, qualquer usuário autenticado poderia chamar
`seed_org_defaults(org_id_alheio)` diretamente via PostgREST e a função, ignorando RLS
por ser `security definer`, semearia catálogo em organização de outro tenant — mesma
classe de risco do Achado A do checkpoint da Fase 2 (ver D-017), fechada aqui antes de
existir.

```sql
create or replace function sales.seed_org_defaults(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = sales, public
as $fn$ ... $fn$;

revoke all on function sales.seed_org_defaults(uuid) from public;
revoke execute on function sales.seed_org_defaults(uuid) from authenticated;
```

`create_organization` (0002) chama `perform sales.seed_org_defaults(v_org_id)` ao
final, na mesma transação da criação da org e da membership do owner — alterada via
`create or replace function` na migration 0004; `CREATE OR REPLACE FUNCTION` preserva
grants existentes, então os grants de `create_organization` (revogado de `public`,
concedido a `authenticated`) não precisaram ser repetidos.

### `sales.contacts`

A pessoa que entrou em contato com a PME.

```
id            uuid pk
org_id        uuid not null
full_name     text not null
phone         text                   -- E.164 normalizado quando possível
email         text
company_name  text                   -- texto livre; não é FK, a PME raramente cadastra
city          text
notes         text
is_demo       boolean not null default false
created_by    uuid -> auth.users
created_at, updated_at
```

Índice: `create index on sales.contacts (org_id, phone) where phone is not null;`
— usado pela deduplicação no cadastro e, na Fase 10, pelo match do webhook do WhatsApp.

`company_name` é texto livre de propósito: forçar cadastro de empresa antes de salvar
um contato é atrito que faz o dono da PME desistir de usar o sistema.

### `sales.leads`

O interesse. Um contato pode ter vários leads ao longo do tempo (recompra, novo
projeto). É a entidade central do produto.

```
id                uuid pk
org_id            uuid not null
contact_id        uuid not null -> contacts on delete cascade
title             text not null              -- "Landing page para loja de móveis"
interest          text                       -- serviço/produto de interesse, texto livre no MVP
source_id         uuid -> lead_sources
stage_id          uuid not null -> pipeline_stages
status            sales.lead_status not null default 'open'
temperature       sales.lead_temp
value_cents       bigint not null default 0
currency          text not null default 'BRL'
last_contact_at   timestamptz                -- cache: max(activities.done_at)
next_action_at    timestamptz                -- cache: min(activities.due_at pending)
responded_at      timestamptz                -- quando o cliente respondeu (cancela followups)
closed_at         timestamptz
lost_reason       text
notes             text
is_demo           boolean not null default false
created_by        uuid -> auth.users
created_at, updated_at
```

Índices:

```sql
create index on sales.leads (org_id, status, next_action_at);
create index on sales.leads (org_id, stage_id);
create index on sales.leads (org_id, contact_id);
```

**Sobre os caches denormalizados** (`last_contact_at`, `next_action_at`): são
mantidos pela camada de `lib/actions/`, não por trigger. Motivo: a regra de qual
atividade conta como "próxima ação" é lógica de produto que precisa de teste unitário
(`lib/domain/next-action.ts`), e trigger em SQL não é testável com vitest. Custo:
disciplina — toda escrita em `activities` recalcula os caches do lead. Um job de
reconciliação valida a consistência (tarefa 6.4).

---

## Tabelas — Fase 4 (follow-up)

### `sales.activities`

**Modelo unificado**: histórico, tarefa e follow-up agendado são a mesma tabela.

- `due_at is null` → aconteceu, é histórico puro.
- `due_at not null` + `status='pending'` → está agendado, aparece em Ações de hoje.
- `is_auto = true` → foi gerado por regra, e portanto é **cancelável em massa** quando
  o cliente responde.

```
id            uuid pk
org_id        uuid not null
lead_id       uuid not null -> leads on delete cascade
contact_id    uuid -> contacts            -- denormalizado p/ query direta
type          sales.activity_type not null
title         text not null
body          text                        -- conteúdo da mensagem (gerada por IA ou escrita)
status        sales.activity_status not null default 'done'
due_at        timestamptz
done_at       timestamptz
is_auto       boolean not null default false
rule_id       uuid -> followup_rules      -- qual regra gerou (null se manual)
step_number   smallint                    -- passo da sequência (1, 2, 3...)
ai_run_id     uuid -> ai_runs             -- se o body veio de IA
is_demo       boolean not null default false
created_by    uuid -> auth.users
created_at, updated_at
```

Índices:

```sql
create index on sales.activities (org_id, status, due_at) where status = 'pending';
create index on sales.activities (org_id, lead_id, created_at desc);
```

Por que tabela única e não `activities` + `followups` separadas: a tela "Ações de
hoje" precisa mostrar tarefa manual e follow-up automático na mesma lista ordenada
por horário. Com duas tabelas isso vira `union all` em toda query, e o histórico do
lead precisaria intercalar duas fontes. O CRM-RR usa o mesmo modelo unificado e ele
se sustentou por 9 fases.

### `sales.followup_rules`

Uma linha por **passo** da sequência. Configurável por organização (requisito do
roadmap, seção 2).

```
id                uuid pk
org_id            uuid not null
trigger_stage_id  uuid not null -> pipeline_stages   -- dispara ao ENTRAR neste estágio
step_number       smallint not null                  -- 1, 2, 3
delay_days        smallint not null                  -- dias após a entrada no estágio
channel           sales.activity_type not null default 'whatsapp'
prompt_slug       text                               -- prompt de IA p/ gerar a mensagem
is_active         boolean not null default true
created_at, updated_at
unique (org_id, trigger_stage_id, step_number)
```

Seed por organização nova — a sequência do roadmap para `proposta_enviada`:

| step | delay_days | channel | prompt_slug |
|---|---|---|---|
| 1 | 1 | whatsapp | `followup_proposta` |
| 2 | 3 | whatsapp | `followup_proposta` |
| 3 | 7 | whatsapp | `followup_proposta` |

**Semântica de cancelamento** — a regra mais importante do produto:

```sql
update sales.activities
   set status = 'cancelled', updated_at = now()
 where lead_id = :lead_id
   and status = 'pending'
   and is_auto = true;
```

Disparada quando: o lead recebe `responded_at`, muda para estágio `is_won`/`is_lost`,
ou o usuário marca "cliente respondeu". Follow-up **manual** (`is_auto = false`)
nunca é cancelado automaticamente — se o usuário agendou à mão, ele decide.

---

## Tabelas — Fase 5 (IA)

### `sales.ai_prompts`

Prompt versionado, por organização. **Nunca hardcoded no código.**

```
id                    uuid pk
org_id                uuid not null
slug                  text not null            -- 'followup_proposta'
version               smallint not null default 1
system_prompt         text not null
user_prompt_template  text not null            -- placeholders {{lead_title}}, {{dias_sem_resposta}}...
model                 text not null default 'anthropic/claude-sonnet-5'
temperature           numeric(3,2) not null default 0.7
is_active             boolean not null default true
created_at, updated_at
unique (org_id, slug, version)
```

Índice parcial garantindo um ativo por slug:
`create unique index on sales.ai_prompts (org_id, slug) where is_active;`

Cada organização nova recebe cópia dos prompts padrão no seed. Motivo: a PME de
oficina e a de consultoria querem tom de voz diferente, e isso é ajuste de prompt,
não de código.

### `sales.ai_runs`

Histórico completo de execução de IA. **Inclusive as que falharam.**

```
id             uuid pk
org_id         uuid not null
prompt_id      uuid -> ai_prompts
lead_id        uuid -> leads
contact_id     uuid -> contacts
input_payload  jsonb
raw_response   text
parsed_output  jsonb
status         sales.ai_run_status not null default 'pending_review'
model          text
input_tokens   integer
output_tokens  integer
latency_ms     integer
error_message  text
reviewed_by    uuid -> auth.users
reviewed_at    timestamptz
created_at
```

Sem histórico de execução não existe como saber se a IA está melhorando ou piorando
— e não existe como cobrar por ela com honestidade.

### `sales.audit_logs`

```
id           uuid pk
org_id       uuid not null
user_id      uuid -> auth.users
entity       text not null          -- 'lead', 'activity', 'contact'
entity_id    uuid
action       text not null          -- 'create', 'update', 'stage_change', 'cancel_followups'
diff         jsonb
created_at
```

Índice: `create index on sales.audit_logs (org_id, entity, entity_id, created_at desc);`

---

## Views

Toda view leva `alter view ... set (security_invoker = true)` na mesma migration.

### `sales.v_today_actions`

Alimenta a tela principal. Atividades pendentes vencidas ou de hoje.

```sql
create view sales.v_today_actions as
select a.id, a.org_id, a.lead_id, a.type, a.title, a.body, a.due_at,
       a.is_auto, a.step_number,
       l.title as lead_title, l.value_cents, l.stage_id,
       c.full_name as contact_name, c.phone as contact_phone,
       s.label as stage_label
  from sales.activities a
  join sales.leads l on l.id = a.lead_id
  join sales.contacts c on c.id = l.contact_id
  join sales.pipeline_stages s on s.id = l.stage_id
 where a.status = 'pending'
   and a.due_at is not null
   and l.status = 'open';

alter view sales.v_today_actions set (security_invoker = true);
```

O filtro de data (`due_at <= fim do dia de hoje no fuso da org`) fica na query, não
na view — porque depende do `timezone` da organização.

### `sales.v_leads_without_action`

Os leads esquecidos. É esta view que justifica o produto existir.

```sql
create view sales.v_leads_without_action as
select l.id, l.org_id, l.title, l.value_cents, l.stage_id, l.last_contact_at,
       c.full_name as contact_name, c.phone as contact_phone,
       s.label as stage_label, s.position as stage_position
  from sales.leads l
  join sales.contacts c on c.id = l.contact_id
  join sales.pipeline_stages s on s.id = l.stage_id
 where l.status = 'open'
   and l.next_action_at is null;

alter view sales.v_leads_without_action set (security_invoker = true);
```

---

## Ordem das migrations

| Arquivo | Conteúdo | Fase |
|---|---|---|
| `0001_schema_and_helpers.sql` | schema `sales`, grants, `fn_set_updated_at`, `current_org_ids`, enums | 2.1 |
| `0002_organizations.sql` | `organizations`, `org_members`, RPC `create_organization`, RLS | 2.2 |
| `0003_organizations_role_policies.sql` | policies de `organizations` por papel (D-017) | 2.5 |
| `0004_catalogs.sql` | `lead_sources`, `pipeline_stages` + seeds por org | 3.1 |
| `0005_contacts_leads.sql` | `contacts`, `leads`, índices, RLS | 3.2 |
| `0006_activities.sql` | `activities`, índices, RLS | 4.1 |
| `0007_followup_rules.sql` | `followup_rules` + seed | 4.1 |
| `0008_ai.sql` | `ai_prompts`, `ai_runs` + seed de prompts | 5.1 |
| `0009_views.sql` | `v_today_actions`, `v_leads_without_action` + `security_invoker` | 4.3 |
| `0010_audit.sql` | `audit_logs` | 5.4 |

A numeração segue a **ordem de aplicação**, não a ordem das fases: as views (4.3)
entram antes da auditoria (5.4), então são `0008`, não `0009`. Replay do zero precisa
funcionar lendo os arquivos em ordem alfabética.

Cada migration: arquivo commitado → aplicado → `get_advisors(type:'security')` sem
alerta novo → esta doc atualizada → `npm run typecheck` com types regerados.

## Checklist obrigatório por migration

- [ ] Arquivo em `supabase/migrations/NNNN_nome.sql`, commitado antes de aplicar
- [ ] Toda tabela nova tem `org_id not null` + FK + índice
- [ ] RLS habilitado + policy `tenant_isolation`
- [ ] Trigger de `updated_at` onde a coluna existe
- [ ] Toda view com `security_invoker = true`
- [ ] `get_advisors(type:'security')` sem alerta novo
- [ ] Types TypeScript regerados (`lib/types/database.types.ts`)
- [ ] Esta doc atualizada no mesmo commit
