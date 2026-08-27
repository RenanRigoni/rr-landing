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

Os 8 enums do dossiê digital (Fase 7) estão documentados junto da tabela que os usa,
em **Tabelas — Fase 7 (dossiê digital)**.

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

Semeia os defaults de uma organização nova: 6 fontes e 7 estágios (0004), a sequência
de 3 passos de follow-up em `proposta_enviada` (0007) e o prompt de IA
`followup_proposta` v1 (0010 — tarefa 5.2). `security definer` porque roda dentro de
`create_organization`, antes de a membership existir (a policy `tenant_isolation` de
`lead_sources`/`pipeline_stages`/`followup_rules`/`ai_prompts` bloquearia o próprio
insert de seed sem isso). Cada migration que estende a função faz `create or replace`
reproduzindo o corpo anterior na íntegra e só acrescentando o novo bloco.

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
reconciliação valida a consistência (**tarefa 6.3**, `app/api/cron/reconcile`).

O job é a rede de segurança dessa disciplina: roda diário, recalcula os dois campos
de todo lead `open` de **todas** as organizações a partir das `activities` do próprio
lead, e **corrige** o que estiver divergente (não só loga). Corrige porque o cache
não é só otimização: `sales.v_leads_without_action` filtra por
`l.next_action_at is null`, então um `next_action_at` obsoleto e não-nulo **esconde
da tela um lead esquecido** — falha silenciosa, exatamente o que o produto existe
para evitar. Usa `resolveNextAction()`/`resolveLastContact()` de
`lib/domain/followup.ts`, as mesmas funções de `lib/actions/`: uma definição só de
"qual é a próxima ação", nunca uma segunda em SQL (é o mesmo motivo de não ser
trigger). Precisa de acesso cross-tenant sem sessão — ver **D-034** para a decisão
de privilégio e as guardas da rota.

**`contact_id`/`source_id`/`stage_id` não garantem organização por FK.** A FK só
prova que a linha referenciada existe em algum lugar, não que existe na mesma
organização do lead — nada aqui impede, a nível de banco, um `insert`/`update`
apontando `stage_id` de outro tenant (RLS de `leads` filtra só `leads.org_id`; a
policy de `pipeline_stages` roda numa query separada, sem saber que está sendo
referenciada de fora). A checagem é responsabilidade da camada de `lib/actions/`
(`belongsToOrg()` em `lib/actions/leads-core.ts`, tarefa 3.4). Ver **D-020**.

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

`rule_id` nasce sem FK em `0006_activities.sql` — `followup_rules` só existe na
migration seguinte, mesma tarefa 4.1. A constraint (`activities_rule_id_fkey`)
entra via `alter table` em `0007_followup_rules.sql`, depois que a tabela
referenciada existe. Mesma classe de referência antecipada que
`current_org_ids()`/`org_members` já resolveu em 0001, agora para FK de tabela
em vez de corpo de função. `ai_run_id` está no mesmo caso, mas a referência a
`ai_runs` só fecha na migration 0008 (Fase 5.1).

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

**`leads.responded_at` é estado da cadência corrente, não arquivo histórico**
(D-027, corrigido no checkpoint da Fase 4, implementado na tarefa 4.6): quando o
lead reentra num estágio que tem regras ativas e uma cadência nova é gerada,
`responded_at` volta a `null` — proposta nova é pergunta nova, o cliente não
respondeu *a esta*. Sem isso, um lead que já respondeu uma vez recebe follow-ups
automáticos novos e "Cliente respondeu" vira no-op silencioso (provado por
execução no checkpoint). O histórico de "o cliente respondeu" continua existindo
onde deve: na activity `'Cliente respondeu'` gravada por `markRespondedCore`, que
nunca é apagada (D-005). Mover para um estágio **sem** regras (`negociação`,
`qualificado`) não mexe em `responded_at` — nenhuma cadência começou ali.
`markRespondedCore` também cancela os automáticos pendentes **sempre**, mesmo
quando `responded_at` já estava preenchido; só a gravação do timestamp e a
activity de histórico é que são idempotentes.

