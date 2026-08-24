# DevRR Sales AI

Recuperação automática de leads para PMEs. Ver `CLAUDE.md` e `docs/` para
arquitetura, banco de dados, design system e o plano de implementação.

## Setup

```bash
npm install
cp .env.example .env.local   # preencher com as credenciais reais
npm run dev
```

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
