# Schema de Banco — CRM-RR

Projeto Supabase: `fvgbbixxcapltudonxqx` (reusado, não é um projeto novo).
Schema Postgres dedicado: `crm` — isola completamente o CRM de qualquer outra coisa
que já exista nesse projeto (evita colisão de nomes, permite `DROP SCHEMA crm CASCADE`
para reset total, deixa claro em `list_tables`/dashboard o que pertence ao quê).
Custo do isolamento: expor `crm` em **Settings → API → Exposed schemas** no Supabase
(feito uma vez, na migration inicial via `grant usage`/policies — não precisa clique
manual se configurado via SQL). Alternativa descartada: prefixar tabelas em `public`
(`crm_deals`) — evita esse passo, mas polui o schema público sem necessidade.

Este documento é o contrato entre fases: toda migration nova atualiza a seção
correspondente aqui. Fonte de verdade definitiva é sempre `supabase/migrations/*.sql`;
este arquivo é a versão legível.

## Convenções

- PK: `id uuid primary key default gen_random_uuid()`.
- Toda tabela transacional tem `owner_id uuid references auth.users`, `created_at
  timestamptz default now()`, e a maioria tem `updated_at timestamptz default now()`
  atualizado por trigger `fn_set_updated_at()`.
- Tabelas que podem conter dados de demonstração têm `is_demo boolean not null
  default false` — nunca as tabelas de configuração (pipelines, lost_reasons,
  qualification_criteria, ai_prompts, lead_sources).
- RLS: `FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)`
  em toda tabela `crm.*` (single-user hoje; ver `CRM_ARCHITECTURE.md` para o plano de
  migração multi-user).

## Enums

```sql
create type crm.deal_status as enum ('open', 'won', 'lost');
create type crm.activity_type as enum ('call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'linkedin');
create type crm.activity_status as enum ('pending', 'done', 'cancelled');
create type crm.ai_run_status as enum ('pending_review', 'reviewed', 'error');
create type crm.qualified_by as enum ('human', 'ai');
create type crm.feedback_type as enum ('friction', 'idea', 'win', 'bug');
```

## Tabelas de apoio (catálogos configuráveis)

| Tabela | Colunas principais |
|---|---|
| `crm.pipelines` | id, name, is_default, created_at |
| `crm.pipeline_stages` | id, pipeline_id, name, position, probability smallint, is_won bool, is_lost bool, color |
| `crm.lost_reasons` | id, label, category, is_active |
| `crm.lead_sources` | id, name, is_active |
| `crm.qualification_criteria` | id, key unique, label, description, weight numeric(4,2) default 1.0, max_score smallint default 5, is_active, position |

Seed inicial de `pipeline_stages` (pipeline default, 9 estágios, seção 4 da spec):
Prospect Identified, Contact Attempt, Contact Established, Qualified, Discovery,
Proposal, Negotiation, Won (`is_won=true`), Lost (`is_lost=true`).

Seed inicial de `qualification_criteria` (6 dimensões BANT+): `budget`, `authority`,
`need`, `timing`, `fit_icp`, `engagement`.

## Tabelas transacionais

### `crm.companies`
`id, company_name, website, industry, company_size, city, state, country,
estimated_revenue_range, acquisition_source_id -> lead_sources, icp_fit
text('poor'|'partial'|'strong'), notes, is_demo, owner_id, created_at, updated_at`

### `crm.contacts`
`id, full_name, email, phone, role_title, company_id -> companies, linkedin_url,
notes, is_demo, owner_id, created_at, updated_at`

### `crm.deals`
```
id, title, company_id -> companies, primary_contact_id -> contacts,
pipeline_id -> pipelines not null, stage_id -> pipeline_stages not null,
status crm.deal_status default 'open',
value_cents bigint default 0, currency text default 'BRL',
source_id -> lead_sources,
expected_close_date date, closed_at timestamptz,
lost_reason_id -> lost_reasons, lost_reason_notes text,
qualification_score numeric(5,2),   -- cache denormalizado
next_action_at timestamptz,          -- cache denormalizado p/ My Day
is_demo, owner_id, created_at, updated_at
```

### `crm.deal_stage_history`
```
id, deal_id -> deals on delete cascade,
from_stage_id -> pipeline_stages,   -- null no primeiro registro do deal
to_stage_id -> pipeline_stages not null,
duration_in_previous_stage_seconds bigint,
changed_by uuid references auth.users, changed_at timestamptz default now()
```
Populada por trigger `AFTER UPDATE OF stage_id ON crm.deals` — histórico é garantido
no banco, não depende de o código lembrar de gravar (Regra 5).

### `crm.activities`
```
id, deal_id -> deals on delete cascade, contact_id -> contacts, company_id -> companies,
type crm.activity_type not null, status crm.activity_status default 'pending',
subject text not null, notes text, due_at timestamptz, completed_at timestamptz,
outcome text, is_demo, owner_id, created_at, updated_at
```

### Qualificação estruturada
```
crm.qualifications: id, deal_id unique -> deals, overall_score numeric(5,2),
  summary text, qualified_by crm.qualified_by, created_at, updated_at

crm.qualification_scores: id, qualification_id -> qualifications on delete cascade,
  criterion_id -> qualification_criteria, score smallint check (score between 0 and 5),
  rationale text not null,   -- NUNCA null: score sempre explicável (Regra 7)
  created_at
  unique(qualification_id, criterion_id)

crm.qualification_history: id, deal_id -> deals, snapshot jsonb not null, created_at
  -- snapshot completo (score geral + todas as dimensões) a cada requalificação
```