**`leads.status`/`closed_at` seguem o estágio de destino** (tarefa 4.3,
`lib/actions/leads-core.ts` → `moveStageCore`): `status = 'won'` se
`stage.is_won`, `'lost'` se `stage.is_lost`, senão `'open'`; `closed_at` some
junto se o lead volta a um estágio aberto. Sem isso `v_today_actions`/
`v_leads_without_action` (ambas filtram `status = 'open'`) continuariam
mostrando um lead que já ganhou ou perdeu — `moveStage` é o único caminho de
mudança de estágio, então é o único lugar que precisa fazer essa gravação.

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
entity       text not null          -- 'lead', 'activity', 'contact', 'ai_run'
entity_id    uuid
action       text not null          -- 'create', 'update', 'stage_change', 'cancel_followups', 'ai_used'
diff         jsonb
created_at
```

Índice: `create index on sales.audit_logs (org_id, entity, entity_id, created_at desc);`

Criada na migration `0011_audit.sql` (tarefa 5.4). RLS `tenant_isolation` `for all`
(dado operacional — D-017 não se aplica). Sem `updated_at` / trigger: append-only,
só `created_at default now()`. Na 5.4 só o verbo `ai_used` tem call site
(`lib/actions/audit.ts` → `logAudit`, chamado por `useFollowupMessageCore`); os
outros verbos são o vocabulário previsto para quando `create`/`update`/
`stage_change`/`cancel_followups` das Fases 3–4 forem instrumentados (Q-006).

---

## Tabelas — Fase 7 (dossiê digital)

### Enums do dossiê

Oito vocabulários **compartilhados** entre dezenas de colunas, em vez de um enum por
campo (**D-036**). A UI escolhe o subconjunto de opções que faz sentido em cada campo
— o banco só garante que nada fora do vocabulário entra.

```sql
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
```

`sales.tri_state` cobre os três formatos de pergunta do dossiê: Sim/Não,
Sim/Parcialmente/Não e Sim/Não/Não identificado — mais o `nao_se_aplica` de
`website_whatsapp_clickable`. **Coluna nula e coluna `nao_analisado`/
`nao_identificado`/`nao_se_aplica` significam a mesma coisa para o score: não
avaliado** (D-037). `nao` significa avaliado e ausente, e vale zero.

### `sales.lead_digital_audits`

O dossiê da presença digital pública de uma empresa, tirado **antes** da prospecção.
Tabela própria, 1:N com `leads` (**D-035**): um mesmo lead pode ter várias auditorias
em datas diferentes, e comparar "melhorou desde agosto?" é o objetivo declarado
(`DOSSIE.md` §17). A **auditoria atual** é a de maior `researched_at` (empate resolvido
por `created_at`) — não existe flag `is_current`, que seria uma segunda fonte de
verdade capaz de divergir.

**Todo campo é nullable** exceto os de identidade. Nulo significa "não foi possível
encontrar/avaliar", nunca zero. É a regra que o produto inteiro depende para não
confundir ausência de pesquisa com ausência de presença digital.

```
id                        uuid pk
org_id                    uuid not null -> organizations on delete cascade
lead_id                   uuid not null -> leads on delete cascade
researched_at             date not null default current_date   -- "Data da pesquisa" (DOSSIE §2)
created_by                uuid -> auth.users
created_at, updated_at    timestamptz not null default now()

-- Origem da prospecção (DOSSIE §2)
search_query              text                       -- "clareamento dental"
search_location           text                       -- "Uberlândia - MG"
found_on_google           sales.tri_state
google_result_type        sales.google_result_type
google_ads_active         sales.tri_state
google_ads_position       smallint  check (google_ads_position >= 1)
google_organic_position   smallint  check (google_organic_position >= 1)
google_search_result_url  text

