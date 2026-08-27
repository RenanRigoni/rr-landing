# Arquitetura — DevRR Sales AI

## Posição no repositório

```
RR/                          repositório git único
├── app/ components/ lib/    rr-landing (projeto Vercel "rr-landing", em produção)
├── CRM-RR/                  CRM de prospecção outbound da DevRR (projeto Vercel "crm-rr")
└── devrr-sales-ai/          ESTE projeto (projeto Vercel "devrr-sales-ai")
```

Três projetos Next.js irmãos, `package.json` e `node_modules` próprios, zero
compartilhamento em runtime. Só dividem o repositório Git.

**Por que não monorepo com workspaces:** a raiz já tem um projeto Vercel em produção
sem tooling de workspace. Introduzir npm workspaces/Turborepo exigiria mexer no
`package.json` da raiz e no build do `rr-landing` — risco de quebrar uma landing em
produção por causa de uma feature sem relação com ela.

**Por que não evoluir o CRM-RR:** ele é single-tenant (RLS = qualquer usuário
autenticado), é outbound (você caça o cliente), e está em uso com dados reais seus.
Este produto é multi-tenant desde o dia 1, é inbound (o lead chega até a PME), e é
para vender. Ver `DECISIONS.md` D-001.

## Stack

| Camada | Escolha | Nota |
|---|---|---|
| Framework | Next.js 16 App Router | mesma major do CRM-RR |
| UI | React 19 + TypeScript | |
| Estilo | Tailwind CSS 3 | tokens replicados do CRM-RR, não importados |
| Banco/Auth | Supabase (Postgres + Auth + RLS) | projeto `fvgbbixxcapltudonxqx`, schema `sales` |
| Validação | Zod 3 | em toda fronteira de Server Action / Route Handler |
| IA | AI SDK 7 via Vercel AI Gateway | modelo por string, sem SDK de provider |
| Gráficos | Recharts | só a partir da Fase 11 |
| Testes | Vitest | lógica de domínio pura |
| Deploy | Vercel, root directory `devrr-sales-ai/` | |

Versões pinadas iguais às do `CRM-RR/package.json` de propósito: o port de código
entre os dois projetos precisa ser cópia direta, sem adaptação de API.

## Camadas

```
UI (Server/Client Components)
  └─> lib/actions/*.ts    escrita: Zod valida → domain calcula → grava → audit_log → revalidatePath
  └─> lib/queries/*.ts    leitura para Server Components (inclui views sales.v_*)
        └─> lib/domain/*.ts     lógica pura. Zero import de supabase/next. 100% testável.
        └─> lib/supabase/*.ts   client.ts (browser) · server.ts (RSC/Action) · admin.ts (service role)
        └─> lib/ai/gateway.ts   ponto único de chamada ao AI Gateway
```

**Regra de dependência, verificável por grep:**

- `lib/domain/` não importa `@/lib/supabase`, não importa `next`, não importa `ai`.
- Componente de UI não importa `@/lib/supabase`. Fala com `actions`/`queries`.
- `lib/supabase/admin.ts` só é importado de arquivo com `import 'server-only'`.

Por que domain isolado: a regra de "quando cancelar follow-up", "qual a próxima data",
"esse lead está esquecido?" é o coração do produto. Ela precisa de teste unitário
rápido, não de um banco de pé.

## Multiempresa

O tenant é `sales.organizations`. **Toda tabela transacional carrega `org_id`.**

Vocabulário — fixado para evitar a ambiguidade que existe no roadmap original:

| Termo | Tabela | É |
|---|---|---|
| Organização | `sales.organizations` | a PME que **usa** o sistema (o tenant) |
| Membro | `sales.org_members` | usuário ↔ organização, com papel |
| Contato | `sales.contacts` | a **pessoa** que entrou em contato com a PME |
| Lead | `sales.leads` | o **interesse** dessa pessoa. Um contato pode ter vários leads ao longo do tempo. |

O roadmap original chama o tenant de `companies` e o lead de `leads`, o que colide
com "empresa do cliente". `organizations` / `contacts` / `leads` elimina a colisão.

### Isolamento — como funciona de verdade

RLS via função helper:

```sql
create or replace function sales.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = sales, public
as $fn$
  select org_id from sales.org_members where user_id = auth.uid()
$fn$;
```

Policy padrão em toda tabela transacional:

```sql
create policy tenant_isolation on sales.<tabela>
  for all to authenticated
  using (org_id in (select sales.current_org_ids()))
  with check (org_id in (select sales.current_org_ids()));
```

**`security definer` é obrigatório aqui.** Sem ele, a policy de `org_members`
consultaria `org_members`, que dispara a própria policy → recursão infinita. Com
`security definer` a função roda como dona e ignora RLS na leitura de `org_members`.
`set search_path` fecha o vetor de search_path hijacking.

### Views

Toda view em `sales.*` precisa de:

```sql
alter view sales.v_nome set (security_invoker = true);
```

Sem isso a view roda com a permissão do dono (o role da migration, tipicamente
superuser) e **ignora RLS** — qualquer usuário lê dados de outra organização através
da view mesmo com a tabela base protegida. Isso não é hipotético: foi achado real na
Fase 4 do CRM-RR. Checklist obrigatório por view: criar → `security_invoker = true`
→ `get_advisors(type:'security')` sem alerta novo.

### Migrations

Arquivo versionado em `supabase/migrations/NNNN_nome.sql`, commitado antes de aplicar.
Nunca SQL direto no remoto sem o arquivo correspondente. O CRM-RR errou nisso — o
diretório de migrations dele está vazio e o schema só existe no Supabase remoto,
impossível de reproduzir. Aqui isso é bloqueante.

## Rotas (App Router)

```
app/(auth)/login                    Supabase Auth
app/onboarding                      autenticado sem org → cria a empresa (RPC create_organization)
app/(app)/layout.tsx                shell autenticado, middleware protege o grupo
app/(app)/today                     Ações de hoje  ← tela principal do MVP
app/(app)/leads                     lista + filtros
app/(app)/leads/[leadId]            detalhe: dados, histórico, follow-ups, IA
app/(app)/contacts                  contatos
app/(app)/settings/*                pipeline, fontes, regras de follow-up, prompts
app/api/cron/*                      cron Vercel, protegido por CRON_SECRET
                                    ATENCAO: excluir do matcher do proxy.ts

# depois do MVP
app/(app)/pipeline                  Kanban (Fase 9)
app/(app)/appointments              agenda (Fase 7)
app/(app)/proposals                 propostas (Fase 8)
app/(app)/conversations             WhatsApp/simulador (Fase 10)
app/(app)/dashboard                 KPIs (Fase 11)
```

Menu inicial mostra só: **Hoje · Leads · Contatos · Configurações.** Item de menu só
aparece quando o módulo existe de verdade.

**`proxy.ts` e `/api/cron/*`:** o matcher atual pega tudo que não é asset estático, e
`updateSession` redireciona toda request sem sessão para `/login`. Uma request do Cron
da Vercel não tem cookie de sessão — ela se autentica por `Authorization: Bearer
$CRON_SECRET`. Do jeito que está, o cron receberia um `307` para `/login` e a rota
nunca executaria, **sem erro visível**. O CRM-RR tem exatamente esse defeito (ele já
tem `app/api/cron/` e o mesmo matcher). Antes de criar a primeira rota de cron
(tarefa 6.3), `api/cron` precisa entrar no negative lookahead do matcher. Ver
`DECISIONS.md` D-012.

## Camada de IA

Ponto único de saída: `lib/ai/gateway.ts` (portado do CRM-RR). Contrato:

1. Busca o prompt ativo por `slug` em `sales.ai_prompts`. **Prompt nunca é hardcoded.**
2. Renderiza o template com as variáveis.
3. Chama `generateText` com `Output.object({ schema })` — output sempre tipado por Zod.
4. Grava em `sales.ai_runs`: input, output, modelo, tokens, latência, status.
5. Status nasce `pending_review`. Nenhum output é aplicado automaticamente.
6. **Erro também é gravado** em `ai_runs` com `status='error'`. Sem log silencioso.

Por que prompt no banco: permite versionar, comparar versões (Prompt Lab, portável do
CRM-RR) e ajustar sem deploy. Por que `ai_runs`: sem histórico não há como saber se a
IA está melhorando ou piorando.

