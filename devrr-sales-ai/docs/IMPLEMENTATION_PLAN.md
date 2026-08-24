# Plano de Implementação — DevRR Sales AI

## Como usar este documento

Escrito pelo **Opus**. Executado pelo **Sonnet**, uma tarefa por vez.

Prompt para cada tarefa:

> Leia `docs/IMPLEMENTATION_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` e
> `docs/DESIGN_SYSTEM.md`. Execute somente a tarefa **X.Y**. Ao terminar, rode
> `npm run typecheck && npm run lint && npm run test`, marque a tarefa como concluída
> no plano com uma linha do que mudou, commite e pare. Não avance para a próxima.

Ao concluir: trocar `[ ]` por `[x]` e adicionar abaixo da tarefa uma linha
`> feito: <o que mudou, arquivos principais>`. É assim que o Opus retoma contexto.

Se a tarefa estiver ambígua ou exigir decisão de arquitetura que não está nos docs:
**pare, registre em `DECISIONS.md` → Questões abertas, e devolva pro Opus.**

### Checkpoints de revisão (trocar para Opus)

| Depois de | O que o Opus revisa |
|---|---|
| Fase 2 completa | Isolamento multi-tenant de fato funciona? RLS testado? |
| Fase 4 completa | O fluxo de follow-up faz sentido operacional na prática? |
| Fase 6 completa | Vale abrir pra uso real? O que muda no plano das fases 7+? |

---

# FASE 1 — Fundação

Objetivo: aplicação Next.js rodando local, autenticada, com env validado. Nenhuma
regra de negócio ainda.

### [x] 1.1 Criar estrutura Next.js

