# Arquitetura — CRM-RR

## Visão geral

CRM-RR é uma aplicação Next.js (App Router) standalone, dentro da pasta `CRM-RR/` do
monorepo `RR`, com `package.json`/lockfile/deploy próprios — não compartilha nada em
runtime com o projeto `rr-landing` da raiz. Os dois projetos só dividem o repositório
Git; cada um é o "root directory" de um projeto Vercel diferente.

Por quê pasta irmã e não monorepo com workspaces: a raiz já tem um projeto Vercel
(`rr-landing`) em produção, sem tooling de workspace configurado. Introduzir
npm workspaces/Turborepo exigiria mexer no `package.json` raiz e potencialmente na
config de build do `rr-landing`, criando risco de quebrar uma landing page em produção
por causa de uma feature sem relação nenhuma com ela. Uma pasta comum, independente,
elimina esse risco por completo.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript** — mesmas versões major do
  `rr-landing`, mas instância própria de `node_modules`.
- **Tailwind CSS 3** — tokens replicados (não importados) de `../tailwind.config.ts`,
  adaptados para densidade operacional (ver seção Design System).
- **Supabase** (Postgres + Auth + RLS) — projeto existente `fvgbbixxcapltudonxqx`,
  schema dedicado `crm` (ver `DATABASE_SCHEMA.md`).
- **Zod** — validação em toda fronteira de Server Action / API route.
- **Vercel AI Gateway** (via pacote `ai`) — modelos referenciados por string
  (`"anthropic/claude-sonnet-5"`), sem SDK direto de provider.
- **Recharts** — gráficos do dashboard.
- **@dnd-kit** — drag-and-drop do Kanban.
- **Vitest** — testes de lógica de domínio pura.
- **Deploy**: projeto Vercel novo `crm-rr`, root directory `CRM-RR/`.

## Camadas de código

```
UI (Server/Client Components)
  -> lib/actions/*.ts   (Server Actions: Zod valida -> domain calcula -> grava -> audit_log -> revalidatePath)
  -> lib/queries/*.ts   (leituras para Server Components, incl. views crm.v_*)
  -> lib/domain/*.ts    (lógica pura, sem import de Supabase/Next — 100% testável)
  -> lib/supabase/*.ts  (clients: client.ts browser, server.ts RSC/Server Action, admin.ts service role)
  -> lib/ai/gateway.ts  (wrapper único do Vercel AI Gateway)
```

Regra de dependência: `domain` nunca importa `supabase`/`next`. `actions` e `queries`
podem importar `domain` e `supabase`. Componentes de UI nunca falam direto com
Supabase — sempre por `actions`/`queries`.

## Estrutura de rotas (App Router)

```
app/(auth)/login                       — Supabase Auth, single-user
app/(app)/layout.tsx                   — Sidebar + shell autenticado (middleware protege o grupo)
app/(app)/my-day                       — visão operacional do dia
app/(app)/pipeline[/[pipelineId]]      — Kanban
app/(app)/deals/[dealId]               — página de deal (timeline, qualificação, IA)
app/(app)/companies[/[companyId]]      — empresas
app/(app)/contacts[/[contactId]]       — contatos
app/(app)/dashboard                    — KPIs/funil/gráficos
app/(app)/analytics/sql-learning       — SQL das views + explicação
app/(app)/ai-quality                   — métricas de qualidade de IA
app/(app)/prompt-lab                   — comparação de versões de prompt
app/(app)/processes[/[slug]]           — documentação AS-IS/TO-BE
app/(app)/playbooks[/[slug]]           — conteúdo de treinamento
app/(app)/glossary                     — glossário Sales Ops
app/(app)/settings/*                   — configuração de pipeline, lost reasons,
                                          critérios de qualificação, prompts, fontes
app/api/ai/*                           — rotas de IA (streaming, quando Server Action não serve)
app/api/cron/*                         — cron do Vercel (protegido por CRON_SECRET)
```

## Design system reaproveitado

Cores, fontes e tokens estruturais são idênticos ao `rr-landing` (ver
`tailwind.config.ts` deste projeto), mas os **componentes** não são reaproveitados —
a landing é um site de marketing (hero, scroll-animations, glow decorativo); o CRM é
uma ferramenta operacional densa (tabelas, kanban, dashboards, estilo
Pipedrive/Linear). Diferenças deliberadas:

- `rounded-card` (2rem) reservado a painéis de página/modais; componentes aninhados
  (DealCard, KpiCard) usam `rounded-lg`/`rounded-xl`.
- **DM Mono em todo dado numérico** (valores, scores, datas, contagens) — principal
  sinal visual de "ferramenta de dados" vs "site de marketing".
- Zero scroll-animation, zero glow decorativo, zero glassmorphism. Motion só em
  hover/focus com a easing `spring` já definida.

## Segurança

- RLS habilitado em toda tabela `crm.*`. Hoje: qualquer usuário autenticado tem acesso
  total (`auth.uid() IS NOT NULL`) porque só existe 1 usuário e signup público fica
  desabilitado no Supabase Auth. Todas as tabelas já têm `owner_id uuid references
  auth.users`, então a migração para multi-usuário é só trocar a policy para
  `owner_id = auth.uid()` — sem re-migração de schema.
- Browser nunca recebe a service role key. `lib/supabase/admin.ts` (service role) só é
  importado em código server-only (Server Actions, Route Handlers, scripts de seed).
- Toda entrada de usuário passa por Zod antes de tocar o banco.

## Decisões em aberto / revisar depois

Nenhuma pendência bloqueante no momento. Decisões arquiteturais futuras (ex.:
materializar views se o volume de dados crescer, multi-tenant real) ficam registradas
aqui quando surgirem.
