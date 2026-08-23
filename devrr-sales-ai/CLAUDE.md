# DevRR Sales AI — Instruções do Projeto

Plataforma comercial com IA para PMEs. Projeto Next.js standalone dentro da pasta
`devrr-sales-ai/` do repositório `RR` — não compartilha runtime com `rr-landing`
(raiz) nem com `CRM-RR/`. Cada um é root directory de um projeto Vercel diferente.

## Antes de codar qualquer coisa

Leia, nesta ordem:

1. `docs/PRODUCT_SPEC.md` — o que é o produto, pra quem, o que está fora de escopo.
2. `docs/ARCHITECTURE.md` — camadas, regras de dependência, o que portar do CRM-RR.
3. `docs/DATABASE.md` — contrato de banco. Toda migration atualiza este doc.
4. `docs/IMPLEMENTATION_PLAN.md` — tarefas. Execute UMA por vez, na ordem.
5. `docs/DESIGN_SYSTEM.md` — tokens da marca DevRR adaptados a ferramenta densa.
6. `docs/DECISIONS.md` — decisões já tomadas. Não re-litigue o que está lá.

`docs/ROADMAP_ORIGINAL.md` é a visão de produto de longo prazo. Não é spec técnica
e não deve ser seguido literalmente onde conflitar com os docs acima.

## Divisão de modelos

- **Opus** projeta: PRD, arquitetura, schema, plano de tarefas, decisões de trade-off.
- **Sonnet** executa: uma tarefa do `IMPLEMENTATION_PLAN.md` por vez.

Se você é o Sonnet e a tarefa está ambígua, mal especificada, ou exige uma decisão
de arquitetura que não está nos docs: **pare e reporte**. Não improvise arquitetura.
Registre a dúvida na seção "Questões abertas" de `docs/DECISIONS.md` e devolva pro Opus.

## Protocolo de execução (Sonnet)

Uma tarefa por vez. O prompt certo é:

> Leia `docs/IMPLEMENTATION_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` e
> `docs/DESIGN_SYSTEM.md`. Execute somente a tarefa X.Y. Ao terminar, valide, marque a tarefa como concluída
> no plano e pare. Não avance para a próxima.

Ao concluir uma tarefa, marque `[x]` na linha dela em `IMPLEMENTATION_PLAN.md` e
escreva uma linha de "o que mudou" logo abaixo. É assim que o Opus retoma contexto
no próximo checkpoint.

**Checkpoints de revisão pelo Opus** (troque de modelo nestes pontos):
fim da Fase 2 (multiempresa + RLS), fim da Fase 4 (follow-up completo), fim da Fase 6.

## Regras duras (violação = refazer)

### Banco
- **Toda migration é um arquivo versionado** em `supabase/migrations/NNNN_nome.sql`,
  commitado ANTES de ser aplicada. Nunca aplique SQL direto no remoto sem o arquivo.
  (O CRM-RR errou nisso: `supabase/migrations/` vazio, schema não reproduzível.)
- **Toda tabela transacional tem `org_id uuid not null references sales.organizations`.**
  Sem exceção. Multiempresa é do dia 1, não é retrofit.
- **Toda tabela tem RLS habilitado** com policy baseada em `sales.current_org_ids()`.
- **Toda view precisa de `alter view ... set (security_invoker = true)`.** Sem isso a
  view roda como dono e ignora RLS. Depois de criar view: rodar `get_advisors(type:'security')`
  e confirmar zero alerta novo.
- Nunca `select *` em query de produção. Liste as colunas.

### Código
- Regra de dependência: `lib/domain/` NUNCA importa `supabase` ou `next`. É lógica
  pura, 100% testável com vitest.
- Componente de UI nunca fala direto com Supabase. Sempre via `lib/actions/` (escrita)
  ou `lib/queries/` (leitura).
- Toda entrada de usuário passa por Zod (`lib/validation/`) antes de tocar o banco.
- Service role key (`lib/supabase/admin.ts`) só em código `server-only`. Nunca no browser.
- Arquivos: 200-400 linhas típico, 800 máximo. Muitos arquivos pequenos > poucos grandes.

### IA
- **IA nunca é autoridade sobre dado comercial.** Preço, prazo, desconto, produto,
  política — sempre vêm do banco. A IA interpreta e escreve, não inventa regra.
- Todo prompt vive no banco (`sales.ai_prompts`), nunca hardcoded no código.
- Toda execução de IA é registrada em `sales.ai_runs`, inclusive as que dão erro.
- Output de IA nasce `pending_review`. Nada é aplicado sozinho — human-in-the-loop.
- Modelos referenciados por string via Vercel AI Gateway (`"anthropic/claude-sonnet-5"`).
  Não instalar SDK direto de provider.

### Testes
- Toda função em `lib/domain/` tem teste vitest antes de ser usada em produção.
- Regra de negócio sem teste não fecha tarefa.

## Workflow de commit

Após cada tarefa concluída:

1. `npm run typecheck && npm run lint && npm run test` — tudo verde.
2. `git add` dos arquivos da tarefa.
3. `git commit` com `feat(sales): Fase N.M — descrição`.
4. `git push`.

Não commite `.env.local`. Não commite migration não aplicada sem avisar.

## Marca

Tokens de cor, fontes e logos vêm de `../DESIGN.md`, `../brand-guide.html` e
`../logos/` (raiz do repo). **Herdamos os tokens, não os componentes** — a landing é
marketing (hero, glow, fade-up), isto é ferramenta operacional densa. Regra visual
principal: **DM Mono em todo dado numérico**. Detalhes em `docs/DESIGN_SYSTEM.md`.

## Stack fixada

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase (Postgres +
Auth + RLS, projeto `fvgbbixxcapltudonxqx`, schema `sales`) · Zod 3 · AI SDK 7 via
Vercel AI Gateway · Vitest · Deploy Vercel (projeto `devrr-sales-ai`).

Versões iguais às do `CRM-RR/package.json` de propósito — o port de código entre os
dois precisa ser 1:1 sem adaptação de API.