-- Google Business Profile / Maps (DOSSIE §3)
google_business_profile   sales.tri_state
google_business_name      text
google_business_category  text
google_rating             numeric(2,1) check (google_rating between 0 and 5)
google_reviews_count      integer      check (google_reviews_count >= 0)
google_recent_reviews     sales.tri_state
google_replies_reviews    sales.frequency_level
google_has_photos         sales.tri_state
google_has_hours          sales.tri_state
google_has_phone          sales.tri_state
google_has_website        sales.tri_state
google_easy_whatsapp      sales.tri_state
google_has_booking        sales.tri_state
google_profile_completeness sales.quality_level
google_notes              text

-- Website (DOSSIE §4)
website_exists                    sales.tri_state
website_url                       text
website_https                     sales.tri_state
website_mobile_friendly           sales.tri_state
website_visual_quality            sales.quality_level
website_perceived_speed           sales.speed_level
website_services_clear            sales.tri_state
website_has_target_service_page   sales.tri_state
website_target_service_url        text
website_has_clear_cta             sales.tri_state
website_has_whatsapp              sales.tri_state
website_whatsapp_clickable        sales.tri_state
website_whatsapp_floating         sales.tri_state
website_has_contact_form          sales.tri_state
website_has_online_booking        sales.tri_state
website_phone_visible             sales.tri_state
website_address_visible           sales.tri_state
website_has_social_proof          sales.tri_state
website_has_clear_differentiators sales.tri_state
website_has_team                  sales.tri_state
website_content_updated           sales.tri_state
website_notes                     text

-- Conversão digital (DOSSIE §5)
conversion_clear_contact_path   sales.tri_state
conversion_clicks_to_whatsapp   smallint check (conversion_clicks_to_whatsapp >= 0)
conversion_cta_above_fold       sales.tri_state
conversion_repeated_cta         sales.tri_state
conversion_alternative_capture  sales.tri_state
conversion_has_friction         sales.tri_state
conversion_friction_notes       text

-- Instagram (DOSSIE §6)
instagram_exists           sales.tri_state
instagram_username         text
instagram_url              text
instagram_has_bio_link     sales.tri_state
instagram_clear_bio        sales.tri_state
instagram_has_cta          sales.tri_state
instagram_easy_whatsapp    sales.tri_state
instagram_easy_website     sales.tri_state
instagram_active           sales.activity_level
instagram_last_post_date   date
instagram_visual_quality   sales.quality_level
instagram_services_content sales.tri_state
instagram_content_cta      sales.frequency_level
instagram_notes            text

-- PageSpeed mobile (DOSSIE §7)
pagespeed_mobile_performance     smallint check (between 0 and 100)
pagespeed_mobile_accessibility   smallint check (between 0 and 100)
pagespeed_mobile_best_practices  smallint check (between 0 and 100)
pagespeed_mobile_seo             smallint check (between 0 and 100)
pagespeed_mobile_core_web_vitals sales.cwv_status
pagespeed_mobile_lcp             integer      check (>= 0)   -- ms
pagespeed_mobile_inp             integer      check (>= 0)   -- ms, só existe com dado de campo
pagespeed_mobile_cls             numeric(6,3) check (>= 0)
pagespeed_mobile_fcp             integer      check (>= 0)   -- ms
pagespeed_mobile_tbt             integer      check (>= 0)   -- ms
pagespeed_mobile_speed_index     integer      check (>= 0)   -- ms

-- PageSpeed desktop — mesmas 11 colunas com prefixo pagespeed_desktop_

-- PageSpeed, informações gerais
pagespeed_analyzed_url          text
pagespeed_analyzed_at           timestamptz
pagespeed_mobile_report_url     text
pagespeed_desktop_report_url    text
pagespeed_field_data_available  sales.tri_state
pagespeed_notes                 text

-- Diagnóstico digital (DOSSIE §9)
digital_problems           text
digital_strengths          text
digital_opportunities      text[] not null default '{}'
digital_sales_priority     sales.sales_priority
digital_opportunity_score  smallint check (between 0 and 10)
digital_opportunity_reason text

