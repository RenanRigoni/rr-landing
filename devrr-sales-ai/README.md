# DevRR Sales AI

Recuperação automática de leads para PMEs. Ver `CLAUDE.md` e `docs/` para
arquitetura, banco de dados, design system e o plano de implementação.

## Setup

```bash
npm install
cp .env.example .env.local   # preencher com as credenciais reais
npm run dev
```

## Deploy (Vercel — projeto `devrr-sales-ai`)

Projeto Vercel próprio, **separado** do `rr-landing` (raiz do repo) e do
`CLAUDE.md` → Stack fixada.

**Configuração do projeto (uma vez, no dashboard da Vercel):**

- **Root Directory:** `devrr-sales-ai/` (o repo é `RR`; este projeto vive numa
  subpasta).
- **Framework preset:** Next.js. Build/Install padrão.
- **Environment Variables** (as 5 de aplicação abaixo, em **Production** e
  **Preview** — as demais linhas de `.env.example`, `SEED_DEMO_OWNER_EMAIL` e
  `SUPABASE_ACCESS_TOKEN`, são dev-only e **não** vão para a Vercel):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` — server-only, nunca exposta ao browser
  - `AI_GATEWAY_API_KEY`
  - `CRON_SECRET` — **valor aleatório de ≥32 caracteres**. É a única
    autenticação de `app/api/cron/*` (D-034). Com a env var presente em
    Production, a Vercel injeta `Authorization: Bearer $CRON_SECRET` nas
    requests de Cron automaticamente.

**Cron (`vercel.json`):** `GET /api/cron/reconcile`, `0 9 * * *` UTC (06:00
BRT). Cron **só roda em deploy de Production**. Ver `docs/IMPLEMENTATION_PLAN.md`
→ 6.3 e `docs/DECISIONS.md` → D-034.

**Verificação pós-deploy:**

```bash
# 200 + contadores (sem org_id / id de lead no corpo)
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<prod-url>/api/cron/reconcile

# 401 (NÃO 307 → prova que api/cron está fora do matcher do proxy.ts)
curl -sS -o /dev/null -w '%{http_code}\n' https://<prod-url>/api/cron/reconcile
```

Deploy é disparado por push (o repo já usa esse fluxo). Migrations do Supabase
**não** são aplicadas pela Vercel — rodam à parte contra o projeto
`fvgbbixxcapltudonxqx` (`CLAUDE.md` → Banco).

## Types do banco (`npm run gen:types` / `npm run types:check`)

`lib/types/database.types.ts` é **gerado**, nunca editado à mão (D-042). Fonte:
o endpoint oficial da Management API do Supabase
(`/v1/projects/{ref}/types/typescript?included_schemas=sales`), o mesmo que o
`supabase gen types` usa por baixo — `scripts/gen-types.mjs` (`fetch` + escrita,
zero dependência nova).

```bash
npm run gen:types      # regenera lib/types/database.types.ts a partir do schema sales
npm run types:check    # regenera para memória e falha se divergir do arquivo commitado
```

- **Depois de toda migration:** `npm run gen:types` e commitar o resultado no
  mesmo passo (entra no checklist de `docs/DATABASE.md` → "Checklist obrigatório
  por migration"). `typecheck` valida o código contra o **arquivo**, não contra o
  banco — arquivo desatualizado é falha silenciosa.
- **Credencial:** `SUPABASE_ACCESS_TOKEN` (personal access token `sbp_...`,
  gerado em <https://supabase.com/dashboard/account/tokens>), em `.env.local`.
  É **dev-only**: não vai para a Vercel, não entra em `lib/env.server.ts`, nenhum
  código de runtime a lê, não é `service_role` (D-034 intacto). O ref do projeto
  sai de `NEXT_PUBLIC_SUPABASE_URL` (ou defina `SUPABASE_PROJECT_REF`).
- **`types:check` é opt-in quanto ao token**, igual a `test:rls`: sem
  `SUPABASE_ACCESS_TOKEN` no ambiente, pula com aviso e sai 0 (CI sem o segredo
  não dá falso vermelho). Com o token presente, divergência é erro.

## Seed de demonstração (`supabase/seed/`)

Popula uma organização de demonstração para inspeção e exploração local. Roda
via `tsx` com `SUPABASE_SERVICE_ROLE_KEY` (lida de `.env.local`). Ver
`docs/IMPLEMENTATION_PLAN.md` → 6.1 e `docs/DECISIONS.md` → D-032.

```bash
npm run seed:demo              # cria/recarrega a org "devrr-demo": 12 contatos, 18 leads, ~40 atividades
npm run seed:purge             # mostra quantas linhas is_demo existem (não apaga nada)
npm run seed:purge -- --yes    # apaga todo dado is_demo de contacts/leads/activities
```

- **Idempotente:** cada `seed:demo` apaga o dado `is_demo` da org e reinsere.
  Tudo entra com `is_demo = true`.
- **`purge` só toca `is_demo`** — nunca dado real. Não remove a org demo nem os
  catálogos (não têm coluna `is_demo`); `seed:demo` reaproveita o mesmo shell.
- **A org demo não aparece no app por padrão** — não é vinculada a nenhum
  usuário. Para vê-la logado, rode com o e-mail de uma conta existente:

  ```bash
  SEED_DEMO_OWNER_EMAIL=voce@exemplo.com npm run seed:demo
  ```

## Cobertura (`npm run test:coverage`)

Roda a suíte pura (`npm run test`) com o provider `v8` e um gate de **100%**
em `lib/domain/` (statements/branches/functions/lines). Opt-in: não faz parte
do `npm run test` das outras tarefas. O restante de `lib/` (actions, queries)
é coberto pela suíte `test:rls`. Ver `docs/DECISIONS.md` → D-033.

## Testes de RLS (`tests/rls.test.ts`)

Prova que o isolamento multi-tenant funciona de verdade — não que as policies
existem. Roda contra o Supabase real, com dois usuários reais de teste e a
chave anon (não há mock que prove RLS). Ver `docs/IMPLEMENTATION_PLAN.md` →
2.4.

```bash
npm run test:rls
```

Suíte separada de `npm run test` (que só roda `lib/domain/` e afins, sem
tocar a rede) porque depende de rede real e de duas contas de teste.

### Os dois usuários de teste

E-mails fixos no domínio `.test` (reservado pela IANA para testes — nunca
resolve de verdade, nenhum e-mail sai): `rls-test-a@devrr-sales-ai.test` e
`rls-test-b@devrr-sales-ai.test`, definidos em
`tests/helpers/rls-fixtures.ts`.

**Provisionamento é automático**, não manual: a suíte garante que as duas
contas existem antes de rodar (`ensureTestUser` em `beforeAll`) — tenta logar
primeiro; se falhar, cria a conta via API admin do Supabase Auth
(`email_confirm: true`, pula a etapa de confirmação por e-mail). Precisa de
`SUPABASE_SERVICE_ROLE_KEY` em `.env.local` — só para provisionar as contas e
limpar as organizações de teste entre execuções (`cleanupOrgsForUser`, roda
em `beforeAll`/`afterAll`), nunca para nenhuma asserção de RLS em si: todo
`expect()` da suíte roda contra um client autenticado de verdade (chave anon
+ sessão real via `signInWithPassword`), exatamente o que a RLS vê como
`authenticated`.

Se precisar resetar as contas manualmente (ex.: senha divergente por engano):
apague-as no dashboard Supabase → **Authentication → Users**, procurando por
`rls-test-a@devrr-sales-ai.test` / `rls-test-b@devrr-sales-ai.test`. A
próxima execução da suíte recria automaticamente.

A suíte é idempotente: pode rodar quantas vezes quiser, sempre limpa as
organizações de teste antes e depois (as duas contas de Auth persistem entre
execuções — só o que elas criam em `sales.organizations`/`sales.org_members`
é removido).