### IA
```
crm.ai_prompts: id, slug text not null, version int not null, title,
  system_prompt text not null, user_prompt_template text not null,
  model text default 'anthropic/claude-sonnet-5', temperature numeric(3,2) default 0.3,
  is_active boolean default false, notes text, created_at, created_by
  unique(slug, version)
  unique index ux_ai_prompts_active_slug on (slug) where is_active = true

crm.ai_runs: id, prompt_id -> ai_prompts, deal_id -> deals, company_id -> companies,
  contact_id -> contacts, input_payload jsonb not null, raw_response text,
  parsed_output jsonb, status crm.ai_run_status default 'pending_review',
  model text, input_tokens int, output_tokens int, latency_ms int, cost_usd numeric(10,6),
  error_message text, applied boolean default false, created_at,
  reviewed_at timestamptz, reviewed_by uuid references auth.users

crm.ai_feedback: id, ai_run_id -> ai_runs, rating smallint check (rating between 1 and 5),
  is_useful boolean, error_category text, correction_notes text, created_at

crm.prompt_lab_comparisons: id, prompt_a_id -> ai_prompts, prompt_b_id -> ai_prompts,
  test_input jsonb not null, run_a_id -> ai_runs, run_b_id -> ai_runs,
  winner text check (winner in ('a','b','tie')), notes text, created_at
```
Nunca sobrescrever `ai_prompts` — sempre `insert` de nova versão. `applied=true` em
`ai_runs` só é setado por ação humana explícita (Regra 3).

### Processos / conhecimento
```
crm.process_docs: id, slug unique, title, objective, trigger, inputs, steps jsonb,
  decision_points, responsible, systems_involved, expected_output, kpis,
  known_exceptions, as_is_content text, to_be_content text,
  status text default 'draft', last_reviewed_at, created_at, updated_at

crm.process_feedback: id, process_id -> process_docs on delete cascade,
  deal_id -> deals, feedback_type crm.feedback_type not null, content text not null,
  resolved boolean default false, created_at, created_by

crm.playbooks: id, slug unique, title, type text, content text, related_process_id -> process_docs,
  version int default 1, status text default 'draft', updated_at

crm.glossary_terms: id, term unique, definition text not null, created_at
```

### Auditoria / config
```
crm.audit_log: id, entity_type text, entity_id uuid, action text,
  diff jsonb, actor uuid references auth.users, created_at

crm.app_settings: key text primary key, value jsonb not null, updated_at
```

## Triggers principais

- `crm.fn_log_stage_change()` — `AFTER UPDATE OF stage_id ON crm.deals`: insere em
  `deal_stage_history`, calcula `duration_in_previous_stage_seconds`.
- `crm.fn_enforce_lost_reason()` — `BEFORE INSERT OR UPDATE ON crm.deals`: se
  `NEW.status = 'lost'` e `NEW.lost_reason_id IS NULL` → `RAISE EXCEPTION`. Implementa
  a Regra 2 no nível mais forte possível (banco, não contornável pela UI).
- `crm.fn_set_updated_at()` — genérico, aplicado via `BEFORE UPDATE` nas tabelas com
  `updated_at`.

## Views de analytics (`crm.v_*`)

| View | Base | Retorna |
|---|---|---|
| `v_funnel_conversion` | `deal_stage_history` | taxa de conversão estágio-a-estágio por `pipeline_id` |
| `v_deal_stage_duration` | `deal_stage_history` + `deals` abertos | média/mediana/máximo de tempo por estágio + tempo no estágio atual |
| `v_lost_reason_summary` | `deals` (status=lost) + `lost_reasons` | contagem, % e valor perdido por categoria/motivo |
| `v_source_performance` | `deals` + `lead_sources` | nº deals, win rate, ticket médio, score médio, dias até fechamento por fonte |
| `v_followup_health` | `deals` abertos + `activities` | dias desde última atividade concluída, dias até próxima pendente, flag overdue/due_soon/healthy/no_next_action |
| `v_ai_quality_summary` | `ai_runs` + `ai_feedback` + `ai_prompts` | runs, rating médio, %applied, %error, custo/latência médios por slug+version |

Views simples (não materializadas) — volume de um freelancer solo não justifica a
complexidade de refresh.

## Ordem de criação (migrations)

1. `crm` schema + enums + tabelas de apoio + RLS base (Fase 2)
2. `companies`, `contacts` (Fase 2)
3. `deals`, `deal_stage_history`, `activities` + triggers (Fase 3)
4. Views de analytics exceto `v_ai_quality_summary` (Fase 4)
5. `qualification_criteria`, `qualifications`, `qualification_scores`, `qualification_history` (Fase 5)
6. `ai_prompts`, `ai_runs` (Fase 6)
7. `ai_feedback`, `prompt_lab_comparisons`, `v_ai_quality_summary` (Fase 7)
8. `process_docs`, `process_feedback`, `playbooks`, `glossary_terms` (Fase 8)