> feito: scaffold manual (não via CLI — pasta não vazia) em `package.json`,
> `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`,
> `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `app/layout.tsx`,
> `app/page.tsx`, `app/globals.css`. Versões pinadas iguais ao CRM-RR (sem
> `@dnd-kit`/`recharts` — não usados até Fase 9/11, YAGNI). Cores em CSS custom
> properties (`:root` em `globals.css`, consumidas via `rgb(var(...) /
> <alpha-value>)` no tailwind config) conforme D-009; `shadow-glow-sm` omitido
> de propósito (DESIGN_SYSTEM.md: zero glow no produto). Diretórios vazios de
> `lib/*`, `components/`, `supabase/{migrations,seed}` criados com `.gitkeep`.
> `npm install` (455 pacotes), `typecheck`/`lint`/`build` limpos, `dev` testado
> manualmente (HTML confere fontes e classes de cor). `npm run test` sem
> arquivos ainda — esperado, domínio só entra na Fase 3.3+.

Scaffold em `devrr-sales-ai/` (a pasta já existe com `docs/` e `CLAUDE.md` — não apagar).

- `npx create-next-app@latest` com TypeScript, App Router, Tailwind, sem `src/`,
  alias `@/*`. Se o CLI reclamar de pasta não vazia, scaffold em temp e mova.
- Fixar versões **iguais às do `../CRM-RR/package.json`** (next 16, react 19,
  tailwind 3, zod 3, ai 7, @supabase/ssr, @supabase/supabase-js, @phosphor-icons/react,
  date-fns, clsx, server-only). Dev: vitest, @types/*, eslint-config-next, tsx.
- Scripts em `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`,
  `test:watch`, `seed:demo`, `seed:purge`.
- Copiar de `../CRM-RR/`: `tailwind.config.ts`, `postcss.config.mjs`,
  `eslint.config.mjs`, `vitest.config.ts`, `tsconfig.json`, `.gitignore`.
- Em `tailwind.config.ts`, converter as cores de brand/surface/content para CSS
  custom properties conforme `DESIGN_SYSTEM.md` → seção white-label. Fazer agora
  custa 5 minutos; fazer depois custa reescrever todo componente.
- `app/globals.css`: fontes (Plus Jakarta Sans, DM Mono, Bricolage Grotesque via
  `next/font`), variáveis `:root`, override de `prefers-reduced-motion`.
- `mkdir -p supabase/migrations supabase/seed lib/{actions,queries,domain,supabase,ai,types,utils,validation} components`

**Pronto quando:** `npm run dev` sobe, `npm run build` passa, `npm run typecheck` limpo,
página inicial renderiza com as fontes e cores da marca corretas.

### [x] 1.2 Configurar clientes Supabase

> feito: portado `lib/supabase/{client,server,admin,middleware}.ts` do CRM-RR,
> trocando `'crm'` por `'sales'`. `proxy.ts` criado na raiz (CRM-RR não tem
> `middleware.ts` — Next 16 usa a convenção `proxy.ts`, confirmado lendo o
> projeto de origem). `lib/types/database.types.ts` como placeholder:
> `Database.sales` com todas as seções `Record<string, never>` (typechecka
> contra `createServerClient<Database, 'sales'>` por compatibilidade
> estrutural de índice — `never` satisfaz qualquer tipo de valor). Será
> substituído pelos types gerados na tarefa 2.1.
>
> **Desvio registrado:** `lib/supabase/middleware.ts` do CRM-RR redireciona
> usuário autenticado em `/login` para `/my-day` (rota daquele projeto). Aqui
> a home autenticada é `/today` (`docs/ARCHITECTURE.md` → Rotas), então o
> redirect foi ajustado para `/today` em vez de copiado literalmente — copiar
> `/my-day` criaria um redirect para rota inexistente neste projeto. Não é
> mudança de arquitetura, é correção do artefato de cópia.
>
> Validação: `typecheck`/`lint`/`build` limpos (build reconhece `ƒ Proxy
> (Middleware)`); `admin.ts` com `import 'server-only'` na linha 1 confirmado;
> `grep` em `components/` por `@/lib/supabase` sem match. `test` sem arquivos
> — fora de escopo da 1.2, mesma situação da 1.1.

**Pronto quando:** typecheck passa; `admin.ts` tem `import 'server-only'`; nenhum
arquivo de `components/` importa `@/lib/supabase`.

### [x] 1.3 Env validado no boot

> feito: `.env.example` com as 5 variáveis. `.env.local` copiado de
> `../CRM-RR/.env.local` (mesmo projeto Supabase `fvgbbixxcapltudonxqx`) com
> `CRON_SECRET` novo gerado por `crypto.randomBytes(32)` — confirmado diferente
> do do CRM-RR por hash, sem imprimir nenhum segredo no terminal em nenhum
> momento da tarefa. `lib/supabase/{client,server,admin,middleware}.ts`
> atualizados para usar `publicEnv`/`serverEnv` em vez de `process.env` direto.
>
> **Desvio registrado:** `lib/env.ts` foi dividido em **dois arquivos** —
> `lib/env.ts` (público, sem `server-only`) e `lib/env.server.ts` (server-only,
> com `import 'server-only'`) — em vez de um único arquivo. Necessário: se as
> duas validações vivessem no mesmo módulo com `import 'server-only'` no topo,
> `lib/supabase/client.ts` (bundle do browser) quebraria ao importar a parte
> pública. A frase do plano "`NEXT_PUBLIC_*` valida separado" já apontava nessa
> direção; a divisão em arquivo só torna a separação inevitável pela regra de
> `ARCHITECTURE.md` → Segurança ("service role key só em server-only"). Não é
> mudança de arquitetura, é a forma correta de cumprir a arquitetura já escrita.
>
> **Verificação do critério "pronto quando":** testado com script `tsx`
> descartável (criado e removido na própria tarefa, nunca commitado) que
> importa `lib/env.ts` diretamente com variável ausente — confirma erro claro
> isolando exatamente a variável faltante, em 3 cenários (ambas ausentes, ambas
> presentes, só uma ausente). `npm run build` **não** serve para provar isso:
> Next.js compila o proxy/middleware sem executar o corpo do módulo — a
> validação só dispara quando o código roda de fato numa request. Para
> `lib/env.server.ts`, confirmei que a guarda `server-only` está ativa (bloqueia
> import fora de contexto real de servidor Next); a validação Zod em si usa
> padrão idêntico ao público mas só será exercitada quando algo importar
> `admin.ts` (Fase 2+), o AI Gateway (Fase 5) ou o cron (Fase 6) — nenhum existe
> ainda, e criar um agora seria antecipar tarefa futura, fora do escopo da 1.3.
>
> Validação: `typecheck`/`lint`/`build` limpos com `.env.local` completo.
> `test` sem arquivos — fora de escopo, mesma situação da 1.1/1.2.

**Pronto quando:** remover uma variável do `.env.local` derruba o boot com mensagem
clara dizendo qual variável falta.

### [x] 1.4 Autenticação

> feito: portado `lib/validation/auth.ts` (idêntico ao CRM-RR) e
> `lib/actions/auth.ts` (`signIn`/`signOut`, redirects ajustados para
> `/today`/`/login` deste projeto). `lib/navigation.ts` criado só com o grupo
> "Operação" → "Hoje" (`/today`) — nenhum outro módulo existe ainda, conforme
> `ARCHITECTURE.md` → Rotas ("item de menu só aparece quando o módulo existe
> de verdade"). `components/ui/LoginForm.tsx` e `components/layout/Sidebar.tsx`
> portados com o botão primário seguindo a receita exata de
> `DESIGN_SYSTEM.md` → Botão primário (`rounded-lg`, sem `rounded-pill`, sem
> `hover:scale`) e foco visível em todo elemento interativo (`focus-visible`
> conforme `DESIGN_SYSTEM.md` → Acessibilidade). `app/(auth)/login/page.tsx`,
> `app/(app)/layout.tsx`, `app/(app)/today/page.tsx` criados.
>
> Logo real trazido para `public/logos/` (`logo-wordmark-color.svg` e
> `logo-primary-color.svg`, copiados de `../logos/`), dimensões calculadas do
> `viewBox` de cada arquivo para casar com o tamanho pedido em
> `DESIGN_SYSTEM.md` → Logo: wordmark a 20px de altura (89×20), primary a
> 180px de largura (180×39). Usado `<img>` simples em vez de `next/image` —
> evita mexer em `next.config.ts` para liberar SVG no otimizador de imagem,
> desnecessário para dois arquivos de marca estáticos.
>
> **Nota, não é desvio:** signup público já está desabilitado no projeto
> Supabase `fvgbbixxcapltudonxqx` — confirmado em
> `../CRM-RR/docs/CRM_ARCHITECTURE.md` → Segurança ("signup público fica
> desabilitado no Supabase Auth"). É configuração de projeto (não de schema),
> logo já vale para este produto também; nada para mexer no painel do
> Supabase nesta tarefa.
>
> Validação funcional real, não só tipo/lint: subi `next dev`, confirmei via
> `curl` que `/today` sem cookie devolve `307` para `/login` (e `/` também,
> comportamento herdado da 1.2) e que `/login` responde `200`. No navegador
> (Playwright), a página de login renderiza o logo certo, e submeter o
> formulário com credenciais inválidas retorna `"E-mail ou senha
> incorretos"` — prova que o Server Action faz round-trip real com o
> Supabase Auth do projeto, não é mock. Login bem-sucedido e logout **não**
> foram testados ponta a ponta: exigem uma conta real, e criação de conta é
> processo manual fora do código (mesma nota acima) — criar uma agora seria
> ação sobre infraestrutura compartilhada com o CRM-RR fora do pedido desta
> tarefa. O código de `signOut` é o mesmo padrão já comprovado em produção
> pelo CRM-RR (`supabase.auth.signOut()` + `redirect('/login')`).
>
> Console do browser: só erro de `favicon.ico` 404 (esperado, nenhuma tarefa
> até aqui criou favicon — fora do escopo da 1.4). Artefatos do Playwright
> (screenshots/logs) removidos após o teste, nunca commitados.

**Pronto quando:** login funciona, `/today` sem sessão redireciona, logout limpa a
sessão, sidebar mostra o logo certo conforme `DESIGN_SYSTEM.md`.

---

## ✅ Checkpoint Opus — fim da Fase 1 (2026-08-23) — **APROVADO**

Revisado: `CLAUDE.md`, os seis docs, todo o código das tarefas 1.1–1.4 e os commits
`b8e6712`, `3d3d9c5`, `ceb57d5`, `c510f4b`.

**Aderente.** Nenhuma antecipação de funcionalidade: `lib/domain/`, `lib/queries/` e
`lib/ai/` continuam vazios; `recharts`/`@dnd-kit` corretamente fora; menu só com
`/today`. Os três desvios registrados pelo Sonnet (redirect `/my-day`→`/today`,
`proxy.ts` em vez de `middleware.ts`, env em dois arquivos) eram corretos — os dois
últimos viraram `DECISIONS.md` D-011 e D-012.

**Verificado por execução, não por leitura:**

- `grep` em `app/` e `components/`: zero import de `@/lib/supabase` — a regra de camada
  de `ARCHITECTURE.md` se sustenta.
- `@/lib/env.server` é importado por exatamente um arquivo, `lib/supabase/admin.ts`,
  que tem `import 'server-only'` na linha 1. Único `'use client'` do projeto é
  `LoginForm.tsx`, que não toca em nenhum dos dois.
- `git grep` por padrão de JWT/service-role em arquivo versionado: nada. `.env.local`
  não rastreado.
- Schema `sales` **ainda não existe** no Supabase (`pg_namespace` só tem `crm` e
  `public`) — estado correto para começar a 2.1.

**Achados corrigidos aqui, nos docs (motivo do commit deste checkpoint):**

1. `DATABASE.md` mandava `grant ... on all tables in schema sales` na migration 0001,
   quando ainda não existe tabela nenhuma. As tabelas da 0002 em diante nasceriam sem
   privilégio e o PostgREST devolveria `permission denied for table organizations`
   **antes** de a RLS ser consultada — a 2.2 quebraria e pareceria erro de policy.
   Confirmado no próprio projeto Supabase: o schema `crm`, que funciona, tem
   `alter default privileges` configurado. `DATABASE.md` → Grants reescrito.
2. `0009_views.sql` (fase 4.3) vinha depois de `0008_audit.sql` (fase 5.4) — numeração
   contra a ordem de aplicação. Trocados: views = `0008`, audit = `0009`.
3. `ARCHITECTURE.md` → Ambiente ainda descrevia um único `lib/env.ts`. Atualizado para
   os dois arquivos que existem de fato.

**Achados registrados, a resolver na tarefa indicada (nenhum bloqueia a 2.1):**

| # | Achado | Gravidade | Onde resolver |
|---|---|---|---|
| A | `npm run test` sai com código **1** ("No test files found"), então a cadeia `typecheck && lint && test` do `CLAUDE.md` aborta antes do commit em toda tarefa sem teste (2.1, 2.2, 2.3). | importante | primeiro passo da 2.1 |
| B | O matcher do `proxy.ts` engole `/api/cron/*`: sem cookie, a request do Cron leva `307` para `/login` e a rota nunca roda, **sem erro visível**. Defeito herdado do CRM-RR, que já tem `app/api/cron/` com o mesmo matcher. | importante | 6.3, antes da primeira rota de cron |
| C | `app/page.tsx` ainda é o placeholder da 1.1. Usuário autenticado que abre `/` cai numa página que diz "Fundação do projeto" em vez do app. | melhoria | 2.3, junto do onboarding |
| D | `lib/env.server.ts` valida `AI_GATEWAY_API_KEY` junto com o resto, e `admin.ts` importa `serverEnv` — então o seed da 6.1 vai exigir a chave de IA sem usá-la. | melhoria | 6.1, se incomodar |
| E | Favicon não existe (`logo-icon-color.svg` / `logo-monogram-color.svg` do `DESIGN_SYSTEM.md`); o console do browser acusa 404. | melhoria | qualquer tarefa de UI |

**Fora do escopo deste projeto, reportado:** `tsconfig.json` da raiz do repo compila os
projetos irmãos (281 erros de tipo hoje, pré-existentes). Registrado como `Q-004` em
`DECISIONS.md`.

**Veredito: LIBERADO para a tarefa 2.1.**

---

# FASE 2 — Multiempresa

Objetivo: isolamento por organização funcionando de verdade, provado por teste.
Esta é a fase que não pode ser feita depois. Checkpoint Opus ao final.

### [x] 2.1 Migration de fundação + enums

> feito: `supabase/migrations/0001_schema_and_helpers.sql` aplicada no
> Supabase remoto (`fvgbbixxcapltudonxqx`): schema `sales`, `fn_set_updated_at()`,
> `current_org_ids()` (`security definer`, `search_path` fixo), grants +
> `alter default privileges` do checkpoint (sem `anon`), os 6 enums. Passo 0
> feito primeiro: `package.json` → `test` agora é
> `vitest run --passWithNoTests` (achado A do checkpoint), `npm run test` sai
> com código 0 mesmo sem arquivo de teste.
>
> **Desvios técnicos, forçados pelo Postgres, não por decisão de arquitetura:**
>
> 1. **Referência antecipada de `current_org_ids()` a `org_members`.** A
>    função é `language sql` e o Postgres valida o corpo contra o catálogo na
>    criação (pode ser inlined pelo planner) — `org_members` só existe na
>    migration 0002, então a primeira tentativa de aplicar falhou com
>    `relation "sales.org_members" does not exist`. Corrigido com
>    `set local check_function_bodies = off` só ao redor dessa `create
>    function`, escopado à transação da migration — mecanismo documentado do
>    Postgres para exatamente este caso. Não mudei a ordem das migrations nem
>    a linguagem da função: o desenho de `DATABASE.md` (helper criado antes
>    da tabela, para já existir quando as policies forem escritas) continua
>    válido, só precisava desse toggle para compilar.
> 2. **`fn_set_updated_at()` sem `search_path` fixo gerava alerta NOVO no
>    `get_advisors(type:'security')`** (`function_search_path_mutable`,
>    WARN) — o único alerta novo introduzido pela migration; todo o resto da
>    lista já existia (schemas `public`/clínica compartilhados no mesmo
>    projeto Supabase, nada deste produto). Corrigido acrescentando
>    `set search_path = sales, public` também nela, mesmo não sendo
>    `security definer` — reaplicado do zero (ver replay abaixo), não só
>    corrigido por cima. `DATABASE.md` → Fundação de multi-tenancy
>    atualizado para refletir os dois pontos acima; SQL do doc agora é
>    idêntico ao da migration.
>
> **Validado, não só assumido:**
> - Replay do zero: `drop schema sales cascade` seguido de reaplicar
>   `supabase/migrations/0001_schema_and_helpers.sql` inteiro, sozinho, do
>   arquivo final — sucesso. Prova que o arquivo local é autossuficiente e
>   não depende dos dois comandos avulsos que corrigiram a primeira tentativa.
> - `get_advisors(type:'security')` após o replay: zero alerta novo do
>   schema `sales` (comparado à baseline do checkpoint da Fase 1, antes de
>   qualquer migration). Todos os alertas restantes são de outros schemas.
> - Grants: `information_schema`/`pg_default_acl` confirmam
>   `alter default privileges` ativo para `authenticated` e `service_role`
>   em tables/sequences/functions futuras do schema `sales`. `usage` no
>   schema só para `postgres` (dono), `authenticated`, `service_role` —
>   `anon` **sem nenhum privilégio**, confirmado via `aclexplode`.
> - `current_org_ids()`: `security definer` = true, `search_path` fixo,
>   confirmados via `pg_proc`.
> - `typecheck`/`lint`/`test`/`build` limpos (build reconhece as 4 rotas +
>   `Proxy (Middleware)`).
>
> **Não fiz sozinho, precisou de ação manual do usuário — feita e confirmada:**
> - **"Expor `sales` em Settings → API → Exposed schemas"**: é ação exclusiva
>   do dashboard do Supabase, sem equivalente em SQL nem em nenhuma ferramenta
>   MCP disponível. O usuário fez manualmente durante esta mesma tarefa.
>   Confirmado que funcionou batendo direto no PostgREST (não via o gerador
>   de types — ver ponto abaixo): request com `Accept-Profile: sales` contra
>   tabela inexistente devolveu `PGRST205` ("tabela não encontrada"), não
>   `PGRST106` ("schema inválido"); e um schema realmente não exposto, testado
>   como controle, devolveu a lista real do projeto —
>   `public, graphql_public, crm, sales` — confirmando `sales` presente.
> - **Types "gerados"**: `generate_typescript_types` (ferramenta MCP) continuou
>   devolvendo só o schema `public` mesmo depois da exposição confirmada —
>   nem o schema `crm` do CRM-RR aparece nela, apesar de exposto e em produção
>   há meses. É limitação da ferramenta desta sessão, não do projeto Supabase.
>   `lib/types/database.types.ts` continua escrito à mão, espelhando os 6
>   enums da migration (`Tables`/`Views`/`Functions`/`CompositeTypes`
>   continuam `Record<string, never>` — nenhum existe ainda). Comentário no
>   arquivo atualizado para não dizer mais que a exposição está pendente.
> - **Commit único da tarefa**: fiz dois commits, não um. `CLAUDE.md` exige
>   migration commitada **antes** de aplicada — commitei
>   `0001_schema_and_helpers.sql` sozinho primeiro (`ab36fcc`), *depois*
>   apliquei no remoto. O commit final desta tarefa cobre o resto (correções
>   pós-validação no arquivo de migration, docs, types, `package.json`).

**Passo 0 (achado A do checkpoint da Fase 1):** trocar o script `test` do
`package.json` para `vitest run --passWithNoTests`. Sem isso, `npm run test` sai com
código 1 enquanto não houver arquivo de teste e a cadeia
`typecheck && lint && test` do `CLAUDE.md` aborta antes do commit desta tarefa e das
duas seguintes. Some sozinho na 2.4, mas atrapalha até lá.

`supabase/migrations/0001_schema_and_helpers.sql` conforme `DATABASE.md`:
schema `sales`, grants, `fn_set_updated_at()`, `current_org_ids()` (`security definer`
+ `set search_path`), todos os enums.

Os grants incluem `alter default privileges` — copiar o bloco de `DATABASE.md` →
Grants **inteiro**. Só `grant on all tables` não cobre as tabelas da 0002 em diante, e
o sintoma é `permission denied` parecendo erro de RLS.

Depois: expor `sales` em Settings → API → Exposed schemas; gerar
`lib/types/database.types.ts`; rodar `get_advisors(type:'security')`.

**Pronto quando:** arquivo commitado antes de aplicado, schema existe, types gerados,
advisors sem alerta novo, `DATABASE.md` conferido.

### [x] 2.2 Organizations + org_members

> feito: `supabase/migrations/0002_organizations.sql` aplicada no Supabase
> remoto. Tabelas `organizations` e `org_members` conforme `DATABASE.md`, RLS
> nas duas, trigger `organizations_set_updated_at` → `fn_set_updated_at()`,
> RPC `create_organization(p_name)` `security definer` (gera `slug` kebab-case
> ASCII do nome, com sufixo numérico em colisão — não especificado literalmente
> em `DATABASE.md`, implementação necessária pra cumprir `slug not null
> unique`).
>
> **Desvio permanente, registrado como D-013:** `org_members` não segue o
> padrão de uma policy `tenant_isolation` `for all` — leitura é por associação
> (`tenant_isolation_select`), escrita é restrita a `role in ('owner','admin')`
> via 3 policies (`owner_admin_insert/update/delete`). A checagem de papel
> usa novo helper `sales.current_org_role(p_org_id)`, `security definer` +
> `search_path` fixo, mesmo padrão de `current_org_ids()` — necessário porque
> uma policy de `org_members` não pode consultar `org_members` direto (mesma
> recursão que `current_org_ids()` já existe pra evitar). Índice
> `org_members_user_id_idx` acrescentado (não estava no texto literal da
> tarefa) porque `current_org_ids()` consulta essa tabela por `user_id` em
> toda policy do schema — hot path do RLS inteiro.
>
> **Validado, não só assumido:**
> - Replay do zero: `drop schema sales cascade` + reaplicar 0001 e 0002 finais,
>   sozinhos, na ordem — sucesso.
> - `get_advisors(security)` após o replay: só 3 alertas novos no schema
>   `sales`, todos WARN "authenticated pode executar função security
>   definer" (`create_organization`, `current_org_ids`, `current_org_role`).
>   Aceito por desenho e documentado em D-013 — nenhuma das três vaza dado de
>   outro usuário, e nenhuma aparece pra `anon` (confirmado via
>   `has_function_privilege`).
> - `pg_policies`: as 5 policies (`tenant_isolation` em organizations;
>   `tenant_isolation_select`, `owner_admin_insert/update/delete` em
>   org_members) existem exatamente como projetadas.
> - **Isolamento provado ponta a ponta**, não só policy existindo: simulação
>   SQL com dois usuários reais de `auth.users` (JWT fake via
>   `set local request.jwt.claims`, dentro de transação com `rollback`, zero
>   dado deixado — confirmado `count(*) = 0` em `organizations`/`org_members`
>   depois). 7 casos, todos bateram o esperado: usuário A cria org via RPC e
>   vira `owner`; usuário B não vê a org de A (nem em `organizations` nem em
>   `org_members`); `current_org_role()` de B na org de A retorna `null`;
>   insert direto de B se auto-nomeando membro da org de A é bloqueado pela
>   policy `owner_admin_insert` (erro `insufficient_privilege`, não passa por
>   ser bloqueado na FK). Essa é uma prova funcional pontual, não a suíte
>   completa da 2.4 (`tests/rls.test.ts` com vitest + dois usuários reais via
>   client anon) — 2.4 continua sendo quem fecha esse item oficialmente.
> - Grants: `organizations`/`org_members` têm
>   `select,insert,update,delete` pra `authenticated`/`service_role` via
>   `alter default privileges` da 0001 (nenhum grant explícito precisou ser
>   escrito nesta migration). `anon` sem privilégio nenhum.
> - `typecheck`/`lint`/`test`/`build` limpos.
>
> `lib/types/database.types.ts` atualizado à mão (gerador MCP continua só
> devolvendo `public`, mesma limitação da 2.1) com as duas tabelas e as 3
> funções (pra tipar `.rpc('create_organization', ...)` na 2.3).
> `DATABASE.md` → org_members ganhou o SQL final das policies e do helper
> (antes só descrevia em prosa). Dois commits: migration sozinha antes de
> aplicar (`e4c0804`), resto depois.

`supabase/migrations/0002_organizations.sql`:

- Tabelas `organizations` e `org_members` conforme `DATABASE.md`.
- RLS nas duas. `organizations` usa `id in (select sales.current_org_ids())`.
- RPC `sales.create_organization(p_name text)` `security definer`: cria a org, insere
  o `auth.uid()` como `owner`, retorna o `id`. Precisa ser RPC porque a policy de
  insert não pode passar antes da membership existir.
- Trigger de `updated_at`.

**Pronto quando:** advisors limpo, types regerados, `DATABASE.md` atualizado.

### [x] 2.3 Vincular usuário → organização na aplicação

> feito: `lib/queries/orgs.ts` (`getCurrentOrg()`), `lib/actions/orgs.ts`
> (`createOrganization`, Server Action com Zod), `lib/validation/orgs.ts`
> (`createOrganizationSchema` — não citado literalmente na tarefa, mas
> obrigatório pela regra dura "toda entrada de usuário passa por Zod"),
> `lib/queries/require-org.ts` (`requireOrgId()`). `app/onboarding/page.tsx` +
> `components/ui/OnboardingForm.tsx` seguindo o mesmo padrão visual da tela de
> login (logo `logo-primary-color.svg` 180px, botão primário exato do
> `DESIGN_SYSTEM.md`, `font-display` no título — "estado vazio grande" antes
> do produto existir de fato pro usuário).
>
> `lib/supabase/middleware.ts` ganhou o gate: usuário autenticado sem
> nenhuma `org_members` é redirecionado para `/onboarding`; com org, não
> pode ficar em `/onboarding` (redireciona para `/today`). Também corrigido
> para usar `db: { schema: 'sales' }` e o client tipado `<Database,'sales'>`
> — faltava desde a 1.2/2.1, e sem isso a consulta de `org_members` nem
> compilaria contra o schema certo.
>
> **Desvio, resolvendo achado C do checkpoint da Fase 1:** `app/page.tsx`
> (ainda placeholder "Fundação do projeto") agora só faz `redirect('/today')`.
> Não estava no texto literal da 2.3, mas o próprio achado do checkpoint
> pedia para resolver "junto do onboarding" — é a mesma decisão de roteamento
> (usuário autenticado que chega em `/` já tem org, garantido pelo
> middleware, então só falta mandar pro app). `app/(app)/today/page.tsx`
> passou a chamar `getCurrentOrg()` de verdade e mostrar o nome da org — sem
> isso "chega em `/today` com a org ativa resolvida no servidor" (critério de
> pronto da tarefa) não seria demonstrável em código nenhum.
>
> **Decisão permanente, D-014:** o gate de onboarding consulta `org_members`
> em toda request autenticada, sem cache — mesmo trade-off já aceito para
> `getUser()` no mesmo middleware. Registrado com o porquê e o que foi
> descartado (cookie `has_org`).
>
> **Validado:**
> - `typecheck`/`lint`/`test`/`build` limpos. Achado de tipo real durante o
>   typecheck: `@supabase/postgrest-js` 2.x exige `Relationships:
>   GenericRelationship[]` em toda tabela do `Database` type — sem isso,
>   `organizations`/`org_members` caíam pra `never` e todo o arquivo
>   `lib/queries/orgs.ts` quebrava em cadeia. Corrigido em
>   `lib/types/database.types.ts` (array vazio em `organizations`, FK real
>   declarada em `org_members` → `organizations`).
> - Playwright real (dev server): `/today`, `/onboarding` e `/` sem sessão
>   → `307` para `/login` (confirma que a nova rota está protegida igual às
>   demais); `/login` sem sessão → `200`.
> - Sem conta real de teste (mesma limitação da 1.4 — criar conta é processo
>   manual fora do código), o fluxo autenticado completo foi validado por
>   simulação SQL com usuário real de `auth.users` (JWT fake, dentro de
>   transação com `rollback`, zero dado deixado — mesma técnica da 2.2): a
>   query exata que o middleware roda (`select id from org_members
>   limit 1`) retorna vazio antes de criar org e 1 linha depois; a query
>   exata de `getCurrentOrg` (`select id,name,slug,timezone from
>   organizations order by created_at`) retorna 1 org, depois 2 ao criar uma
>   segunda, com a primeira criada por `created_at` sendo a primeira
>   retornada — confirma o "default = a primeira" da spec sem precisar
>   simular leitura de cookie (isso é lógica pura de JS, determinística, não
>   depende de teste de banco). Prova pontual da lógica de dados; não
>   substitui teste E2E real de sessão de browser, que precisa de conta.
>
> Nada em `supabase/migrations/` nesta tarefa — regra de "commit antes de
> aplicar" não se aplica.

- `lib/queries/orgs.ts`: `getCurrentOrg()` — resolve a org do usuário logado. Se ele
  tem várias, lê de cookie `active_org_id`; default = a primeira.
- `lib/actions/orgs.ts`: `createOrganization(name)` chamando a RPC.
- Onboarding: usuário autenticado sem nenhuma org cai em `/onboarding`, informa o
  nome da empresa, e a org é criada com todos os seeds (catálogos vêm na 3.1 — por
  ora só a org).
- **Helper obrigatório** `lib/queries/require-org.ts`: `requireOrgId()` que lança se
  não houver org. Toda action e toda query passa a usar. Nenhum `org_id` vem do
  cliente — sempre do servidor.

**Pronto quando:** usuário novo é levado ao onboarding, cria a empresa, e chega em
`/today` com a org ativa resolvida no servidor.

### [x] 2.4 Provar o isolamento

> feito: `tests/rls.test.ts` (24 casos) + `tests/helpers/rls-fixtures.ts`.
> Cobre os 4 casos literais da tarefa e os 8 do checklist de segurança do
> checkpoint: A acessa a própria org; B não acessa a org de A (`organizations`
> e `org_members`); B não se autoadiciona à org de A (insert bloqueado); A não
> insere com `org_id` de B; A não move a própria membership pra org de B
> (update bloqueado); owner adiciona membro real e o member resultante
> respeita as permissões (não altera o próprio papel, não apaga a própria
> membership, mas lê a lista — `tenant_isolation_select` é por associação,
> não só para owner/admin); `current_org_ids()` não vaza org alheia e passa a
> incluir a org quando o usuário vira membro de verdade;
> `current_org_role()` retorna `null` para org alheia e o papel certo
> (`owner`/`member`) para a própria; `create_organization()` cria o vínculo
> certo (criador = único membro, papel `owner`); ausência de organização
> tratada (usuário recém-criado: `organizations` vazio, `current_org_ids()`
> vazio); anon bloqueado em `organizations`, `org_members`,
> `current_org_ids()` e `create_organization()`.
>
> `npm run test:rls`: **24/24 passam**, duas vezes seguidas (idempotência —
> confirmado por `select` direto que zero organização de teste ficou no
> banco entre execuções). Suíte separada de `npm run test` via
> `vitest.rls.config.ts` (rede real, não deve rodar em todo commit de tarefa
> futura) — exatamente o que o texto da tarefa previa ("marcar como suite
> separada se ficar lento").
>
> **Achado real, não um bug meu:** `SUPABASE_SERVICE_ROLE_KEY` estava
> **vazia** em `.env.local` — não só neste projeto, o `.env.local` do
> CRM-RR de onde copiei na tarefa 1.3 já tinha a mesma linha vazia
> (confirmado comparando os dois arquivos, mesmo tamanho de linha). Bloqueava
> qualquer uso real de `lib/supabase/admin.ts`, nunca exercitado em código
> até agora. Sem ferramenta MCP disponível expõe essa chave (só
> `get_publishable_keys`, que é pública por design) — reportei o bloqueio ao
> usuário, que forneceu o valor real do dashboard; preenchido em
> `.env.local` (gitignored, confirmado via `git check-ignore`).
>
> **Achado real de RLS, motivo de existir a 2.4:** um `UPDATE`/`DELETE`
> bloqueado pela cláusula `USING` da policy (o usuário não tem permissão
> nenhuma sobre a linha) **não gera erro** — o Postgres só filtra a linha do
> conjunto afetado, "sucesso" com 0 linhas. Erro real só acontece quando a
> `USING` passa mas o `WITH CHECK` rejeita o novo valor (caso do teste "A move
> a própria membership pra org de B"). Os dois testes de "member não
> consegue alterar/apagar a própria linha" caíram nisso na primeira rodada —
> corrigidos para checar `data` do `.select()` encadeado (`[]`), não `error`.
> **Registrado como D-016** — vale para qualquer teste de RLS futuro
> (Fase 6.4 reexecuta esta suíte estendida).
>
> **Decisão permanente, D-015:** provisionamento dos dois usuários de teste é
> automático (`ensureTestUser`, idempotente), não manual como o texto
> original da tarefa sugeria ("documentar como criar"). README.md documenta
> o mecanismo e como resetar manualmente se precisar.
>
> Nenhuma migration nesta tarefa — 0001/0002 não tocadas.
> `typecheck`/`lint`/`test`/`build` limpos.

Não é "escrever RLS". É **provar que ela funciona**.

- `tests/rls.test.ts` (vitest + `@supabase/supabase-js` com chave anon, dois usuários
  de teste em duas orgs):
  - usuário A não lê registro da org B (`select` retorna 0 linhas, não erro);
  - usuário A não consegue inserir com `org_id` da org B (erro de policy);
  - usuário A não consegue alterar `org_id` de um registro seu para a org B;
  - usuário anônimo não lê nada.
- Documentar em `README.md` como criar os dois usuários de teste.
- Roda contra o Supabase real (não há mock que prove RLS). Marcar como suite separada
  se ficar lento: `npm run test:rls`.

**Pronto quando:** os quatro casos passam. **Se qualquer um falhar, para tudo e
conserta antes de seguir.** → **Checkpoint Opus.**

---

## ⛔ Checkpoint Opus — fim da Fase 2 (2026-08-23) — **NÃO APROVADO até a 2.5**

Revisão de 2.1 → 2.4: migrations, policies, helpers, camada de app, gate de
onboarding e a suíte de RLS. **Isolamento *entre* organizações está correto e
provado.** O que reprova o checkpoint é autorização *dentro* da organização.

### Revalidado do zero neste checkpoint (não só lido)

- **Replay real:** `drop schema sales cascade` + reaplicar 0001 e 0002 na ordem →
  5 policies, 4 funções, 6 enums, 2 tabelas. Sem perda: o schema estava com
  `organizations = 0` e `org_members = 0` linhas (ver achado C).
- **`npm run test:rls` logo após o replay: 24/24 passam.** É a prova mais forte que
  o projeto tem até aqui — schema recriado do arquivo, suíte verde contra ele.
- `typecheck` / `lint` / `test` / `build` limpos.
- `get_advisors(security)`: no schema `sales`, só os 3 WARN já documentados em D-013
  (`authenticated` executa função `security definer`). Todo o resto dos alertas é de
  `public`, de outros projetos no mesmo Supabase — nenhum alerta novo.
- Estado vivo × arquivo: as 5 policies, as 4 funções (todas com
  `search_path = sales, public`; as 3 `security definer` corretas), os 5 índices e as
  default privileges batem exatamente com 0001/0002. Sem drift.
- **`anon` não tem nada:** `has_schema_privilege('anon','sales','usage') = false`,
  zero grant de tabela, `execute = false` nas três RPC. Confirmado no catálogo, além
  dos 4 testes de anon na suíte.
- Camadas: nenhum componente importa `@/lib/supabase`; `createAdminClient()` não é
  chamado em lugar nenhum do app (só existe para os seeds da 6.x); `service_role`
  aparece só em `lib/env.server.ts`, `lib/supabase/admin.ts` e nas fixtures de teste
  — nunca numa asserção de RLS.

### Achado A — BLOQUEANTE · `member` renomeia e apaga a organização

`organizations` tem uma policy `tenant_isolation` `for all`, então quem passa no
`using (id in current_org_ids())` — **qualquer membro, inclusive `role = 'member'`** —
pode `UPDATE` e `DELETE` a linha da própria organização.

**Provado, não suposto.** Simulação SQL com os dois usuários de teste reais,
`set local role authenticated` + `request.jwt.claims` do usuário B como `member` na
org de A:

| operação de B (`member`) | esperado | obtido |
|---|---|---|
| `select organizations` | 1 linha | 1 linha ✓ |
| `update organizations set name` | 0 linhas | **1 linha — nome trocado** |
| `delete from organizations` | 0 linhas | **1 linha — org apagada** |

**Risco concreto:** a partir da 3.2 toda tabela transacional referencia
`organizations(id) on delete cascade`. Esse `DELETE` de uma linha passa a apagar
contatos, leads, atividades, follow-ups, runs de IA e auditoria da empresa inteira —
um membro comum derruba o tenant com uma chamada PostgREST direta, sem tela nenhuma.
Hoje não é explorável (onboarding cria a org com um único `owner`, não existe convite),
e é por isso que a hora é agora: a correção é uma migration de três policies, contra
auditar sete tabelas depois.

**Correção mínima:** tarefa 2.5 abaixo. Decisão de contrato registrada em **D-017**,
SQL final em `DATABASE.md` → `sales.organizations`.

### Achado B — IMPORTANTE · gate de onboarding engole erro de banco

`lib/supabase/middleware.ts` faz `const { data: membership } = await supabase.from('org_members')...`
e descarta o `error`. Qualquer falha transitória (rede, timeout, PostgREST fora do ar)
vira `hasOrg = false`, e o usuário **com** organização é jogado em `/onboarding` — onde
o caminho oferecido a ele é criar uma segunda empresa. Falha silenciosa que gera dado
sujo em vez de erro. Correção mínima: tratar `error` explicitamente e, nesse caso,
deixar a request seguir (a RLS já protege o dado — o gate é de UX, não de segurança).
Responsável: **tarefa 2.5**.

### Achado C — IMPORTANTE (documental) · a org da 2.3 não existe mais

`organizations` está com 0 linhas — a org criada na 2.3 foi removida por algum
`cleanupOrgsForUser` da suíte da 2.4 (ela apaga toda org do usuário de teste, e a 2.3
foi validada com esses mesmos usuários). O critério de pronto da 3.1 dizia "a org
criada na 2.3 recebe o seed via chamada manual da função" — instrução impossível de
cumprir. Corrigido no texto da 3.1 neste commit.

### Achado D — MELHORIA FUTURA (nenhum bloqueia a Fase 3)

1. **`app/(app)/layout.tsx` não checa sessão** — a proteção é só do `proxy.ts`. O
   bypass de middleware do Next (CVE-2025-29927) está corrigido nesta major, e o dado
   é protegido por RLS de qualquer forma (sem sessão a query falha, não vaza), então é
   defesa em profundidade, não buraco. Fazer quando o layout já tiver que buscar dado
   do usuário — provavelmente 3.5.
2. **Cookie `active_org_id` é lido e nunca escrito** (`getCurrentOrg()`) — o seletor
   de organização não existe. Não vaza nada (o `find` roda sobre a lista já filtrada
   por RLS), mas é caminho morto até haver usuário com 2+ orgs. Resolver junto do
   seletor, ou remover.
3. **`create_organization` não tem limite por usuário** — qualquer autenticado cria
   organizações sem teto. Sem custo hoje; virar limite quando houver cadastro aberto.
4. **Colisão de `slug` em concorrência** — o `while exists` da RPC não é atômico: duas
   criações simultâneas com o mesmo nome podem estourar a unique. Falha segura (erro,
   não dado errado). Corrigir com retry/`on conflict` se aparecer de verdade.
5. **`slug` permite enumerar tenants** — criar "Acme" e receber `acme-1` revela que
   `acme` existe. Aceitável no MVP.
6. **Ordem entre os `it()` da suíte de RLS** — `orgAId`/`orgBId` são preenchidos num
   teste e usados nos seguintes. Funciona (vitest roda o arquivo em ordem), mas quebra
   se alguém rodar com `--sequence.shuffle` ou isolar um `it`. Migrar para `beforeAll`
   quando a suíte crescer na 6.4.

### [x] 2.5 Autorização por papel em `organizations` (correção do checkpoint)

> feito: `supabase/migrations/0003_organizations_role_policies.sql` aplicada no
> Supabase remoto. Substitui a policy `tenant_isolation` "for all" de
> `sales.organizations` (Achado A do checkpoint) por três policies por papel:
> `tenant_isolation_select` (`select`, por associação — inalterada),
> `owner_admin_update` (`update`, `using` e `with check` por
> `sales.current_org_role(id) in ('owner','admin')`), `owner_delete` (`delete`,
> só `sales.current_org_role(id) = 'owner'`). Sem policy de `insert` — a única
> criação legítima continua sendo a RPC `create_organization`, `security
> definer`, que não passa por RLS.
>
> **Achado B corrigido:** `lib/supabase/middleware.ts` agora captura o `error`
> da consulta a `org_members` e, se houver, não decide o gate de onboarding às
> cegas — não força `/onboarding` (evitaria trancar usuário com org numa
> falha transitória) nem finge saber que ele tem org; deixa a request seguir
> para a rota pedida (a própria página resolve org nula com segurança via
> `getCurrentOrg()`), e só decide um destino (`/today`, best-effort) quando o
> erro acontece saindo de `/login`. Não abre bypass de autenticação nem de
> RLS — é gate de UX, a policy continua sendo quem decide o dado de verdade.
>
> **Suíte estendida** (`tests/rls.test.ts`), describe própria com org e
> usuários isolados do describe da 2.4 para não acoplar ordem entre os dois
> blocos: `member` faz `select` (ok) mas `update`/`delete` bloqueados (D-016 —
> `data === []` com `.select()` encadeado, nome/linha intactos conferidos por
> `clientA`); owner promove B a `admin`; `admin` consegue `update` mas não
> `delete`; `owner` consegue `update` e `delete` (delete usa organização
> descartável própria, não a mesma usada nos casos anteriores); não-membro não
> altera nem apaga org alheia; `insert` direto negado (sem policy de insert);
> `anon` não executa `current_org_role()` (caso que faltava na 2.4).
>
> `npm run test:rls`: **36/36 passam** (24 preservados da 2.4 + 12 novos),
> duas vezes seguidas — idempotente, zero organização residual entre
> execuções (`organizations=0 org_members=0` confirmado por `execute_sql`
> direto).
>
> **Validado, não só assumido:**
> - Replay do zero: `drop schema sales cascade` + reaplicar 0001, 0002 e 0003
>   na ordem → 7 policies (3 em `organizations`), 4 funções, 6 enums, 2
>   tabelas — bate exatamente com o estado vivo pós-migration.
> - `get_advisors(security)`: nenhum alerta novo em `sales` — só os mesmos 3
>   WARN já documentados em D-013 (`authenticated` executa `security
>   definer`); `owner_admin_update`/`owner_delete` não são `security definer`,
>   não geram alerta novo.
> - `anon`: `has_schema_privilege('anon','sales','usage') = false`, zero grant
>   de tabela em `organizations`, confirmado direto no catálogo pós-migration
>   (além dos testes de anon na suíte).
> - `typecheck`/`lint`/`test`/`build` limpos.
>
> Nenhuma decisão permanente nova — D-017 (já registrada no checkpoint) é a
> decisão de contrato; a correção do middleware é implementação da própria
> tarefa, não trade-off novo.
>
> Dois commits: migration sozinha antes de aplicar (`e42af16`), resto depois.
>
> **Não avançado para a Fase 3** — aguardando novo checkpoint/instrução.

<details>
<summary>Texto original da tarefa (referência)</summary>

### [ ] 2.5 Autorização por papel em `organizations` (correção do checkpoint)

`supabase/migrations/0003_organizations_role_policies.sql` — conteúdo exato em
`DATABASE.md` → `sales.organizations`, decisão em **D-017**:

- `drop policy tenant_isolation on sales.organizations`;
- `tenant_isolation_select` (`select`, por associação — comportamento atual mantido);
- `owner_admin_update` (`update`, `using` **e** `with check` por
  `sales.current_org_role(id)`);
- `owner_delete` (`delete`, só `owner`);
- **nenhuma policy de `insert`** — a criação legítima é só pela RPC
  `create_organization`, que é `security definer` e não passa por RLS. Confirmar que
  `create_organization` continua funcionando depois da mudança (é o teste que prova
  que a ausência de policy de insert não quebrou o onboarding).

Corrigir também o Achado B em `lib/supabase/middleware.ts` (tratar o `error` da
consulta de `org_members` em vez de descartá-lo).

Estender `tests/rls.test.ts` — casos novos, seguindo **D-016** (`update`/`delete`
bloqueado por `USING` se prova por `data === []` com `.select()` encadeado, não por
`error`):

- `member` **não** renomeia a organização (0 linhas + nome intacto);
- `member` **não** apaga a organização (0 linhas + org ainda existe);
- `owner` **renomeia** a própria organização (caso positivo — a policy não pode ter
  fechado demais);
- não-membro não renomeia nem apaga a org alheia;
- `insert` direto em `organizations` é negado para membro autenticado;
- `create_organization()` continua criando org + membership `owner` (regressão do
  bootstrap);
- `anon` não executa `current_org_role()` (faltava na lista de anon).

**Pronto quando:** a suíte estendida passa inteira, incluindo os casos positivos;
replay do zero (0001 → 0002 → 0003) funciona; `get_advisors(security)` sem alerta novo;
`DATABASE.md` já atualizado neste checkpoint bate com a migration aplicada.

</details>

---

# FASE 3 — Leads

### [ ] 3.1 Catálogos: fontes e estágios

`supabase/migrations/0004_catalogs.sql`: `lead_sources` e `pipeline_stages` conforme
`DATABASE.md`, com RLS.

- Função `sales.seed_org_defaults(p_org_id uuid)` (`security definer`) criando as 6
  fontes e os 7 estágios padrão.
- Chamar `seed_org_defaults` dentro de `create_organization` (alterar a RPC da 2.2).
- `lib/queries/catalogs.ts`: `listStages()`, `listSources()`.

**Pronto quando:** org nova nasce com 6 fontes e 7 estágios. (Não há org preexistente
para seedar à mão: `organizations` está com 0 linhas — ver Achado C do checkpoint da
Fase 2. A verificação é criar uma org nova pelo onboarding e conferir os catálogos.)

### [ ] 3.2 Contatos e leads (banco)

`supabase/migrations/0005_contacts_leads.sql` conforme `DATABASE.md`, com todos os
índices e RLS. Types regerados.

### [ ] 3.3 Domínio + validação

- `lib/domain/phone.ts`: normaliza telefone BR para E.164 (`normalizePhoneBR`),
  formata para exibição (`formatPhoneBR`). Puro. **Com testes.**
- `lib/domain/money.ts`: centavos ↔ reais, formatação BRL. Puro. **Com testes.**
- `lib/validation/contacts.ts` e `lib/validation/leads.ts`: schemas Zod de create e
  update. `org_id` **nunca** faz parte do schema — vem do servidor.

**Pronto quando:** `npm run test` verde; nenhum arquivo em `lib/domain/` importa
supabase ou next (verificar com grep).

### [ ] 3.4 Actions e queries

- `lib/actions/contacts.ts`: `createContact`, `updateContact`. Padrão: Zod valida →
  `requireOrgId()` → grava → `revalidatePath`.
- `lib/actions/leads.ts`: `createLead`, `updateLead`, `moveStage(leadId, stageId)`.
  `moveStage` grava também uma `activity` do tipo `note` registrando a mudança.
- `lib/queries/contacts.ts`: `listContacts`, `getContact`, `searchContactsByPhone`.
- `lib/queries/leads.ts`: `listLeads` (filtros: estágio, fonte, status, busca
  textual), `getLead`.
- Sem `select *`. Colunas explícitas.

### [ ] 3.5 Tela de leads

`app/(app)/leads/page.tsx` (Server Component) — lista densa conforme
`DESIGN_SYSTEM.md`:

- Colunas: contato, título, estágio (badge), fonte, valor (**mono**), último contato
  (**mono**, relativo: "há 4 dias"), próxima ação.
- Filtros por estágio/fonte/status na URL (search params — é estado de URL, não de
  cliente).
- Estado vazio honesto com botão "Novo lead".
- `app/(app)/leads/[leadId]/page.tsx`: dados do lead, dados do contato, histórico de
  atividades (vem na Fase 4), botões de ação.

### [ ] 3.6 Formulário de lead

- Criação em um passo: se o telefone informado casar com contato existente da org,
  oferece vincular; senão cria contato e lead juntos. **Nunca forçar cadastrar
  contato antes** — atrito mata adoção.
- Campos: nome, telefone, email, empresa (texto), título do lead, interesse, fonte,
  valor potencial, observações. Estágio inicial = `novo`.
- Server Action com Zod, erro de campo exibido inline, sem `alert()`.

**Pronto quando:** dá pra cadastrar um lead real da DevRR de ponta a ponta em menos
de 30 segundos e ele aparece na lista.

---

# FASE 4 — Follow-up

O núcleo do produto. Checkpoint Opus ao final.

### [ ] 4.1 Atividades e regras (banco)

`0006_activities.sql` e `0007_followup_rules.sql` conforme `DATABASE.md`.
Estender `seed_org_defaults` com a sequência padrão (+1d, +3d, +7d em
`proposta_enviada`). Types regerados.

### [ ] 4.2 Regra de próxima ação (domínio puro)

`lib/domain/followup.ts` — **o coração do produto, 100% puro e testado**:

```ts
computeFollowupSchedule(input: {
  enteredStageAt: Date
  rules: FollowupRule[]      // steps ativos do estágio
  timezone: string
  businessHours: BusinessHours
}): Array<{ stepNumber: number; dueAt: Date }>

shouldCancelFollowups(input: {
  leadStatus, respondedAt, stageIsWon, stageIsLost
}): boolean

resolveNextAction(activities: Activity[]): Date | null   // menor due_at pendente
```

Regras a respeitar:
- `dueAt` cai dentro do horário comercial da organização. Sábado/domingo empurram
  para o próximo dia útil. Fora do horário empurra para a abertura seguinte.
- Fuso da organização, não do servidor. **Usar `date-fns` + timezone da org.**
- Nunca agendar no passado: se `enteredStageAt + delay` já passou, agenda para a
  próxima janela útil.

Testes obrigatórios: entrada numa sexta 17h; entrada num sábado; org com fuso
diferente; regra desativada; passo já executado; horário de verão não é problema no
BR hoje mas o teste documenta a premissa.

**Pronto quando:** cobertura da lógica de agendamento e cancelamento; zero import de
supabase/next no arquivo.

### [ ] 4.3 Geração e cancelamento automático

- `lib/actions/activities.ts`: `createActivity`, `completeActivity`, `cancelActivity`,
  `rescheduleActivity`. Toda escrita recalcula `leads.next_action_at` e
  `leads.last_contact_at` via `resolveNextAction`.
- Em `moveStage` (3.4): ao entrar num estágio com regras ativas, gerar os follow-ups
  com `computeFollowupSchedule`. Se já existirem pendentes automáticos para aquele
  estágio, cancelar antes de regerar (idempotência — mover A→B→A não duplica).
- `lib/actions/leads.ts` → `markResponded(leadId)`: grava `responded_at`, cancela
  **todos** os automáticos pendentes, grava `audit_log`, cria atividade de histórico.
- Follow-up manual (`is_auto = false`) **nunca** é cancelado automaticamente.
- `0009_views.sql`: `v_today_actions` e `v_leads_without_action`, ambas com
  `security_invoker = true`. Advisors limpo.

### [ ] 4.4 Tela "Ações de hoje"

`app/(app)/today/page.tsx` — a tela que o usuário abre de manhã. Três blocos:

1. **Atrasado** — pendentes com `due_at < início de hoje`. Faixa `red-400`.
2. **Hoje** — pendentes vencendo hoje. Faixa `amber-400`.
3. **Sem próxima ação** — de `v_leads_without_action`. Faixa `brand-400`.
   Este bloco é a razão de o produto existir: leads abertos que ninguém agendou.

Cada linha segue o componente "Linha de ação" do `DESIGN_SYSTEM.md`. Ações inline:
`Concluir`, `Adiar 1 dia`, `Abrir lead`. Contadores no topo em `font-mono`.
Navegação por teclado ↑↓/Enter.

**Pronto quando:** com 10 leads de teste, a tela mostra os três blocos corretos e as
ações inline funcionam sem recarregar a página inteira.

### [ ] 4.5 Registrar conclusão e resposta

- `Concluir` marca `status='done'`, grava `done_at`, atualiza `last_contact_at`, e
  pergunta se quer agendar a próxima (sugerindo a data do próximo passo da regra).
- Botão `Cliente respondeu` no lead e na linha de ação → `markResponded`.
- Timeline do lead em `/leads/[leadId]`: atividades em ordem decrescente, com
  distinção visual entre feito, pendente e cancelado. Cancelado aparece esmaecido —
  **não some**, porque o histórico de "o sistema ia cobrar mas o cliente respondeu"
  é justamente o que prova o valor.

**Pronto quando:** o fluxo completo do `PRODUCT_SPEC.md` → Definição de pronto roda
ponta a ponta. → **Checkpoint Opus.**

---

# FASE 5 — IA

### [ ] 5.1 Infra de IA

- `0008_ai.sql`: `ai_prompts` e `ai_runs` conforme `DATABASE.md`.
- Portar de `../CRM-RR/lib/ai/`: `gateway.ts` (ajustar para `org_id` e `lead_id`),
  `render-template.ts`, `error-categories.ts`, `schemas.ts`.
- `AI_GATEWAY_API_KEY` no env. Modelo default `anthropic/claude-sonnet-5`.
- `runAiPrompt` deve falhar com mensagem clara e **gravar o erro em `ai_runs`** se a
  chave faltar ou o gateway cair — nunca falhar em silêncio.

### [ ] 5.2 Prompt de follow-up

Seed do prompt `followup_proposta` v1 em `seed_org_defaults`. Contrato:

- **System:** você escreve mensagem curta de WhatsApp em português brasileiro, em nome
  de {{empresa}}. Tom profissional e direto, sem formalidade excessiva, sem emoji
  em excesso, sem "espero que esteja bem". Máximo 3 frases.
  **Você NUNCA inventa preço, prazo, desconto ou condição.** Use exclusivamente os
  dados fornecidos. Se um dado não foi fornecido, não o mencione.
- **Variáveis:** `{{empresa}}`, `{{contato_nome}}`, `{{lead_titulo}}`,
  `{{interesse}}`, `{{valor}}`, `{{dias_desde_ultimo_contato}}`, `{{estagio}}`,
  `{{passo_followup}}`, `{{historico_resumido}}`.
- **Output Zod:** `{ message: string, tone: 'direto'|'consultivo'|'leve', reasoning: string }`.
  `reasoning` é para o usuário entender a escolha, não é enviado ao cliente.
- Passo 1 = lembrete leve. Passo 2 = oferecer ajuda/ajuste. Passo 3 = pergunta de
  encerramento respeitosa ("faz sentido seguir ou prefere retomar mais pra frente?").

### [ ] 5.3 Contexto real do lead

`lib/queries/ai-context.ts`: `buildFollowupContext(leadId)` monta as variáveis a
partir do banco — nome, título, interesse, valor formatado, dias desde o último
contato, estágio, passo, e um resumo das últimas 5 atividades.

**Valor só entra no contexto se `value_cents > 0`.** Enviar "R$ 0,00" faz a IA
escrever bobagem sobre preço. Regra da `PRODUCT_SPEC.md` #1 aplicada na prática.

### [ ] 5.4 Gerar, revisar, usar

- Botão `Gerar mensagem com IA` na linha de ação e no lead.
- Painel de revisão: mensagem gerada em textarea **editável**, com o `reasoning`
  ao lado. Botões: `Copiar`, `Gerar outra versão`, `Usar esta`, `Descartar`.
- `Usar esta` grava o texto em `activities.body`, vincula `ai_run_id`, marca o run
  como `reviewed`. `Descartar` marca `discarded`.
- `Copiar` copia para a área de transferência com feedback visual. **Nada é enviado
  automaticamente no MVP.**
- `0010_audit.sql` + `lib/actions/audit.ts` portado do CRM-RR: registrar
  `create`/`update`/`stage_change`/`cancel_followups`/`ai_used`.

**Pronto quando:** dá pra gerar mensagem para um lead real, editar, copiar, colar no
WhatsApp e marcar como enviada — e o `ai_run` fica registrado com tokens e latência.

---

# FASE 6 — Testes e validação com dados reais

### [ ] 6.1 Seed de demonstração

- `supabase/seed/run.ts` e `purge.ts` (padrão do CRM-RR, via service role):
  1 organização demo, 12 contatos, 18 leads espalhados pelos estágios, atividades
  com datas realistas (algumas atrasadas, algumas hoje, algumas futuras).
- **Tudo com `is_demo = true`.** `purge.ts` remove só `is_demo` — nunca toca em dado
  real. Confirmação explícita antes de rodar purge.

### [ ] 6.2 Testes de fluxo

- Unitários: tudo em `lib/domain/` (`followup`, `phone`, `money`, `next-action`).
- Integração das actions com Supabase de teste: criar lead → mover para
  `proposta_enviada` → 3 follow-ups gerados nas datas certas → `markResponded` →
  os 3 cancelados → `next_action_at` vira null.
- Idempotência: mover A→B→A não duplica follow-up.
- Meta de cobertura: **100% em `lib/domain/`**, 80% no resto.

### [ ] 6.3 Reconciliação de caches

**Antes de escrever a rota (achado B do checkpoint da Fase 1):** excluir `api/cron` do
matcher do `proxy.ts`. Como está, `updateSession` redireciona qualquer request sem
cookie de sessão para `/login` — e a request do Cron da Vercel se autentica por header,
não por cookie. O resultado seria `307` e nenhuma execução, sem erro nenhum no log. O
CRM-RR tem esse defeito hoje. Ver `DECISIONS.md` D-012.

`app/api/cron/reconcile/route.ts`, protegido por `CRON_SECRET` comparado em tempo
constante. Recalcula `next_action_at` e `last_contact_at` de todos os leads abertos e
loga divergências. Roda diário. É a rede de segurança do cache denormalizado
(`DATABASE.md` → nota sobre caches).

### [ ] 6.4 Validar RLS de novo, com tudo pronto

Reexecutar `tests/rls.test.ts` estendido para todas as tabelas criadas nas Fases 3-5,
incluindo `ai_runs` e `audit_logs`. Rodar `get_advisors(type:'security')` e
`get_advisors(type:'performance')`. Resolver todo alerta.

**Pronto quando:** advisors limpos e todos os casos de isolamento passam.

### [ ] 6.5 Uso real

Deploy Vercel (projeto `devrr-sales-ai`, root `devrr-sales-ai/`, env configuradas).
Cadastrar os leads reais da DevRR. Usar por **duas semanas**, todo dia, de verdade.

Registrar atrito em `docs/FIELD_NOTES.md`: o que incomodou, o que faltou, o que
sobrou. Isso vira o backlog real das fases 7+ — mais confiável do que qualquer plano
escrito hoje.

**Pronto quando:** o sistema responde as 6 perguntas da `PRODUCT_SPEC.md` → Definição
de pronto usando dados reais. → **Checkpoint Opus: revisar plano das fases 7+.**

---

# Fases 7+ — pós-MVP (esboço, não especificar ainda)

Deliberadamente sem detalhe. Especificar antes de ter `FIELD_NOTES.md` é escrever
ficção — a Fase 6.5 vai mudar as prioridades.

| Fase | Módulo | Depende de |
|---|---|---|
| 7 | Agendamento + lembretes (Projeto 2 do roadmap) | uso real da Fase 6.5 |
| 8 | Gerador de propostas + PDF (Projeto 3) | catálogo de serviços |
| 9 | Kanban visual (Projeto 4) | volume de leads > 50 |
| 10 | IA conversacional + WhatsApp Cloud API (Projeto 5) | fluxo humano validado |
| 11 | Dashboard comercial (Projeto 6) | 3+ meses de dado real |
| 12 | Assistente interno com documentos (Projeto 7) | independente |

Ordem provável de mudar. A Fase 9 (Kanban) tende a subir se você tiver muitos leads;
a Fase 8 (propostas) tende a subir se propostas manuais virarem o gargalo.