O que a IA pode fazer no MVP: **escrever mensagem de follow-up** com contexto real do
lead. Só isso. Classificação e sugestão de próxima ação entram depois de haver dado
real pra avaliar.

O contexto (o `vars` do passo 2) é montado por `lib/queries/ai-context.ts`
(`buildFollowupContext(supabase, orgId, leadId)`, D-030) — cada `select` filtrado
por `org_id` — sobre `lib/domain/ai-context.ts` (puro: formatação de valor/data,
resumo de histórico, sentinel explícito para campo ausente). A action da 5.4 chama
`buildFollowupContext` e passa o resultado para `runAiPrompt`.

## Port do CRM-RR — mapa arquivo a arquivo

Cópia direta, ajustando só schema (`crm` → `sales`) e adicionando `org_id`:

| Origem (`CRM-RR/`) | Destino | Ajuste |
|---|---|---|
| `lib/supabase/client.ts` | igual | `'crm'` → `'sales'` |
| `lib/supabase/server.ts` | igual | `'crm'` → `'sales'` |
| `lib/supabase/admin.ts` | igual | `'crm'` → `'sales'` |
| `lib/supabase/middleware.ts` | igual | nenhum |
| `lib/utils/cn.ts` | igual | nenhum |
| `lib/ai/render-template.ts` | igual | nenhum |
| `lib/ai/gateway.ts` | igual | `ai_runs` ganha `org_id`; ids de contexto viram `leadId`/`contactId` |
| `lib/ai/error-categories.ts` | igual | nenhum |
| `lib/validation/auth.ts` | igual | nenhum |
| `lib/validation/contacts.ts` | igual | revisar campos |
| `lib/actions/auth.ts` | igual | nenhum |
| `lib/actions/audit.ts` | igual | `audit_logs` ganha `org_id` |
| `lib/domain/next-action.ts` | referência | reescrever com as regras deste produto, mesmo estilo |
| `tailwind.config.ts` | igual | nenhum |
| `vitest.config.ts` | igual | nenhum |
| `eslint.config.mjs` | igual | nenhum |
| `proxy.ts` / middleware | igual | nenhum |

**Não portar:** `lib/domain/qualification-score.ts`, `lost-reason-rules.ts`,
`stage-duration.ts`, `conversion.ts`, e todo `lib/queries/analytics.ts` — são de
prospecção outbound B2B, não deste produto. Reavaliar na Fase 11.

**Referência de UI:** os componentes do CRM-RR (`components/`) são o padrão visual a
seguir — densidade operacional, DM Mono em todo dado numérico, zero animação
decorativa. Copie o padrão, não necessariamente o arquivo.

## Segurança

- RLS em toda tabela `sales.*`, sempre por `org_id`. Nunca `auth.uid() is not null`.
- Service role key só em `server-only`. Browser recebe apenas a publishable key.
- Toda entrada por Zod antes do banco.
- Rota de cron protegida por `CRON_SECRET` comparado em tempo constante.
- Sem segredo hardcoded. Tudo por env var, validada no boot.
- Auditoria: toda escrita relevante grava em `sales.audit_logs` com `org_id`,
  `user_id`, entidade, ação e diff.

## Ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only
AI_GATEWAY_API_KEY=
CRON_SECRET=
```

Validado no boot com Zod, em **dois arquivos** (implementado na tarefa 1.3):

| Arquivo | Valida | `server-only` |
|---|---|---|
| `lib/env.ts` | `NEXT_PUBLIC_*` | não — precisa ser importável pelo bundle do browser |
| `lib/env.server.ts` | `SUPABASE_SERVICE_ROLE_KEY`, `AI_GATEWAY_API_KEY`, `CRON_SECRET` | sim |

A separação é obrigatória: com um arquivo só, `import 'server-only'` no topo quebraria
`lib/supabase/client.ts`, que roda no browser. Ver `DECISIONS.md` D-011.

Falha de env é erro de startup, não erro de runtime na cara do usuário. `npm run build`
**não** prova isso — o Next compila o módulo sem executar o corpo dele; a validação só
dispara quando o código roda numa request de verdade.
