# DevRR Sales AI

Recuperação automática de leads para PMEs. Ver `CLAUDE.md` e `docs/` para
arquitetura, banco de dados, design system e o plano de implementação.

## Setup

```bash
npm install
cp .env.example .env.local   # preencher com as credenciais reais
npm run dev
```

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