-- Score derivado (DOSSIE §10) — nunca vem do formulário (D-038)
digital_score              smallint check (between 0 and 100)
digital_score_completeness smallint check (between 0 and 100)
```

`digital_opportunities` é `text[]` com CHECK de subconjunto do vocabulário do
`DOSSIE.md` §9 (`google_business`, `google_reputation`, `website`, `landing_page`,
`seo_local`, `performance`, `ux_mobile`, `conversao`, `whatsapp`, `automacao`,
`agendamento`, `captacao_leads`, `instagram`, `crm`, `analytics`, `outro`):

```sql
check (digital_opportunities <@ array['google_business','google_reputation','website',
  'landing_page','seo_local','performance','ux_mobile','conversao','whatsapp',
  'automacao','agendamento','captacao_leads','instagram','crm','analytics','outro']::text[])
```

Array em vez de tabela de junção: é uma lista curta e fechada, sempre lida junto com a
auditoria, nunca consultada de trás para frente ("quais leads têm oportunidade X" sai
de um `@>` com índice GIN se um dia fizer falta). Tabela de junção aqui seria
arquitetura complexa desnecessária (`DOSSIE.md` §16).

Índices:

```sql
create index on sales.lead_digital_audits (org_id, lead_id, researched_at desc);
create index on sales.lead_digital_audits (org_id, digital_score desc nulls last);
```

O primeiro serve à consulta dominante ("auditoria atual deste lead") e já cobre a FK
`lead_id` (não entra em `unindexed_foreign_keys`, Q-008). O segundo serve à comparação
entre dezenas de empresas, que é o objetivo de médio prazo do `DOSSIE.md` §15.

RLS `tenant_isolation` no padrão do schema + trigger `fn_set_updated_at`. `lead_id`
**não** garante organização por FK — mesma armadilha de `leads.contact_id`
(**D-020**): a checagem é da camada de `lib/actions/`, com `checkBelongsToOrg`.

**Milissegundos, sempre.** Toda métrica de tempo é armazenada em ms inteiro e
formatada em segundos na exibição (`formatMsAsSeconds` em `lib/domain/pagespeed.ts`).
O `DOSSIE.md` §7 pede "um padrão consistente em toda a aplicação"; ms é o que a API do
PageSpeed devolve, então converter na entrada seria perder precisão à toa.

**Nenhuma coluna nova em `sales.leads`.** O lead continua sendo o comercial; o dossiê é
uma linha à parte que pode nem existir. Todo lead cadastrado antes desta fase continua
válido sem auditoria nenhuma — a compatibilidade é por construção, não por default de
coluna (`DOSSIE.md` §21).

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
| `0008_views.sql` | `v_today_actions`, `v_leads_without_action` + `security_invoker` | 4.3 |
| `0009_ai.sql` | `ai_prompts`, `ai_runs` (tabelas vazias) + FK de `activities.ai_run_id` | 5.1 |
| `0010_seed_followup_proposta_prompt.sql` | estende `seed_org_defaults` com o prompt `followup_proposta` v1 | 5.2 |
| `0011_audit.sql` | `audit_logs` | 5.4 |
| `0012_lead_digital_audits.sql` | 8 enums do dossiê + `lead_digital_audits`, índices, RLS | 7.1 |

A numeração segue a **ordem de aplicação**, não a ordem das fases. Esta tabela foi
corrigida na tarefa 4.3: o texto desta seção já dizia "as views entram antes da
auditoria, então são `0008`, não `0009`" desde o checkpoint da Fase 1, mas a própria
tabela ainda numerava a IA (5.1) como `0008` e as views (4.3) como `0009` — resquício
de antes de `activities`/`followup_rules` (4.1) ocuparem `0006`/`0007`, o que empurrou
tudo depois em duas posições sem a tabela ser reajustada. O `0010` reservado para a
auditoria virou `0011` na tarefa 5.2: a 5.1 deixou `ai_prompts` vazia e a 5.2 semeia
o prompt padrão numa migration própria (`0009` já aplicada, "nova mudança de banco =
nova migration"), consumindo o slot `0010`. `0011_audit.sql` foi criado e aplicado na
tarefa 5.4. Replay do zero precisa funcionar lendo os arquivos em ordem alfabética.

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
