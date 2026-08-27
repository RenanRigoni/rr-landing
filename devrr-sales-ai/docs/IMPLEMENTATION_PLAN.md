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
| Fase 6 completa | Vale abrir pra uso real? O que muda no plano das fases 8+? |
| Fase 7 completa | O dossiê digital sustenta a prospecção real? Score calibrado? |

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

> **Superado.** A 2.5 fechou o Achado A e o Achado B. Registro histórico —
> o veredito válido é o **checkpoint de fechamento (2026-08-24)** logo abaixo
> da tarefa 2.5.

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

## ✅ Checkpoint Opus — fechamento da Fase 2 (2026-08-24) — **APROVADO**

Revisão curta e dirigida da correção: migration 0003, middleware, suíte de RLS.
**Achado A fechado, Achado B fechado, nenhum BLOQUEANTE restante.**

### Revalidado do zero neste checkpoint (não só lido)

- **Replay real, na ordem, do arquivo:** `drop schema sales cascade` → 0001 → 0002
  → 0003. Resultado: 7 policies (3 em `organizations`), 4 funções, 6 enums, 2 tabelas,
  0 linhas. Bate com o estado vivo anterior — sem drift.
- **Regressão do Achado A provada nos dois sentidos.** Com o schema replayado parando
  em 0002, a simulação SQL (`set local role authenticated` + `request.jwt.claims` do
  usuário B como `member`) reproduziu o defeito original: `update` → **1 linha**,
  `delete` → **1 linha**. Aplicada a 0003 sobre o mesmo schema, a matriz completa saiu
  exatamente como D-017 especifica:

  | papel | operação | esperado | obtido |
  |---|---|---|---|
  | `member` | `select` | 1 linha | 1 ✓ |
  | `member` | `update` | 0 linhas | 0 ✓ |
  | `member` | `delete` | 0 linhas | 0 ✓ |
  | `member` | `insert` direto | erro | `new row violates row-level security policy for table "organizations"` ✓ |
  | `admin` | `update` | 1 linha | 1 ✓ |
  | `admin` | `delete` | 0 linhas | 0 ✓ |
  | `owner` | `update` | 1 linha | 1 ✓ |
  | `owner` | `delete` | 1 linha | 1 ✓ |

- **`npm run test:rls` contra o schema recém-replayado: 36/36 passam** (24 da 2.4 + 12
  da 2.5), zero organização residual depois (`organizations=0`, `org_members=0`).
- **D-016 respeitada:** todos os casos de `update`/`delete` bloqueados por `USING` na
  suíte encadeiam `.select()` e afirmam `data === []`, com conferência independente
  por `clientA` (nome e existência da linha intactos). `expect(error).not.toBeNull()`
  só aparece onde é válido — `insert` e `update` de `org_id` (coberto por `WITH CHECK`).
- **`create_organization()` continua sendo o único caminho de criação** e continua
  funcionando: cria org + membership `owner` na mesma transação (2 testes na suíte),
  e o `insert` direto em `organizations` é negado justamente por não existir policy
  de `insert`.
- **0001 e 0002 intactos** — `git log` confirma que a 2.5 só adicionou
  `0003_organizations_role_policies.sql`; a correção é aditiva, o histórico continua
  reproduzível do zero.
- **`anon` sem nada:** `has_schema_privilege('anon','sales','usage') = false`, zero
  grant de tabela, `execute = false` nas três RPC (`current_org_ids`,
  `current_org_role`, `create_organization`). Confirmado no catálogo, além dos 5
  testes de anon na suíte.
- **`security definer` com grants mínimos e `search_path` seguro:** as 3 funções
  têm `search_path = sales, public` fixo, `revoke all ... from public` +
  `grant execute ... to authenticated`. `fn_set_updated_at` não é `security definer`
  (não precisa ser — roda no contexto do trigger).
- **`get_advisors(security)`:** no schema `sales`, os mesmos 3 WARN já documentados em
  **D-013** e nada mais. `owner_admin_update`/`owner_delete` não introduzem alerta —
  não são `security definer`. Todo o resto é de `public`, de outros projetos no mesmo
  Supabase.
- `typecheck` / `lint` / `test` / `build` limpos; build gera `/`, `/login`,
  `/onboarding`, `/today` + proxy.

### Achado B — revisado e aprovado

`lib/supabase/middleware.ts` agora captura o `error` e não converte falha em
"usuário sem organização". Conferido linha a linha:

- **Não abre bypass de autenticação:** o branch `if (!user)` roda antes e é
  independente do erro — sessão ausente continua indo para `/login` sempre.
- **Não abre bypass de RLS:** o middleware nunca decidiu `org_id`. Quem decide
  continua sendo `getCurrentOrg()`/`requireOrgId()` no servidor, que refazem a
  consulta com RLS aplicada. Deixar a request seguir não abre nenhuma linha que a
  policy não abriria de qualquer forma.
- **É fail-safe:** na falha persistente, `getCurrentOrg()` **lança** em vez de
  devolver `null` — o usuário vê erro honesto, não uma tela que finge que ele não tem
  empresa. E não há laço: erro saindo de `/login` → `/today`; `/today` sem org →
  `/onboarding`; `/onboarding` sob erro passa direto (não é redirecionado de volta).

### D-018 — permanece

É contrato de comportamento, não detalhe de implementação: define o que o gate faz
quando não sabe a resposta, e a alternativa simétrica (`hasOrg = true` no erro) já
está descartada com justificativa. Vale para todo gate futuro de onboarding/seleção
de organização. **Mantida.**

### O que continua aberto (nenhum bloqueia a Fase 3)

Os 6 itens do Achado D do checkpoint anterior seguem válidos e classificados como
**MELHORIA FUTURA**. Um deles ganhou superfície nova e vale a nota: a describe da
2.5 também depende da ordem entre `it()` (a promoção de B para `admin` acontece num
`it()` de setup e os seguintes contam com ela). Mesma classe do item 6 — resolver
junto, na 6.4, migrando para `beforeAll`.

**LIBERADO PARA FASE 3.**

---

# FASE 3 — Leads

### [x] 3.1 Catálogos: fontes e estágios

> feito: `supabase/migrations/0004_catalogs.sql` — `lead_sources` e
> `pipeline_stages` conforme `DATABASE.md`, RLS `tenant_isolation for all`
> padrão (dado operacional, não de governança — D-017 não se aplica). Trigger
> `pipeline_stages_set_updated_at`.
>
> `sales.seed_org_defaults(p_org_id uuid)`, `security definer`, insere as 6
> fontes (`Site`, `WhatsApp`, `Google`, `Instagram`, `Indicação`, `Outro`) e os
> 7 estágios (`novo` → `perdido`, valores de probabilidade exatos da tabela do
> roadmap). **Revogada de `authenticated` e de `public`** — só é chamável de
> dentro de `create_organization` (que roda como dona via `security definer`,
> preserva execução mesmo sem grant explícito). Sem essa revogação, qualquer
> autenticado poderia chamar `seed_org_defaults(org_id_alheio)` e a função,
> ignorando RLS por ser `security definer`, semearia catálogo duplicado em
> organização de outro tenant — mesma classe de risco do Achado A do
> checkpoint da Fase 2, fechada aqui antes de existir.
>
> `create_organization` (0002) alterada via `create or replace` nesta mesma
> migration — chama `perform sales.seed_org_defaults(v_org_id)` ao final,
> mesma transação da criação da org e da membership do owner. `0001`/`0002`/
> `0003` não tocados; `CREATE OR REPLACE FUNCTION` preserva os grants
> existentes de `create_organization` (revogado de `public`, concedido a
> `authenticated`), nenhum grant repetido.
>
> `lib/queries/catalogs.ts`: `listStages()` e `listSources()`, `server-only`,
> via `requireOrgId()` + filtro explícito `org_id` (RLS já isola, o filtro é
> defesa em profundidade e deixa a query auto-explicativa). Colunas explícitas,
> sem `select *`. Tipos em `lib/types/database.types.ts` (`lead_sources`,
> `pipeline_stages`), mantidos à mão pelo mesmo motivo já documentado ali
> (ferramenta de geração automática não introspecta `sales`).
>
> **Validado, não só assumido:**
> - Fluxo real ponta a ponta com client anon autenticado (`rls-test-a`):
>   `create_organization` → org nova nasce com **6 fontes e 7 estágios**
>   exatos, nomes e chaves batendo com `DATABASE.md`.
> - Isolamento: usuário sem membership não vê fontes/estágios de organização
>   alheia (0 linhas via RLS).
> - `seed_org_defaults` chamada direta por usuário autenticado sem ser dono
>   da org: **negada** (`permission denied for function seed_org_defaults`) —
>   prova de que a revogação funciona, não só que existe no arquivo.
> - Replay do zero: `drop schema sales cascade` + reaplicar 0001→0004 na ordem
>   → 4 tabelas, 9 policies, 5 funções, 6 enums — bate com o estado vivo.
> - `npm run test:rls` contra o schema replayado: **36/36 seguem passando**
>   (3.1 não tocou `organizations`/`org_members`, sem regressão esperada nem
>   observada).
> - `get_advisors(security)`: nenhum alerta novo em `sales` — mesmos 3 WARN de
>   D-013. `seed_org_defaults` não aparece (confirma que a revogação de
>   `authenticated` remove o alerta que apareceria se fosse chamável).
> - `anon`: sem grant em `lead_sources`/`pipeline_stages` (herdado do padrão
>   já provado do schema — nada é concedido a `anon` em nenhuma tabela).
> - `typecheck`/`lint`/`test`/`build` limpos. Zero organização residual no
>   banco após toda a validação.
>
> Nenhuma decisão permanente nova para `DECISIONS.md` — a RLS `for all` já é
> o padrão documentado, e a revogação de `seed_org_defaults` é aplicação do
> mesmo princípio de D-013/D-017 (privilégio mínimo em função
> `security definer`), não um trade-off novo.
>
> Dois commits: migration sozinha antes de aplicar, resto depois.
>
> **Não avançado para a 3.2** — aguardando nova instrução.

### [x] 3.2 Contatos e leads (banco)

> feito: `supabase/migrations/0005_contacts_leads.sql` — `contacts` e `leads`
> conforme `DATABASE.md`, todos os índices (`contacts_org_phone_idx`;
> `leads_org_status_next_action_idx`, `leads_org_stage_idx`,
> `leads_org_contact_idx`) e triggers de `updated_at`. RLS `tenant_isolation
> for all` padrão nas duas — dado operacional, D-017 não se aplica (todo
> membro trabalha o funil da empresa, mesma classificação de `lead_sources`/
> `pipeline_stages` na 3.1). Nenhuma função nova, nenhuma superfície de
> `security definer` adicional nesta tarefa.
>
> `0001`-`0004` não tocados. Types em `lib/types/database.types.ts`
> (`contacts`, `leads`, com `Relationships` para `organizations`, `contacts`,
> `lead_sources`, `pipeline_stages`), mantidos à mão pelo mesmo motivo já
> documentado (ferramenta de geração automática não introspecta `sales`).
>
> **Validado, não só assumido, com dois usuários reais (`rls-test-a`/`b`) e
> duas organizações distintas:**
> - A cria contato + lead na própria org: sucede (1 linha cada).
> - A tenta inserir contato com `org_id` da org B: **bloqueado por RLS**
>   (`new row violates row-level security policy for table "contacts"`).
> - B lê `contacts`/`leads` filtrando pela org de A: **0 linhas**, sem erro
>   (RLS filtra, não recusa).
> - B tenta `DELETE` do lead de A **por id direto**, sem passar `org_id` no
>   filtro (tentativa de bypass): **0 linhas afetadas**, sem erro — D-016
>   respeitado na validação (não só nos testes automatizados); lead de A
>   confirmado intacto depois.
> - `anon`: `has_table_privilege` `false` em `contacts` e `leads`.
> - Replay do zero: `drop schema sales cascade` + reaplicar 0001→0005 na
>   ordem → 6 tabelas, 11 policies, 5 funções, 6 enums, 16 índices — bate com
>   o estado vivo.
> - `npm run test:rls` contra o schema replayado: **36/36 seguem passando**
>   (3.2 não tocou tabelas de governança nem de catálogo, sem regressão
>   esperada nem observada).
> - `get_advisors(security)`: nenhum alerta novo em `sales` — mesmos 3 WARN
>   de D-013 (nenhuma função nova criada nesta tarefa).
> - Zero organização/contato/lead residual no banco após toda a validação.
> - `typecheck`/`lint`/`test`/`build` limpos.
>
> Nenhuma decisão permanente nova para `DECISIONS.md` — RLS `for all` em dado
> operacional é o padrão já documentado em D-017/`DATABASE.md`, aplicado aqui
> sem desvio.
>
> Dois commits: migration sozinha antes de aplicar, resto depois.
>
> **Não avançado para a 3.3** — aguardando nova instrução.

### [x] 3.3 Domínio + validação

> feito: `lib/domain/phone.ts` — `normalizePhoneBR` normaliza telefone BR
> (com ou sem DDI, com ou sem máscara) para E.164 (`+55` + 10 ou 11 dígitos
> locais), `null` quando os dígitos não formam número válido; só remove o
> DDI quando o total é 12 ou 13 dígitos (único tamanho inambíguo — evita
> confundir DDI `55` com DDD `55` real, Santa Maria/RS, testado
> explicitamente). `formatPhoneBR` formata para exibição
> (`(11) 98888-7777` celular, `(11) 3333-4444` fixo), devolve o valor
> original sem lançar quando não reconhece o formato. Ambos puros, zero
> import de supabase/next (confirmado por grep).
>
> `lib/domain/money.ts` — `centsToReais`/`reaisToCents` convertem entre a
> unidade de armazenamento (`value_cents`, inteiro) e reais; `formatBRL`
> formata centavos direto como `"R$ 2.500,00"` via `Intl.NumberFormat`.
> Achado ao escrever o teste: o separador entre `R$` e o valor que o
> `Intl.NumberFormat('pt-BR')` desta engine produz é espaço não separável
> (U+00A0), não espaço comum — confirmado byte a byte antes de fixar a
> asserção, para não travar em CI com um literal que parece certo no editor
> mas nunca bate.
>
> `lib/validation/contacts.ts` — `createContactSchema`/`updateContactSchema`
> (Zod). `org_id`, `is_demo` e `created_by` fora do schema — sempre
> resolvidos no servidor, nunca aceitos do cliente (confirmado: enviar
> `org_id` no payload é descartado silenciosamente pelo strip default do
> Zod, não vaza para o objeto validado).
>
> `lib/validation/leads.ts` — `createLeadSchema`/`updateLeadSchema`. Além de
> `org_id`, ficam fora do schema (mesmo motivo, D-006): `status`,
> `last_contact_at`, `next_action_at`, `responded_at`, `closed_at` (cache
> mantido pela camada de actions, não campo de formulário), `is_demo`,
> `created_by`. **`stage_id` também sai do `updateLeadSchema`** (via
> `.omit()`) — decisão de escopo desta tarefa, não do checkpoint: a 3.4
> reserva `moveStage(leadId, stageId)` como action dedicada para transição
> de estágio, que também grava a activity da mudança; se `updateLead`
> aceitasse `stage_id` também existiriam dois caminhos para a mesma mudança,
> um deles pulando esse registro. `stage_id` continua obrigatório em
> `createLeadSchema` (coluna `not null`, mesmo padrão de `createDealSchema`
> no CRM-RR).
>
> **Validado, não só assumido:**
> - `npm run test`: **32/32** (`tests/domain/phone.test.ts` 19,
>   `tests/domain/money.test.ts` 13) — positivos, negativos e casos-limite
>   (string vazia, tamanho errado, DDI vs. DDD ambíguo, arredondamento de
>   ponto flutuante, valor negativo formatado). Nenhum teste depende de
>   ordem entre `it()` — cada um monta seu próprio input.
> - `grep` em `lib/domain/`: zero import de `supabase` ou `next`.
> - Verificação direta (fora da suíte, script descartável): `org_id` e
>   `stage_id` (no update) enviados no payload são descartados pelo Zod sem
>   erro e sem aparecer no objeto validado; `value_cents` negativo e
>   `full_name`/`title` vazios são rejeitados; `contact_id` não-uuid é
>   rejeitado; defaults (`value_cents=0`, `currency='BRL'`) aplicados quando
>   omitidos.
> - `typecheck`/`lint`/`build` limpos. Nenhuma migration nesta tarefa —
>   `test:rls` não roda (banco/RLS não tocados) e `0001`-`0005` seguem
>   intactos.
>
> Nenhuma decisão permanente nova para `DECISIONS.md` — a exclusão de
> `stage_id` do update é escopo de arquitetura já implícito na separação
> `updateLead`/`moveStage` da 3.4 (`IMPLEMENTATION_PLAN.md`), não um
> trade-off novo sendo introduzido aqui.
>
> Um commit (sem migration nesta tarefa).
>
> **Não avançado para a 3.4** — aguardando nova instrução.

<details>
<summary>Texto original da tarefa (referência)</summary>

### [ ] 3.3 Domínio + validação

- `lib/domain/phone.ts`: normaliza telefone BR para E.164 (`normalizePhoneBR`),
  formata para exibição (`formatPhoneBR`). Puro. **Com testes.**
- `lib/domain/money.ts`: centavos ↔ reais, formatação BRL. Puro. **Com testes.**
- `lib/validation/contacts.ts` e `lib/validation/leads.ts`: schemas Zod de create e
  update. `org_id` **nunca** faz parte do schema — vem do servidor.

**Pronto quando:** `npm run test` verde; nenhum arquivo em `lib/domain/` importa
supabase ou next (verificar com grep).

</details>

### [x] 3.4 Actions e queries

> feito: `lib/actions/contacts.ts` (`createContact`, `updateContact`) e
> `lib/actions/leads.ts` (`createLead`, `updateLead`,
> `moveStage(leadId, stageId)`), todas `'use server'`, padrão Zod valida →
> `requireOrgId()` → grava → `revalidatePath`. `lib/queries/contacts.ts`
> (`listContacts`, `getContact`, `searchContactsByPhone`) e
> `lib/queries/leads.ts` (`listLeads` com filtros de estágio/fonte/status/
> busca textual, `getLead`), `server-only`, mesmo padrão de
> `lib/queries/catalogs.ts` (3.1). Sem `select *` em nenhum arquivo novo
> (conferido por grep).
>
> **Achado 1 — `cookies()` não roda em vitest puro, actions ganharam núcleo
> testável separado.** `createClient()`/`requireOrgId()` dependem de
> `next/headers`, que lança `cookies was called outside a request scope`
> fora de uma request real do Next — confirmado tentando antes de decidir
> a estrutura, não hipótese. Sem separação, só dava para testar mockando o
> Supabase, o que não prova isolamento nenhum (mesmo argumento do
> `README.md` para não mockar RLS). Toda action virou um par de arquivos:
> `lib/actions/contacts-core.ts`/`lib/actions/leads-core.ts` (sem
> `'use server'`, recebem `supabase` e `orgId` já resolvidos como
> parâmetro — toda a lógica de verdade mora aqui) e
> `lib/actions/contacts.ts`/`lib/actions/leads.ts` (`'use server'`, só
> resolvem `orgId`/`supabase` e delegam). Build (`next build`) confirmado
> limpo com o split — o compilador de Server Actions não reclama porque o
> parâmetro não-serializável (`SupabaseClient`) nunca fica num arquivo com
> `'use server'`. Decisão registrada em **D-020**.
>
> **Achado 2 — FK não garante organização.** `leads.contact_id`/`source_id`/
> `stage_id` são FKs simples (migration 0005): garantem que a linha existe,
> não que existe na mesma organização do lead. RLS de `leads` filtra só
> `leads.org_id` — nada impede, a nível de banco, um `insert`/`update`
> apontando `stage_id` de outro tenant. `lib/actions/leads-core.ts` ganhou
> `belongsToOrg()`, chamada para `contact_id`/`stage_id`/`source_id` em
> todo `create`/`update` que os recebe, antes de gravar. Testado com id
> real de outra organização (não só uuid mal formado — esse só prova
> formato, não prova a checagem de tenant). **D-020**, nota espelhada em
> `DATABASE.md` → `sales.leads`.
>
> **`updateLead` não aceita `stage_id`** (herdado do schema da 3.3, via
> `.omit()`) — único caminho de mudança de estágio é `moveStage`. Testado
> enviando `stage_id` no payload de `updateLead`: é descartado, o lead
> permanece no estágio original.
>
> **`moveStage` registra a mudança de estágio; a activity de registro fica
> pendente de propósito** — `sales.activities` só existe a partir de
> `supabase/migrations/0006_activities.sql` (tarefa 4.1, Fase 4), ainda não
> aplicada. `moveStageCore` já isola a transição nesta única função; quando
> 0006 existir, o insert de activity entra ali, sem mudar contrato nem abrir
> segundo caminho de mudança de estágio. Não é lacuna nova — está comentado
> no código e é consequência direta de a Fase 4 não ter começado, não desta
> tarefa ter deixado algo pela metade.
>
> Nenhuma action usa `service_role` (conferido por grep em `lib/actions/`);
> todas usam o client autenticado real via `createClient()`. `org_id` nunca
> aceito do cliente — nem via Zod (3.3 já excluía), nem via parâmetro solto
> (as `-core` recebem `orgId` só de quem já resolveu via `requireOrgId()`
> ou do fixture de teste, nunca do payload).
>
> **Testes** — `tests/actions/contacts.test.ts` (10) e
> `tests/actions/leads.test.ts` (18), chamando as funções `*Core` direto
> com clients reais autenticados (`tests/helpers/rls-fixtures.ts`, mesmos
> dois usuários e mesma técnica de `tests/rls.test.ts`), cobrindo create/
> update válidos, payload inválido, `value_cents` negativo, `contact_id`/
> `stage_id`/`source_id` de outra organização (create e update), tentativa
> de enviar `org_id` no payload, tentativa de mudar `stage_id` por
> `updateLead`, `moveStage` válido, `moveStage` para estágio de outra
> organização, `moveStage` de lead de outra organização, lead/contato
> inexistente, ids mal formados. Cada `it()` monta seu próprio dado (cria
> contato/lead do zero quando precisa) — não depende de ordem entre testes
> além do `beforeAll` compartilhado de organização/estágios/fonte.
>
> **Achado 3 — arquivos da mesma suíte rodando em paralelo corrompiam
> estado um do outro.** Adicionar `tests/actions/*.test.ts` a
> `vitest.rls.config.ts` (ao lado de `tests/rls.test.ts`) fez os dois
> usuários reais compartilhados (`rls-test-a/b`) colidirem: o paralelismo
> padrão de arquivo do Vitest roda os arquivos ao mesmo tempo, e um arquivo
> apagava organização que o outro ainda estava usando — `tests/rls.test.ts`
> **inalterado** passou a falhar de forma instável só por rodar ao lado de
> `tests/actions/leads.test.ts`. Corrigido com `fileParallelism: false` em
> `vitest.rls.config.ts`. Registrado em **D-020** como regra para toda
> suíte futura que reusar os mesmos dois usuários.
>
> **Validado, não só assumido:**
> - `npm run test:rls`: **64/64** (36 de `tests/rls.test.ts`, preservados,
>   + 18 de `tests/actions/leads.test.ts` + 10 de
>   `tests/actions/contacts.test.ts`), rodado duas vezes seguidas —
>   nenhuma flakiness, zero organização/contato/lead residual depois
>   (`organizations=0`, `contacts=0`, `leads=0`, confirmado por
>   `execute_sql` direto).
> - `npm run test` (suíte rápida, sem rede): continua **32/32**, só domínio
>   — confirmado que os testes de actions ficaram fora dela
>   (`vitest.config.ts` ganhou `tests/actions/**/*.test.ts` no `exclude`).
> - Sem migration nesta tarefa — `0001`-`0005` intactos.
> - `typecheck`/`lint`/`build` limpos.
>
> Uma decisão permanente nova: **D-020** (núcleo de action testável
> separado do `'use server'`; checagem de organização em toda referência
> relacionada; `fileParallelism: false` na suíte real). `DATABASE.md`
> ganhou nota espelhada em `sales.leads` apontando pra ela.
>
> Um commit (sem migration nesta tarefa).
>
> **Não avançado para a 3.5** — aguardando nova instrução.

### [x] 3.5 Tela de leads

> feito: `app/(app)/leads/page.tsx` (Server Component) — tabela densa (não
> div-grid: dado tabular de verdade, web/coding-style pede semântico
> primeiro) com as 7 colunas do spec: contato (nome + telefone em
> `font-mono`), título, estágio (`StageBadge`), fonte, valor (`font-mono`,
> `formatBRL`), último contato (`font-mono`, relativo — `formatRelativeDateBR`),
> próxima ação (idem, futuro). Campo nulo em qualquer coluna mostra `—`, não
> dado inventado (PRODUCT_SPEC.md regra 5). Filtros de estágio/fonte/status
> são só `<Link>` pra search params diferentes — zero `'use client'` na
> lista, estado é mesmo de URL. Estágio filtra por `key` (estável, não uuid
> — DATABASE.md já chama `key` de "estável pra código"), fonte/status por
> `id`/valor do enum. Filtro sem resultado mostra mensagem leve +
> "Limpar filtros"; zero lead na organização (sem filtro nenhum) mostra o
> empty-state completo do `DESIGN_SYSTEM.md` com botão "Novo lead"
> (`/leads/new` — rota que a 3.6 vai criar; o link já aponta pra lá, nada do
> formulário da 3.6 foi construído aqui).
>
> `app/(app)/leads/[leadId]/page.tsx` — dados do lead (valor, fonte, status,
> último contato, próxima ação, interesse quando houver), dados do contato,
> seção "Histórico" com texto honesto ("Histórico de atividades chega na
> Fase 4" — `sales.activities` não existe até a migration 0006, tarefa 4.1)
> em vez de fingir que a seção existe. `notFound()` (next/navigation) para
> lead inexistente ou de outra organização — `getLeadForDisplay()` já filtra
> por `org_id` (RLS + filtro explícito, mesmo padrão de sempre), `null`
> vira 404 de verdade, testado no browser.
>
> **"Botões de ação"** do spec: `StageMover` (`components/leads/StageMover.tsx`),
> único Client Component da tarefa — precisa de estado local (pending/erro)
> pra chamar `moveStage(leadId, stageId)` direto (dois argumentos
> posicionais, não dá pra ser `<form action>`). Nenhuma regra de negócio no
> componente: ele só chama a Server Action e mostra o que ela devolve;
> validação/pertencimento à organização/a mudança em si vivem inteiramente
> em `lib/actions/leads-core.ts` (D-020), sem duplicação. `router.refresh()`
> após sucesso — testado no browser: estágio muda, badge atualiza, botão do
> novo estágio atual fica desabilitado, banco confirmado por SQL direto.
>
> `lib/queries/leads.ts` ganhou `listLeadsForDisplay()`/`getLeadForDisplay()`
> — junta lead + contato + estágio + fonte via três `select` explícitos
> filtrados por `org_id`, não embedded select do postgrest-js (risco de
> tipagem não confiável com types mantidos à mão — **D-021**). `lib/domain/date.ts`
> (`formatRelativeDateBR`) é wrapper fino sobre `date-fns` (`formatDistance`,
> locale `ptBR`), mesmo par que o CRM-RR já usa — **D-021** também documenta
> o achado real de teste: a locale usa "cerca de" em alguns baldes (horas,
> anos) e não em outros (dias, meses), não dava pra adivinhar. `lib/utils/cn.ts`
> portado do CRM-RR (`ARCHITECTURE.md` já previa, tabela de port 1:1).
> `components/ui/StageBadge.tsx` conforme o spec exato de "Badge de
> estágio" — hoje sempre no fallback neutro, porque nenhum estágio semeado
> tem `color` (só via configuração futura).
>
> `lib/navigation.ts`: "Leads" entrou no menu (`Sidebar.tsx` já dizia "item
> só aparece quando o módulo existe de verdade" — agora existe).
>
> **Validado no browser, não só por typecheck/build** — subi
> `next dev`, logei como `rls-test-a` de verdade, criei organização pelo
> onboarding, semeei 2 contatos + 2 leads (estágios/valores/datas
> diferentes) direto no banco pra popular a tela:
> - Lista renderiza as 7 colunas certas, valor/telefone em mono, "há 4 dias"
>   batendo com o exemplo literal do `DESIGN_SYSTEM.md`, campos nulos como
>   `—`.
> - Filtro por estágio (`?stage=proposta_enviada`) reduz a lista
>   corretamente; outros grupos de filtro preservam o parâmetro já ativo na
>   própria URL do link (`?stage=proposta_enviada&source=...`).
> - Filtro sem match mostra "Nenhum lead encontrado com esses filtros" +
>   "Limpar filtros", não o empty-state grande.
> - Detalhe do lead renderiza todos os campos; `StageMover` move
>   "Proposta enviada" → "Negociação" de verdade — badge, botão desabilitado
>   e banco (`select stage_id` direto) todos confirmam a mudança.
> - `/leads/<uuid inexistente>` devolve 404 de verdade.
> - Dado de QA removido do banco depois (`organizations=0` confirmado).
>
> **Validado também por typecheck/lint/test/test:rls/build** — sem
> regressão: `test:rls` continua **64/64**, suíte rápida **44/44** (12 novos
> de `tests/domain/date.test.ts`). Sem `select('*')` em nenhum arquivo novo
> (grep). Nenhum componente importa `@/lib/supabase`/`createClient` (grep).
> Sem migration nesta tarefa — `0001`-`0005` intactos.
>
> Duas decisões permanentes novas, ambas em **D-021**: `date-fns`/`ptBR`
> como padrão pra data relativa; join de exibição em queries explícitas
> (não embedded select) enquanto os types de `sales` forem mantidos à mão.
>
> Um commit.
>
> **Não avançado para a 3.6** — aguardando nova instrução.

### [x] 3.6 Formulário de lead

> feito: `lib/validation/lead-intake.ts` (`leadIntakeSchema`) reaproveita
> campo a campo `createContactSchema`/`createLeadSchema` (`.shape.*`, D-020
> em espírito — reusa validação já existente em vez de duplicar regra) e
> soma só o que é próprio deste fluxo: `value_reais` (usuário digita reais,
> não centavos — conversão via `lib/domain/money.ts` `reaisToCents` no core,
> não no schema), `contact_id`/`force_new_contact` (decisão de
> vincular/criar mesmo assim).
>
> `lib/actions/lead-intake-core.ts` (`createLeadIntakeCore`): sem telefone
> informado ou telefone novo na organização, cria contato + lead juntos.
> Telefone batendo com contato existente → devolve `status: 'duplicate'`
> com os dados do contato, **sem gravar nada** — nunca força vincular nem
> força cadastrar contato separado antes. Reusa `belongsToOrg()` de
> `lib/actions/leads-core.ts` (exportada nesta tarefa) para `contact_id`
> (inclusive o enviado de volta pelo botão "Vincular a este contato" — id
> vindo do navegador, revalidado igual qualquer outro, D-020) e `source_id`.
> Estágio inicial é sempre a `pipeline_stage` de `key = 'novo'` da
> organização atual, resolvida no servidor — não existe campo de estágio
> nesta tela. `lib/actions/lead-intake.ts` (`'use server'`) resolve
> `orgId`/`supabase`/`user`, delega pro core, e só no sucesso chama
> `revalidatePath('/leads')` + `redirect('/leads/{id}')` (mesmo padrão já
> usado em `lib/actions/orgs.ts` → `createOrganization`).
>
> `components/leads/NewLeadForm.tsx` + `app/(app)/leads/new/page.tsx`
> (Server Component, só busca `listSources()` da organização atual e passa
> como prop — fontes vêm sempre do servidor, nunca hardcoded no cliente).
> Um único formulário: nome, telefone, e-mail, empresa, título, interesse,
> fonte, valor potencial (R$), observações. Erro exibido inline
> (`state.error`), sem `alert()`. Quando o telefone bate com um contato
> existente, uma faixa aparece com dois botões — "Vincular a este contato"
> (reenvia com `contact_id`) e "Criar contato novo mesmo assim" (reenvia com
> `force_new_contact`) — cada um usando `name`/`value` do próprio `<button
> type="submit">`, sem JS extra pra decidir o que mandar.
>
> **Achado real testado no browser, motivo de D-022:** com inputs não
> controlados (padrão do resto do projeto, `OnboardingForm`), o React 19
> reseta todo campo do formulário depois de qualquer chamada de
> `useActionState` que não lança — inclusive quando a action só devolve
> `status: 'duplicate'` sem erro. Confirmado por screenshot antes de
> corrigir: nome/título/e-mail/etc. voltavam vazios bem no momento em que o
> usuário precisa decidir vincular ou criar mesmo assim. Corrigido trocando
> os inputs para controlados (estado local `values` + `onChange`) — decisão
> registrada em **D-022**, com a regra geral de quando controlado > não
> controlado neste projeto.
>
> **Testes** — `tests/actions/lead-intake.test.ts` (10), mesmo padrão de
> `tests/actions/leads.test.ts` (chama a `*Core` direto com clients reais
> autenticados): cria contato+lead sem telefone; cria contato+lead com
> telefone novo (confere `value_cents` calculado a partir de `value_reais`);
> telefone repetido devolve `duplicate` sem gravar nada; reenvio com
> `contact_id` vincula sem duplicar contato; reenvio com
> `force_new_contact` cria um segundo contato de propósito; payload
> inválido (título vazio); `value_reais` negativo; `source_id` de outra
> organização (nada criado); `contact_id` de outra organização enviado
> direto — tentativa de mass assignment (nada criado); `org_id` enviado no
> payload é ignorado.
>
> **Validado no browser, não só por typecheck/build** — subi `next dev`,
> logei como `rls-test-a`, criei organização nova pelo onboarding (a
> anterior da 3.5 já tinha sido limpa): cadastrei lead com telefone novo
> (valor `R$ 2.500,50` calculado certo, redirecionou pro detalhe do lead
> criado); reenviei outro cadastro com o mesmo telefone → faixa de
> duplicata apareceu com os campos digitados intactos (prova visual do
> achado/fix de D-022); cliquei "Vincular a este contato" → lead novo, **1
> contato só** (`select count(*)` direto no banco); repeti o fluxo e cliquei
> "Criar contato novo mesmo assim" → **2 contatos** com o mesmo telefone,
> confirmado por SQL direto; lista `/leads` mostra os 3 leads criados com
> os dados certos. Dado de QA removido depois (`organizations=0
> contacts=0 leads=0` confirmado).
>
> **Validado também por typecheck/lint/test/test:rls/build** — sem
> regressão: `test:rls` **74/74** (64 preservados + 10 novos), rodado duas
> vezes seguidas, zero organização/contato/lead residual entre execuções.
> Suíte rápida continua **44/44** (esta tarefa não mexeu em `lib/domain/`).
> Sem `select('*')` em nenhum arquivo novo (grep). Nenhum componente
> importa `@/lib/supabase`/`createClient` (grep). Nenhuma action usa
> `service_role` (grep). `get_advisors(security)`: nenhum alerta novo no
> schema `sales` — sem migration nesta tarefa, `0001`-`0005` intactos.
>
> Uma decisão permanente nova: **D-022** (dedupe por telefone sugere, nunca
> força; inputs controlados quando o mesmo formulário pode reprocessar
> mais de uma vez sem navegar).
>
> Dois commits: código + testes, depois docs.
>
> **Não avançado além da 3.6** — aguardando nova instrução.

<details>
<summary>Texto original da tarefa (referência)</summary>

### [ ] 3.6 Formulário de lead

- Criação em um passo: se o telefone informado casar com contato existente da org,
  oferece vincular; senão cria contato e lead juntos. **Nunca forçar cadastrar
  contato antes** — atrito mata adoção.
- Campos: nome, telefone, email, empresa (texto), título do lead, interesse, fonte,
  valor potencial, observações. Estágio inicial = `novo`.
- Server Action com Zod, erro de campo exibido inline, sem `alert()`.

**Pronto quando:** dá pra cadastrar um lead real da DevRR de ponta a ponta em menos
de 30 segundos e ele aparece na lista.

</details>

---

## ✅ Checkpoint Opus — fim da Fase 3 (2026-08-24) — **APROVADO** (correções fechadas na 3.7)

> **Fase 3 encerrada.** Os dois achados abaixo foram corrigidos na tarefa 3.7 e
> reauditados por execução independente — ver "Reauditoria da 3.7" no fim desta
> seção. **LIBERADO PARA FASE 4.**

Revisão de 3.1 → 3.6: migrations 0004/0005, catálogos, contatos, leads, domínio,
validação, actions, queries, as três telas e as suítes de teste.
**Isolamento multi-tenant está correto e provado. Nenhum BLOQUEANTE.** Dois achados
IMPORTANTES, ambos de correção pequena, ambos com custo que cresce se a Fase 4
começar antes.

### Revalidado por execução neste checkpoint (não só lido)

- **Replay real do zero:** `drop schema sales cascade` → 0001 → 0002 → 0003 → 0004
  → 0005, na ordem, direto dos arquivos. Resultado idêntico à baseline anterior:
  **6 tabelas, 11 policies, 5 funções, 6 enums, 16 índices, 4 triggers.** Sem drift.
- **`npm run test:rls` contra o schema recém-replayado: 74/74** (36 de `rls.test.ts`
  + 18 leads + 10 contacts + 10 lead-intake). Zero resíduo depois
  (`organizations=0 contacts=0 leads=0 org_members=0`).
- `typecheck` / `lint` / `test` (44/44) / `build` limpos. Build gera `/leads`,
  `/leads/[leadId]`, `/leads/new` como dinâmicas.
- **`seed_org_defaults` não é executável por `authenticated` nem por `anon`**
  (`has_function_privilege` = false nos dois) — a revogação da 3.1 se sustenta no
  estado vivo, não só no arquivo. Ela também **não aparece** no `get_advisors`,
  que é a confirmação independente de que não está exposta via PostgREST.
- **`get_advisors(security)`:** no schema `sales`, exatamente os 3 WARN já
  documentados em **D-013** (`create_organization`, `current_org_ids`,
  `current_org_role`). Nenhum alerta novo. Todo o resto é do schema `public`, de
  outro produto no mesmo projeto Supabase.
- **`anon` sem nada:** `has_schema_privilege('anon','sales','usage') = false`; zero
  `select` em todas as 6 tabelas; `execute = false` nas RPC.
- **Todas as 6 tabelas com RLS ligada** e a contagem de policies exata do desenho
  (organizations 3, org_members 4, e 1 `tenant_isolation` em cada tabela
  operacional — `lead_sources`, `pipeline_stages`, `contacts`, `leads`).
- **Types à mão × schema real: zero drift.** Comparação coluna a coluna, nas 6
  tabelas, entre `lib/types/database.types.ts` e `information_schema.columns` —
  mesmos nomes, mesma ordem. A estratégia de manter os types à mão (limitação
  documentada do gerador) se sustentou por 5 migrations.
- **`0001`–`0005` intactos:** `git log` por arquivo confirma que cada migration só
  foi tocada pelo próprio commit de criação. Nenhuma tarefa da 3.3 → 3.6 alterou
  migration existente. Histórico continua reproduzível.
- **Camadas (grep):** zero import de `@/lib/supabase`/`createClient` em
  `components/` e `app/`; zero `select('*')` em código de produção; `lib/domain/`
  sem import de supabase/next; `service_role` só em `lib/env.server.ts` e
  `lib/supabase/admin.ts` — e `createAdminClient()` **não é chamado em lugar
  nenhum** do app (só existirá para os seeds da 6.1).
- **`stage_id` tem um único caminho de alteração.** Grep em todo `lib/actions/`:
  três escritas ao todo — duas são `INSERT` de criação com valor resolvido no
  servidor (`createLeadCore` valida por `belongsToOrg`; `createLeadIntakeCore`
  resolve pela `key = 'novo'`, sem campo de estágio no formulário) e **um único
  `UPDATE`, em `moveStageCore`**. `updateLeadSchema` remove `stage_id` via
  `.omit()`, provado por teste.

### Aderência a PRODUCT_SPEC / ARCHITECTURE — confere

`org_id` nunca vem do cliente (Zod faz `strip`, provado por teste em três actions
diferentes); toda referência relacional passa por `belongsToOrg()` antes de gravar
(**D-020**), testada com id real de outra organização, não só uuid inválido;
wrapper fino + `*-core` testável em todas as quatro actions; `revalidatePath` só nos
wrappers; nenhum componente fala com Supabase; regra de negócio fora dos Client
Components (`StageMover` e `NewLeadForm` só chamam a action e mostram o retorno);
campo nulo aparece como `—`, sem dado inventado (regra 5 do PRODUCT_SPEC).

**D-021 revisada e mantida.** `attachDisplayData()` usa `.in(ids)` — o número de
queries **não cresce com o número de leads**. Não há N+1 na Fase 3: é 1 query de
leads + no máximo 3 de dados relacionados, para qualquer tamanho de lista.

**D-022 revisada e mantida.** Inputs controlados são a solução adequada: o reset
automático do React 19 em `useActionState` acontece em toda action que não lança, e
o retorno `duplicate` é exatamente um retorno que não lança. A alternativa
(`defaultValue` + `key`) exigiria ecoar os valores digitados de volta pelo servidor
só para remontar o mesmo formulário — mais estado na rede pelo mesmo resultado.

### Achado A — IMPORTANTE · a deduplicação de telefone morre em silêncio depois do primeiro "criar mesmo assim"

`lib/actions/lead-intake-core.ts` procura contato duplicado com
`.eq('phone', phone).maybeSingle()` — **sem `.limit(1)`** — e **descarta o `error`**:

```ts
const { data: existing } = await supabase
  .from('contacts').select('id, full_name, phone')
  .eq('org_id', orgId).eq('phone', phone)
  .maybeSingle()          // <- 2+ linhas = erro PGRST116, data = null
if (existing) { /* ... */ }
```

Quando existem **dois ou mais** contatos com o mesmo telefone, `maybeSingle()`
devolve erro e `data = null`. Com o `error` descartado, o código lê `null` como
"não existe duplicata" e segue criando mais um contato — sem avisar ninguém.

E dois contatos com o mesmo telefone **não são um estado anormal**: é exatamente o
que o botão "Criar contato novo mesmo assim" produz, por decisão deliberada de
**D-022**. O índice `contacts_org_phone_idx` é não-único justamente para permitir
isso. Ou seja, o próprio caminho feliz do produto desarma a deduplicação.

**Provado, não suposto.** Teste descartável contra o Supabase real (removido depois,
zero resíduo):

| passo | ação | esperado | obtido |
|---|---|---|---|
| 1 | cadastro com telefone novo | cria | cria ✓ |
| 2 | mesmo telefone + "criar mesmo assim" | 2 contatos | 2 contatos ✓ |
| 3 | mesmo telefone, **sem** force | `duplicate` | **`success`** — 3º contato criado, sem aviso |

**Risco concreto:** a partir do segundo contato num telefone, todo cadastro futuro
naquele número cria um contato novo silenciosamente. Os leads do mesmo cliente se
espalham por contatos diferentes, e "qual é o contato certo" deixa de ter resposta.
Não é perda de dado nem falha de isolamento — é degradação silenciosa da qualidade
do dado, a mesma classe do Achado B da Fase 2 (erro engolido virando decisão
errada). A Fase 10 (match do webhook de WhatsApp por telefone) depende exatamente
desse lookup.

**Correção mínima:** trocar por `.limit(1).maybeSingle()` — que é o padrão já usado
corretamente em `lib/supabase/middleware.ts` — e **tratar o `error`** em vez de
descartá-lo (na dúvida, falhar visível, nunca seguir como se não houvesse
duplicata). Responsável: **tarefa 3.7**.

### Achado B — IMPORTANTE · a mesma consulta de organização roda 4 vezes por render

Cada `requireOrgId()` chama `getCurrentOrg()`, que faz um
`select id, name, slug, timezone from organizations`. Em `/leads` isso acontece
**quatro vezes** no mesmo render, com resultado idêntico:

| origem | chamadas a `requireOrgId()` |
|---|---|
| `listStages()` | 1 |
| `listSources()` | 1 |
| `listLeadsForDisplay()` | 1 |
| └ `listLeads()`, chamada por ela | 1 |

Total em `/leads`: **10 queries, 4 delas a mesma**. Em `/leads/[leadId]`: 8, 3 delas
a mesma. Mais a consulta de `org_members` do middleware em toda request (**D-014**,
já aceita).

**Não é N+1** — não cresce com o número de leads. É redundância constante, e por
isso não estava visível nos testes.

**Por que agora e não como melhoria futura:** a Fase 4 acrescenta a tela "Ações de
hoje" com três blocos e as duas views novas, mais `lib/queries/activities.ts` — cada
função nova herda o mesmo padrão de resolver a organização por conta própria. O
custo de corrigir hoje é **uma linha**; depois da Fase 4 é auditar todas as funções
de query de novo.

**Correção mínima:** envolver `getCurrentOrg` em `cache()` do React (React 19 já é
dependência), que dedupa por request:

```ts
import { cache } from 'react'
export const getCurrentOrg = cache(async (): Promise<CurrentOrg | null> => { /* ... */ })
```

Sem mudar nenhuma assinatura, sem tocar em quem chama. Responsável: **tarefa 3.7**.

### Melhoria futura (nenhuma bloqueia a Fase 4)

1. **`app/(app)/layout.tsx` continua sem checar sessão** — item 1 do Achado D da
   Fase 2, que apontava a 3.5 como lugar provável. Não foi feito. Segue sendo defesa
   em profundidade (o `proxy.ts` protege e a RLS decide o dado), não buraco. Fazer
   quando o layout precisar buscar dado do usuário.
2. **Erro do formulário é geral, não por campo.** O texto da 3.6 pedia "erro de campo
   exibido inline"; o que existe é `parsed.error.issues[0]?.message` exibido junto ao
   formulário. Atende o espírito (inline, sem `alert()`), não a letra (o campo
   culpado não é destacado). Revisitar quando houver formulário maior.
3. **"Vincular a este contato" descarta em silêncio o nome/e-mail/empresa digitados**
   — comportamento correto (vincular = usar o contato que já existe), mas o usuário
   não é avisado de que o que ele digitou não será gravado.
4. Itens ainda válidos do Achado D da Fase 2: ordem entre `it()` em `rls.test.ts`
   (resolver na 6.4), cookie `active_org_id` lido e nunca escrito, `create_organization`
   sem limite por usuário, colisão de slug sob concorrência, slug enumerável.

### Questão aberta resolvida

**Q-001** ("um contato pode ter vários leads simultâneos abertos? a UI incentiva ou
alerta?") estava marcada para decidir "na Fase 3.5, com dado real" e não foi
decidida em nenhuma tarefa. O comportamento implementado na 3.6 já responde na
prática: o fluxo de duplicata oferece "Vincular a este contato", que cria um lead
novo para um contato que já tem lead — sem alerta. **Decisão registrada em D-023:**
permitir, sem alerta.

### Veredito

Fase 3 está **arquiteturalmente aprovada**: multi-tenancy correto e provado,
`organization_id` nunca vindo do cliente, ids relacionados validados contra o
tenant, caminho único para `stage_id`, camadas respeitadas, migrations replayáveis,
74/74 verdes contra schema recriado do zero.

**Antes de iniciar a 4.1, executar a tarefa 3.7** (Achados A e B). São correções
pequenas e localizadas, e as duas ficam mais caras se a Fase 4 começar antes.

> **Atualização (2026-08-24, após a 3.7): as duas correções foram entregues e
> reauditadas por execução independente. Fase 3 encerrada — LIBERADO PARA FASE 4.**
> Detalhe da reauditoria no fim desta seção.

### [x] 3.7 Correções do checkpoint da Fase 3

> feito: **Achado A** — `lib/actions/lead-intake-core.ts`, busca do contato
> duplicado ganhou `.limit(1)` antes de `.maybeSingle()` (mesmo padrão já
> correto em `lib/supabase/middleware.ts`) e o `error` da consulta passou a
> ser checado explicitamente: em falha, devolve `status: 'error'` visível,
> nunca mais interpreta erro como "sem duplicata". Antes da correção, 2+
> contatos no mesmo telefone (estado legítimo — é exatamente o que o botão
> "Criar contato novo mesmo assim" produz, D-022/D-023) fazia
> `.maybeSingle()` devolver `PGRST116`; com o `error` descartado, `existing`
> virava `null` e todo cadastro seguinte naquele telefone criava mais um
> contato em silêncio, sem nunca mais avisar.
>
> **Achado B** — `lib/queries/orgs.ts`, `getCurrentOrg` envolvida em
> `cache()` do React. Assinatura, corpo e comportamento (inclusive a leitura
> de `active_org_id`) intactos — só deixou de repetir a mesma consulta
> dentro do mesmo request. `requireOrgId()` e todo chamador seguem iguais,
> zero mudança de contrato.
>
> **Teste novo** — `tests/actions/lead-intake.test.ts` ganhou o caso que
> reproduz exatamente a sequência provada no checkpoint: cadastro com
> telefone novo (`success`) → mesmo telefone + `force_new_contact` (2
> contatos, `success`) → **terceiro cadastro no mesmo telefone, sem force,
> continua devolvendo `duplicate`** (antes da correção, esse terceiro caso
> devolvia `success` e criava um 3º contato — reproduzido com teste
> descartável durante o checkpoint, removido depois).
>
> **Medição real do Achado B, não leitura de código** — instrumentação
> temporária (`console.log` dentro de `getCurrentOrg`, removida antes do
> commit) + `next dev` + Playwright, login real como `rls-test-a`, org de QA
> criada pelo onboarding:
> - 1ª request a `/leads` (4 pontos de chamada: `listStages`, `listSources`,
>   `listLeadsForDisplay` e o `listLeads` que ela chama): **1 execução**,
>   contra 4 antes da correção.
> - 2ª request, independente, a `/leads/new`: **1 execução com timestamp
>   novo** — prova que a memoização não vaza de uma request para a
>   seguinte (o `cache()` do React é escopado pelo `AsyncLocalStorage` da
>   própria request do Next.js, não é singleton de módulo).
>
> Dado de QA removido depois (`organizations=0`). Instrumentação removida
> antes do commit — `git diff` de `orgs.ts` mostra só `cache()` e o
> comentário, nenhum `console.log`.
>
> **Validado, não só assumido:**
> - `npm run test:rls`: **75/75** (74 preservados + 1 novo), rodado duas
>   vezes seguidas, zero organização/contato/lead residual entre execuções.
> - `npm run test`: continua **44/44** — nenhuma mudança em `lib/domain/`.
> - `typecheck`/`lint`/`build` limpos. Build gera `/leads`,
>   `/leads/[leadId]`, `/leads/new` como dinâmicas, igual antes.
> - Grep: zero `service_role` fora de `lib/env.server.ts`/`lib/supabase/admin.ts`;
>   zero componente importando `@/lib/supabase`/`createClient`; wrapper
>   `'use server'` de `lib/actions/lead-intake.ts` intacto, `-core.ts`
>   continua sem `'use server'`/`next/headers` (D-020 preservada).
> - Nenhuma migration nesta tarefa — `0001`-`0005` intactos.
>
> Nenhuma decisão permanente nova para `DECISIONS.md` — as duas correções
> são aplicação direta do que já estava especificado no checkpoint (Achados
> A e B), sem trade-off novo sendo introduzido.
>
> Um commit.
>
> **Não avançado para a Fase 4** — aguardando nova instrução.

<details>
<summary>Texto original da tarefa (referência)</summary>

### [ ] 3.7 Correções do checkpoint da Fase 3

Sem migration — as duas correções são de código de aplicação. `0001`–`0005` não
são tocadas.

**Achado A — deduplicação de telefone (`lib/actions/lead-intake-core.ts`):**

- trocar `.maybeSingle()` por `.limit(1).maybeSingle()` na busca do contato
  duplicado (mesmo padrão já correto em `lib/supabase/middleware.ts`);
- **tratar o `error`** em vez de descartá-lo: em caso de falha na consulta, retornar
  erro visível ao usuário, nunca seguir em frente como se não houvesse duplicata
  (o modo de falha certo aqui é avisar, não criar contato silenciosamente);
- teste novo em `tests/actions/lead-intake.test.ts`, cobrindo exatamente a sequência
  provada no checkpoint: cadastra → força contato novo (2 contatos) → **terceiro
  cadastro sem force ainda devolve `duplicate`**. Sem esse teste a regressão volta
  sem ninguém ver.

**Achado B — organização resolvida uma vez por request (`lib/queries/orgs.ts`):**

- envolver `getCurrentOrg` em `cache()` do React;
- conferir por medição (log ou `query_logs`) que `/leads` passa de 4 para 1
  `select` em `organizations`;
- não mudar assinatura nem quem chama; `requireOrgId()` continua igual.

**Pronto quando:** `test:rls` verde com o teste novo (75/75), `typecheck`/`lint`/
`test`/`build` limpos, e a contagem de queries de `/leads` confirmada por medição —
não por leitura do código.

</details>

### Reauditoria da 3.7 (2026-08-24) — **os dois achados fecharam**

Revisão dirigida só aos dois achados, confirmada por execução independente — não
pelos testes que a própria 3.7 escreveu, e não por leitura do diff.

**Diff conferido primeiro:** `git show` de `ef84c7b` mostra exatamente
`.limit(1)` + tratamento de `error` em `lead-intake-core.ts` e `cache()` em
`orgs.ts`. Nenhuma instrumentação residual, nenhum `console.log`, nenhuma
mudança de assinatura, nenhuma migration.

#### Achado A — fechado

Probe próprio, mais agressivo que o teste da suíte (3 contatos no mesmo telefone,
não 2), e cobrindo o caso que a suíte **não** cobre:

| caso | esperado | obtido |
|---|---|---|
| dedupe com **3** contatos no mesmo telefone | `duplicate` | `duplicate` ✓ (e o 4º contato não foi criado) |
| **erro na consulta de dedupe** (client com falha injetada) | `error` | `{"status":"error","error":"Não foi possível verificar contatos existentes com esse telefone."}` ✓ |

O segundo caso é o item 5 do escopo da 3.7 ("erro da query de dedupe não pode cair
silenciosamente em success") e **não tem teste na suíte permanente** — só o
comportamento no código. Foi provado aqui injetando um client stub que falha
exatamente na consulta de dedupe e delega o resto ao client real. Isso só é
possível porque a `-core` recebe o `supabase` por parâmetro (**D-020**) — a mesma
decisão que existia para testar RLS de verdade também permitiu exercitar o caminho
de erro sem mexer no banco. Vale como lição do padrão, não como pendência.

**Sobrou uma lacuna pequena, classificada MELHORIA FUTURA:** o caminho de erro da
consulta de dedupe está correto e provado aqui, mas não tem teste permanente — se
alguém remover o `if (dedupeError)` amanhã, a suíte continua verde. O stub usado
nesta auditoria é a base pronta para virar teste. Fazer quando `tests/actions/`
ganhar helpers de stub (provavelmente na 6.2, que já prevê testes de integração
mais amplos).

#### Achado B — fechado

Instrumentação temporária própria (removida em seguida; `git checkout` confirmou
`orgs.ts` idêntico ao commitado), `next dev` real, Playwright, **dois usuários
reais** com **duas organizações distintas e nomeadas** para tornar qualquer
vazamento visível:

| request | execuções de `getCurrentOrg` | org retornada |
|---|---|---|
| `/leads` como usuário A | **1** (era 4) | `AUDIT ORG DO USUARIO A` |
| `/leads` como usuário B | **1** | `AUDIT ORG DO USUARIO B` |

As quatro execuções registradas no período tiveram timestamps distintos, e cada
uma devolveu a organização do usuário logado naquela request. `/today` do usuário
B renderizou `AUDIT ORG DO USUARIO B` na tela — se a memoização fosse singleton de
módulo, B teria visto a organização de A ali, visivelmente.

Isso cobre os três riscos de uma memoização mal escopada, cada um por observação
direta: **redução real** (4 → 1), **sem cache cross-request** (timestamps novos a
cada request), **sem cache cross-user** (organização correta por sessão, conferida
também na tela).

#### Suíte completa, contra o código como está commitado

`test:rls` **75/75** · `test` **44/44** · `typecheck` · `lint` · `build` — todos
limpos. Zero resíduo no banco depois (`organizations=0 contacts=0 leads=0`),
árvore de trabalho limpa, artefatos de auditoria removidos.

### Veredito final da Fase 3

**LIBERADO PARA FASE 4.** Nenhum BLOQUEANTE, nenhum IMPORTANTE em aberto. As
melhorias futuras registradas neste checkpoint (layout sem checar sessão, erro de
formulário não-por-campo, ordem entre `it()` na suíte de RLS, teste permanente do
caminho de erro do dedupe) seguem válidas e nenhuma bloqueia a 4.1.

---

# FASE 4 — Follow-up

O núcleo do produto. Checkpoint Opus ao final.

### [x] 4.1 Atividades e regras (banco)

> feito: `supabase/migrations/0006_activities.sql` — `sales.activities`
> conforme `DATABASE.md`, RLS `tenant_isolation for all` padrão (dado
> operacional, D-017 não se aplica — mesma classificação de contacts/leads).
> `rule_id`/`ai_run_id` nascem sem FK (as tabelas referenciadas ainda não
> existem — `followup_rules` chega em 0007, mesma tarefa; `ai_runs` só na
> Fase 5.1). `supabase/migrations/0007_followup_rules.sql` — `sales.followup_rules`
> conforme `DATABASE.md`, RLS `tenant_isolation for all` (config por
> organização, sem `is_demo`, mesma classificação de `lead_sources`/
> `pipeline_stages`), fecha a FK antecipada de `activities.rule_id` via
> `alter table`, e estende `seed_org_defaults` (`create or replace`, 0004)
> para semear os 3 passos padrão em `proposta_enviada` (+1d/+3d/+7d,
> `whatsapp`, `followup_proposta`). `0001`-`0005` não tocados.
>
> **Validado, não só assumido:**
> - Replay do zero: `drop schema sales cascade` + reaplicar 0001→0007 na
>   ordem, direto dos arquivos → 8 tabelas, 13 policies, 5 funções, 6 enums,
>   21 índices, 6 triggers — bate exatamente com o estado vivo pós-migration.
> - `seed_org_defaults` continua **não executável** por `authenticated` nem
>   `anon` depois do `create or replace` (`has_function_privilege` = false
>   nos dois) — grants preservados através da troca de corpo, mesmo
>   confirmado por execução na 3.1.
> - `get_advisors(security)`: nenhum alerta novo em `sales` — mesmos 3 WARN
>   de D-013. `activities`/`followup_rules` não geram alerta (RLS ligada,
>   1 policy cada, `anon` sem `select` em nenhuma das duas).
> - `tests/rls.test.ts` ganhou describe própria (org/usuários isolados dos
>   blocos anteriores, mesmo motivo da 2.5), 12 casos novos: seed de
>   `proposta_enviada` semeia exatamente 3 `followup_rules` com
>   `delay_days` 1/3/7, `step_number` 1/2/3, `channel='whatsapp'`,
>   `prompt_slug='followup_proposta'`, `is_active=true`; isolamento
>   cross-tenant de `activities` (select 0 linhas, insert com `org_id`
>   alheio rejeitado por `WITH CHECK`, `UPDATE`/`DELETE` bloqueados por
>   `USING` — D-016: `.select()` encadeado, `data === []`, não
>   `expect(error).not.toBeNull()`) e o mesmo conjunto para
>   `followup_rules`; `anon` bloqueado nas duas tabelas.
> - `npm run test:rls`: **87/87** (75 preservados + 12 novos), rodado duas
>   vezes seguidas, zero organização/contato/lead/activity/followup_rule
>   residual entre execuções.
> - `npm run test`: continua **44/44** — nenhuma mudança em `lib/domain/`.
> - `typecheck`/`lint`/`build` limpos. Build sem rota nova (tarefa é só de
>   banco + types, UI chega na 4.3/4.4).
> - `lib/types/database.types.ts` ganhou `activities`/`followup_rules`
>   (`Row`/`Insert`/`Update`/`Relationships`, incluindo a FK de
>   `activities.rule_id` → `followup_rules` fechada na 0007), mantidos à
>   mão pelo mesmo motivo já documentado (ferramenta de geração automática
>   não introspecta `sales`).
>
> Nenhuma decisão permanente nova para `DECISIONS.md` — a referência
> antecipada de FK resolvida via `alter table` na migration seguinte é
> aplicação do mesmo princípio já usado em `current_org_ids()`/`org_members`
> na 0001 (D-002/arquitetura de multi-tenancy já documentada), não um
> trade-off novo.
>
> Dois commits: migrations sozinhas antes de aplicar, resto depois.
>
> **Não avançado para a 4.2** — aguardando nova instrução.

<details>
<summary>Texto original da tarefa (referência)</summary>

### [ ] 4.1 Atividades e regras (banco)

`0006_activities.sql` e `0007_followup_rules.sql` conforme `DATABASE.md`.
Estender `seed_org_defaults` com a sequência padrão (+1d, +3d, +7d em
`proposta_enviada`). Types regerados.

</details>

### [x] 4.2 Regra de próxima ação (domínio puro)

> feito: `lib/domain/followup.ts` — `computeFollowupSchedule`,
> `shouldCancelFollowups`, `resolveNextAction`, conforme a assinatura do
> plano. `pushIntoBusinessWindow` (privada) empurra qualquer instante fora
> do horário comercial pra próxima janela válida no fuso da organização,
> usando `@date-fns/tz` (`TZDate`) — `date-fns` puro não tem noção de fuso
> horário (confirmado por execução), e calcular "horário comercial" no fuso
> do servidor em vez do fuso da org é exatamente o bug que
> `DATABASE.md`/`timezone`/`business_hours` existem pra evitar. Decisão
> registrada em **D-024**, incluindo por que isso não contraria a regra de
> "versões iguais ao CRM-RR" (`followup.ts` não tem equivalente lá pra
> portar) e a convenção de `BusinessHours.days` (`Date.getDay()`, não ISO).
>
> `FollowupRule` ganhou `alreadyExecuted?: boolean` (não estava na
> assinatura literal do plano) — necessário pra cumprir o teste obrigatório
> "passo já executado": sem um sinal explícito de que o passo já rodou, a
> função não teria como diferenciar "regra ainda não chegou a vez" de
> "regra já gerou activity", e geraria follow-up duplicado quando chamada de
> novo pro mesmo lead (violaria a regra desta tarefa de "não criar caminho
> paralelo que pule o registro de histórico" — aqui, o caminho que evita
> duplicar é a própria função saber pular o que já foi feito).
> `ActivityLike` usa `status`/`due_at` em vez de `stepNumber`/`dueAt`
> (snake_case, não camelCase) de propósito — mesmo estilo do
> `next-action.ts` do CRM-RR que `ARCHITECTURE.md` cita como referência: o
> chamador (`lib/actions/`, 4.3) passa a linha do banco direto, sem mapear
> campo a campo antes.
>
> **Validado por execução antes de virar teste** (mesma disciplina do achado
> do NBSP/"cerca de" já registrada em D-020/D-021): script descartável
> (criado e removido na própria tarefa, nunca commitado) rodou os 6 cenários
> obrigatórios do plano contra a função real, e só depois os valores
> confirmados viraram `expect(...).toEqual(...)` — sexta 17h + delay 1 dia
> cai no sábado e empurra pra segunda 09h; entrada direto num sábado também
> empurra pra segunda; o mesmo instante em fuso diferente (`America/Manaus`,
> UTC-4) produz `dueAt` uma hora depois do equivalente em São Paulo,
> provando que o fuso é respeitado e não é o do servidor; regra desativada e
> passo já executado somem do array; "já passou" com `now` dentro do
> expediente agenda pra agora mesmo, e com `now` fora do expediente empurra
> pra próxima janela; janeiro e julho produzem o mesmo offset -03:00 em São
> Paulo, documentando a premissa de que o Brasil não tem DST hoje (sem
> testar transição de DST porque não existe uma pra testar).
>
> **Testes** — `tests/domain/followup.test.ts` (19), cobrindo os 6 cenários
> acima mais casos positivos/negativos de `shouldCancelFollowups` (respondeu,
> ganho, perdido, status fechado sem sinal de estágio, e o caso negativo —
> nada se aplica, não cancela) e `resolveNextAction` (vazio, só
> done/cancelled, pendente sem `due_at`, menor `due_at` entre pendentes
> ignorando `done`/`cancelled` com data mais antiga, aceita `due_at` como
> `Date` além de `string`).
>
> **Regras de segurança da tarefa (org_id nunca do cliente, Zod, wrapper+core,
> mass assignment, IDs cross-tenant) não se aplicam a este arquivo** — é
> domínio puro, sem banco, sem action, sem fronteira de entrada de usuário;
> essas regras valem a partir da 4.3, quando `lib/actions/` de fato grava o
> resultado destas funções.
>
> **Validado, não só assumido:**
> - `npm run test`: **63/63** (44 preservados + 19 novos).
> - `npm run typecheck`/`lint`/`build` limpos.
> - `grep` em `lib/domain/followup.ts`: zero import de `supabase`/`next` —
>   só `date-fns` e `@date-fns/tz`.
> - Sem banco/action/RLS tocado nesta tarefa — `test:rls` não roda
>   (0001-0007 intactos, nada para revalidar).
>
> Uma decisão permanente nova: **D-024** (`@date-fns/tz` como padrão pra
> fuso horário no domínio; convenção `Date.getDay()` pra `BusinessHours.days`).
>
> Um commit.
>
> **Não avançado para a 4.3** — aguardando nova instrução.

<details>
<summary>Texto original da tarefa (referência)</summary>

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

</details>

### [x] 4.3 Geração e cancelamento automático

> feito: `supabase/migrations/0008_views.sql` — `v_today_actions` e
> `v_leads_without_action` conforme `DATABASE.md`, ambas
> `security_invoker = true`. Renumerada de `0009` pra `0008`: a tabela de
> "Ordem das migrations" de `DATABASE.md` ainda numerava views/IA como se
> `activities`/`followup_rules` (4.1) não tivessem ocupado `0006`/`0007` —
> corrigido nesta tarefa (views = `0008`, IA/auditoria futuras reservam
> `0009`/`0010`).
>
> `lib/actions/leads-core.ts` → `moveStageCore` estendida (não mais só troca
> `stage_id`): busca o estágio de destino (`is_won`/`is_lost`), grava
> `leads.status`/`closed_at` a partir dessas duas flags, e chama
> `regenerateStageFollowups` (nova, privada) fora de won/lost. Esta cancela
> os pendentes automáticos **do estágio de destino** (não de outros estágios
> — ver **D-025**), marca `alreadyExecuted` pra todo `rule_id` com uma
> activity `done` do lead, chama `computeFollowupSchedule` (4.2) com
> `timezone`/`business_hours` reais da organização, e insere uma activity
> `pending`/`is_auto=true` por passo do resultado. Estágio `is_won`/`is_lost`
> cancela **todos** os pendentes automáticos do lead (gatilho documentado em
> `DATABASE.md`), sem gerar novos.
>
> `markRespondedCore` (nova): grava `responded_at` (só se ainda nulo —
> idempotente), cancela todos os pendentes automáticos, cria activity de
> histórico ("Cliente respondeu", `is_auto=false`), recalcula o cache do
> lead. `lib/actions/leads.ts` ganhou o wrapper `markResponded`.
>
> `recalculateLeadCache` (nova, `leads-core.ts`): `next_action_at` via
> `resolveNextAction` (4.2, mesma função que decide a tela "Ações de hoje" —
> um só lugar decide "próxima ação"), `last_contact_at` = maior `done_at`
> entre as activities do lead. Chamada por toda escrita em `activities`
> (D-006).
>
> `lib/actions/activities-core.ts` + `lib/actions/activities.ts` (novos,
> par wrapper+core de D-020): `createActivity` (manual — `status`/`done_at`
> derivados de `due_at` estar presente ou não, nunca aceita
> `is_auto`/`rule_id`/`step_number`/`status`/`org_id` do payload — mass
> assignment fechado no Zod, não só por convenção), `completeActivity`,
> `cancelActivity` (as duas idempotentes: repetir não falha nem reescreve
> `done_at`), `rescheduleActivity` (só em `pending`). Todas recalculam o
> cache do lead.
>
> `belongsToOrg` (D-020) ganhou `'leads'` no tipo de tabela aceita, usada por
> `createActivityCore` pra validar `lead_id`. `moveStageCore` não usa mais
> `belongsToOrg` pra `stage_id` — busca o estágio direto (já precisa de
> `is_won`/`is_lost`, então a mesma query serve pras duas coisas).
>
> **Desvio, não implementado — tabela não existe ainda:** `markResponded`
> não grava `audit_log`. `sales.audit_logs` só nasce na migration da tarefa
> 5.4 (`DATABASE.md` → Ordem das migrations); criar a tabela agora seria
> antecipar 5.4 fora do escopo desta tarefa. Quando existir, o insert entra
> em `markRespondedCore`, mesmo padrão de `activities`.
>
> **D-025** registra a decisão de escopo do cancelamento (só o estágio de
> destino, exceto won/lost) e o achado não corrigido nesta tarefa
> (**Q-005**): `belongsToOrg()` descarta erro de banco e trata como "não
> encontrado" — fail-safe (rejeita a escrita, não abre dado cross-tenant),
> mas não é o padrão de D-016/D-018 de tratar erro explicitamente. Não
> corrigido aqui por tocar 3 arquivos de uma vez, fora do escopo de uma
> tarefa que não é sobre `belongsToOrg`.
>
> **Testes:**
> - `tests/actions/leads-followup.test.ts` (13 casos, novo): fluxo positivo
>   com fuso/horário comercial reais (tolerância de 10s contra
>   `computeFollowupSchedule` chamada em paralelo no teste — latência de
>   rede real entre o `new Date()` do teste e o de dentro da action, não
>   imprecisão de fuso — um bug de timezone erraria por horas, não
>   milissegundos); regra desativada; A→B→A não duplica (3 pendentes, não
>   6); passo já executado não regenerado; estágio `is_won`/`is_lost`
>   cancela tudo e fecha o lead; follow-up manual nunca cancelado; lead/regra
>   de outro tenant isolados (isolamento estrutural — `trigger_stage_id` de
>   B nunca é igual ao de A — confirmado por execução, não só por leitura);
>   erro de banco (client stub, mesmo padrão da 3.7) não vira sucesso;
>   `markRespondedCore` idempotente, cross-tenant, erro de banco.
> - `tests/actions/activities.test.ts` (17 casos, novo): status/`done_at`
>   derivados de `due_at`; cache recalculado; cross-tenant (lead e contato);
>   mass assignment fechado; complete/cancel idempotentes; reschedule só em
>   pending; erro de banco não vira sucesso.
> - `tests/helpers/stub-client.ts` (novo): client real desviado por tabela
>   via `Proxy`, generalização do padrão de client-stub introduzido na 3.7
>   (D-020 permite porque `-core` recebe o client como parâmetro).
>
> **Validado, não só assumido:**
> - Replay do zero: `drop schema sales cascade` + reaplicar 0001→0008 na
>   ordem, direto dos arquivos → 8 tabelas, 2 views, 13 policies, 5 funções,
>   6 enums, 21 índices, 6 triggers — bate exatamente com o estado vivo
>   pré-replay.
> - `npm run test:rls` rodado **contra o schema recém-replayado**: 117/117
>   (87 preservados + 13 + 17 novos), duas vezes seguidas antes do replay e
>   mais uma depois — zero organização/activity residual em todas as
>   rodadas.
> - `get_advisors(security)`: mesmos 3 WARN de D-013 (`authenticated`
>   executa função `security definer`), nada novo — as duas views não
>   geram alerta (`security_invoker = true` confirmado).
> - `npm run test`: **63/63** — nenhuma mudança em `lib/domain/`, `followup.ts`
>   permanece puro (usado, não alterado).
> - `typecheck`/`lint`/`build` limpos. Build sem rota nova — tarefa é só de
>   banco/actions, UI chega na 4.4.
>
> `lib/types/database.types.ts` ganhou `Views.v_today_actions`/
> `v_leads_without_action`. `DATABASE.md` ganhou a nota de `status`/`closed_at`
> seguindo o estágio e a correção da tabela de ordem das migrations.
>
> Uma decisão permanente nova: **D-025**.
>
> Dois commits: migration sozinha antes de aplicar, resto depois.
>
> **Não avançado para a 4.4** — aguardando nova instrução.

<details>
<summary>Texto original da tarefa (referência)</summary>

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

</details>

### [x] 4.4 Tela "Ações de hoje"

> feito: `lib/domain/today.ts` — `getOrgDayWindow(timezone, now?)`, pura,
> testada, calcula início/fim do dia de hoje no fuso da organização com
> `@date-fns/tz` (mesma disciplina de D-024) — nunca `Date.now()` do
> servidor direto. `lib/domain/date.ts` ganhou `formatTimeBR(iso, timezone)`
> (mesmo motivo: hora exibida na linha de ação é a da org, não a de quem
> hospeda o servidor).
>
> `lib/queries/today.ts` → `getTodayActions()`: lê `v_today_actions`
> (filtrando `due_at <= fim do dia de hoje no fuso da org` — a própria
> `DATABASE.md` já dizia que esse filtro fica na query, não na view, porque
> depende do timezone) e `v_leads_without_action`, corta o resultado em
> `overdue`/`dueToday` com `getOrgDayWindow()`. `org_id` sempre resolvido no
> servidor via `requireOrgId()`/`getCurrentOrg()` (cacheada, D-014), nunca do
> cliente.
>
> `app/(app)/today/page.tsx` (Server Component) busca os dados e renderiza
> `components/today/TodayActionsList.tsx` (único Client Component da
> tarefa — estado de foco/pendência/erro, mesmo padrão de
> `components/leads/StageMover.tsx`: chama as actions da 4.3
> (`completeActivity`/`rescheduleActivity`), nunca fala com Supabase direto).
> `ActionRow.tsx`/`LeadWithoutActionRow.tsx` são puramente apresentacionais
> ("Linha de ação" do `DESIGN_SYSTEM.md`: faixa de urgência `red-400`/
> `amber-400`/`brand-400`, `font-mono` em valor e hora, ícone por
> `activity_type` via Phosphor). Navegação por teclado ↑↓/Enter implementada
> como roving tabindex sobre a lista achatada dos três blocos (foco real de
> DOM via `ref` + `.focus()`, não só destaque visual — testado no browser).
> `app/(app)/today/loading.tsx` (skeleton) e `error.tsx` (com `reset()`)
> novos — nenhum dos dois existia antes em `/today`.
>
> **"Adiar 1 dia" soma 24h ao `due_at` atual, sem passar por
> `computeFollowupSchedule`** (lib/domain/followup.ts, 4.2) — essa função
> resolve o cronograma de uma *regra* de follow-up completa (fuso + horário
> comercial), não um adiamento manual pontual de uma activity já existente;
> reaproveitá-la aqui misturaria dois conceitos atrás do mesmo botão. Não
> duplica lógica: é um único `+ 24h` inline, documentado no componente.
>
> **Validado no browser real** (dev server + Supabase real, dois usuários de
> teste, dados de QA removidos ao final — `organizations`/`contacts`/
> `leads`/`activities` conferidos em `0` depois):
> - Fluxo positivo: org com 1 activity atrasada, 1 vencendo hoje e 1 lead sem
>   ação → os três blocos aparecem com contadores corretos, valores em
>   `font-mono` BRL, hora no fuso da org (`America/Sao_Paulo`, confirmado
>   diferente de UTC).
> - Isolamento cross-tenant: logado como usuário B (org própria, 1 lead sem
>   ação), a tela mostra só o lead de B — nenhum dado do usuário A aparece.
> - `Concluir`: activity vira `done`, `next_action_at` recalculado (cache
>   central da 4.3, nenhum caminho paralelo), bloco "Hoje" some (ficou
>   vazio) e o lead reaparece em "Sem próxima ação" — sem reload de página
>   (`router.refresh()`).
> - `Adiar 1 dia`: `due_at` avança exatamente 24h (conferido direto no
>   banco), lead atrasado continua atrasado (delay de 1 dia não bastou pra
>   sair do bloco) — comportamento correto, não um bug.
> - Estado vazio: lead fechado (`status='won'`) some da tela, "Nenhuma ação
>   para hoje." aparece (exemplo literal do `DESIGN_SYSTEM.md`).
> - Navegação por teclado: `ArrowDown` move o foco real de DOM pra próxima
>   linha (confirmado via accessibility snapshot, não só CSS), `Enter` abre
>   exatamente o lead da linha focada.
> - Console do browser: só o 404 de favicon já documentado (achado E do
>   checkpoint da Fase 1, fora de escopo aqui).
>
> **Não validado ao vivo, por limitação de ambiente, não por lacuna de
> código:** `loading.tsx` — servidor local resolve rápido demais pra
> observar o fallback do Suspense sem atraso artificial; `error.tsx` —
> forçar um erro real exigiria quebrar RLS/grants no mesmo projeto Supabase
> compartilhado com dados reais, risco desproporcional pro que provaria.
> Os dois seguem o mesmo padrão já em produção (`TodayEmptyState`/
> `LeadsEmptyState`), revisados por leitura.
>
> **Validado, não só assumido:**
> - `npm run test`: **69/69** (63 preservados + 4 de `getOrgDayWindow` + 2 de
>   `formatTimeBR`), valores conferidos rodando as funções de verdade antes
>   de virar `expect(...)`.
> - `npm run test:rls`: **117/117** — suíte inalterada continua verde
>   (nenhuma migration, nenhuma policy, nenhuma action tocada nesta tarefa;
>   só leitura nova sobre RLS/views já existentes).
> - `typecheck`/`lint`/`build` limpos. Build reconhece `/today` continua
>   dinâmica, nenhuma rota nova.
>
> Nenhuma migration (views já existiam desde a 4.3) — `advisors` não roda,
> nada de banco mudou. Nenhuma decisão permanente nova para `DECISIONS.md`.
>
> Um commit.
>
> **Não avançado para a 4.5** — aguardando nova instrução.

<details>
<summary>Texto original da tarefa (referência)</summary>

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

</details>

### [x] 4.5 Registrar conclusão e resposta

> feito: `completeActivityCore` (4.3) estendida — `recalculateLeadCache`
> (`lib/actions/leads-core.ts`) agora devolve `nextActionAt` calculado, não
> só `error` (D-006, uma leitura só, sem recálculo duplicado). Quando
> `nextActionAt` fica `null` depois de concluir, `completeActivityCore`
> também devolve `suggestedFollowupDueAt`: se a activity concluída tinha
> `rule_id`, busca o próximo passo **ativo** da mesma sequência
> (`followup_rules`, pulando desativado) e reaproveita
> `computeFollowupSchedule` (4.2) com `enteredStageAt: now()` — nunca a
> data real de entrada no estágio, que `leads` não guarda (D-026 registra o
> porquê e o que foi descartado).
>
> `components/today/FollowupPrompt.tsx` (novo, client): aparece em
> `TodayActionsList.tsx` só quando `nextActionAt` é `null` — pré-preenche a
> data sugerida quando existe, input `datetime-local` livre quando não.
> "Agendar" chama `createActivity` (4.3, existente) com o tipo herdado da
> activity concluída — `is_auto` sempre `false`, nunca aceita `rule_id` do
> cliente (D-020 preservado). "Agora não" só dispensa. `TodayActionsList`
> segura `pendingId` até a pergunta ser resolvida, pra linha já concluída
> no banco não parecer clicável de novo antes do próximo render.
>
> `ActionRow.tsx` ganhou o botão `Cliente respondeu` (chama `markResponded`,
> 4.3, sem lógica nova). `components/leads/MarkRespondedButton.tsx` (novo)
> — mesmo botão na página do lead, desabilitado com texto "Cliente já
> respondeu" quando `responded_at` já está preenchido (idempotência visível,
> não só no banco).
>
> `lib/queries/activities.ts` → `listActivitiesForLead()` (novo, sem teste
> dedicado — mesmo padrão de `lib/queries/leads.ts`/`catalogs.ts`, que
> também não têm; validado por execução real no browser).
> `components/leads/ActivityTimeline.tsx` (novo): mais recente primeiro
> (`created_at desc`), feito/pendente/cancelado com cor semântica
> (`success`/`warning`/`content-muted`) — cancelado fica `opacity-50` +
> `line-through`, **não some** (D-005). `app/(app)/leads/[leadId]/page.tsx`
> troca o placeholder "Histórico de atividades chega na Fase 4." pelo
> componente de verdade e ganha o botão de resposta ao lado do
> `StageMover`.
>
> **Testes** — `tests/actions/activities-followup-prompt.test.ts` (7 casos,
> novo): sugere a data do próximo passo ativo (comparada contra
> `computeFollowupSchedule` chamada em paralelo no teste, tolerância de
> 10s pelo mesmo motivo de latência de rede já documentado na 4.3); nada
> sugerido no último passo da sequência; pula passo desativado e sugere o
> seguinte; nada sugerido quando todos os seguintes estão desativados;
> nada sugerido pra activity manual (sem `rule_id`); `nextActionAt` não
> nulo quando sobra outra pendência (sem sugestão nesse caso); `rule_id`
> de outra organização nunca vaza pra sugestão (lookup filtrado por
> `org_id` falha seguro).
>
> **Validado no browser real, ponta a ponta** (dev server + Supabase real,
> dados de QA removidos ao final — `organizations`/`contacts`/`leads`/
> `activities` conferidos em `0`): mover lead pra `proposta_enviada` via
> `StageMover` de verdade gerou os 3 passos reais; concluir passo 1 e 2 (com
> pendência sobrando) não mostrou pergunta nenhuma; concluir o passo 3 (o
> último) mostrou a pergunta sem sugestão de data (não há passo 4);
> preencher `2026-09-05T10:00` e confirmar criou a activity com o tipo
> herdado (`whatsapp`), `is_auto=false`, `due_at` exatamente
> `2026-09-05T13:00:00Z` (UTC-3 → UTC, conferido direto no banco); em outro
> lead, mesmo fluxo terminando em "Agora não" devolveu o lead pra "Sem
> próxima ação" sem criar nada; `Cliente respondeu` na tela Hoje cancelou o
> follow-up automático da linha mas preservou uma tarefa manual pendente do
> mesmo lead intacta (D-005, confirmado ao vivo); a timeline do lead
> mostrou a nota "Cliente respondeu" (feito), a tarefa manual (pendente) e
> o passo cancelado esmaecido riscado, todos os 3 passos originais como
> "Feito"; botão do lead ficou "Cliente já respondeu" desabilitado depois.
> Console do browser: só o 404 de favicon já documentado (achado E,
> checkpoint da Fase 1).
>
> **Achado corrigido durante a própria tarefa:** duas etiquetas "auto"
> (`ActionRow.tsx`, já existia; `ActivityTimeline.tsx`, nova) usavam
> `margin-left` pra separar da palavra anterior — cria espaço visual mas
> concatena o texto na árvore de acessibilidade ("Novoatrasado",
> "passo 1auto"), pego ao inspecionar o accessibility snapshot real no
> Playwright, não só por leitura de código. Corrigido pra separador
> `· ` explícito no texto.
>
> **Validado, não só assumido:**
> - `npm run test`: **69/69** — nenhuma mudança em `lib/domain/` nesta
>   tarefa (reaproveita `computeFollowupSchedule`/`resolveNextAction`
>   existentes, não duplica).
> - `npm run test:rls`: **124/124** (117 preservados + 7 novos).
> - `typecheck`/`lint`/`build` limpos. Build sem rota nova — `/leads/[leadId]`
>   e `/today` já existiam, só ganharam componentes.
>
> Nenhuma migration (nada de schema mudou) — `advisors` não roda. Uma
> decisão permanente nova: **D-026**.
>
> Um commit.
>
> **Não avançado para a Fase 5** — aguardando checkpoint Opus (fim da Fase 4,
> conforme `CLAUDE.md`).

<details>
<summary>Texto original da tarefa (referência)</summary>

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

</details>

---

## ⛔ Checkpoint Opus — fim da Fase 4 (2026-08-26) — **NÃO APROVADO até a 4.6**

> Preservado como estava quando reprovou. A reprovação valeu até a tarefa 4.6
> ser executada — o fechamento está na reauditoria, no fim desta seção.

Revisão de 4.1 → 4.5: migrations 0006/0007/0008, `sales.activities`,
`sales.followup_rules`, as duas views, `seed_org_defaults`, `lib/domain/followup.ts`,
`today.ts`, `date.ts`, toda a camada de actions de follow-up, `lib/queries/today.ts`/
`activities.ts`, a tela Hoje, a timeline do lead, e as suítes de teste. Commits
`19f171d`, `5c84e61`, `39b8255`, `877998a`, `bb586c4`, `c60f1de`, `f36160c`.

**A modelagem está certa e o isolamento multi-tenant continua provado.** O que
reprova o checkpoint é uma regra de produto declarada inegociável que para de
valer no segundo ciclo de vida do lead.

### Revalidado do zero neste checkpoint (não só lido)

- **Replay real, na ordem, direto dos arquivos:** `drop schema sales cascade` →
  0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0008. Resultado: 8 tabelas,
  2 views, 13 policies, 5 funções, 6 enums, 21 índices, 6 triggers — bate
  **exatamente** com o estado vivo pré-replay. Sem drift.
- **`npm run test:rls` contra o schema recém-replayado: 124/124 passam**, e
  124/124 também na rodada anterior contra o schema antigo — duas execuções,
  mesmo resultado, zero linha residual depois (`organizations`/`org_members`/
  `contacts`/`leads`/`activities`/`followup_rules` todos em `0`). Determinismo
  confirmado.
- `npm run test`: **69/69**. `typecheck` / `lint` / `build` limpos (build gera
  `/`, `/login`, `/onboarding`, `/leads`, `/leads/new`, `/leads/[leadId]`,
  `/today` + proxy).
- **`get_advisors(security)`:** no schema `sales`, só os 3 WARN já documentados em
  **D-013** (`authenticated` executa `security definer`: `create_organization`,
  `current_org_ids`, `current_org_role`). Nenhum alerta novo — as duas views não
  geram nenhum. Todo o resto da lista é de `public`, de outros projetos no mesmo
  Supabase.
- **`security_invoker = true` confirmado no catálogo** (`pg_class.reloptions`) nas
  duas views, e **o isolamento provado por execução**, não só pela flag:
  simulação SQL com os dois usuários reais de teste — A (dono) enxerga
  `v_today_actions = 1` / `v_leads_without_action = 1`; B, de outro tenant,
  enxerga `0` / `0`. Dado de prova removido depois, contagens conferidas em `0`.
- **`anon` sem nada:** `has_schema_privilege('anon','sales','usage') = false`,
  zero grant de tabela no schema, `execute = false` nas três RPC, `select = false`
  nas duas views. `seed_org_defaults` continua não executável por `authenticated`
  mesmo depois dos dois `create or replace` que a 0004 e a 0007 fizeram nela.
- **Camadas intactas:** `grep` em `components/` por `@/lib/supabase` e
  `@/lib/env.server` → zero. `select('*')` em qualquer `.ts`/`.tsx` → zero.
  `createAdminClient()` continua existindo só em `lib/supabase/admin.ts`, sem
  nenhum chamador no app; `service_role` só aparece em `lib/env.server.ts`,
  `admin.ts` e nas fixtures de teste. `lib/domain/followup.ts` e `today.ts` não
  importam `supabase` nem `next`.
- **Cache (`next_action_at`/`last_contact_at`) sem caminho paralelo:** os seis
  pontos que escrevem em `activities` — `createActivityCore`,
  `completeActivityCore`, `cancelActivityCore`, `rescheduleActivityCore`,
  `moveStageCore` e `markRespondedCore` — todos terminam em
  `recalculateLeadCache`, e ela é o único lugar que grava as duas colunas.
  `resolveNextAction` (4.2) é a única fonte de "qual é a próxima ação", usada
  tanto pelo cache quanto pela tela. Nenhum fluxo deixa cache stale.
- **`computeFollowupSchedule` é fonte única de agenda:** dois chamadores em
  produção (`regenerateStageFollowups` e `suggestNextFollowupDueAt`), ambos
  passando `timezone`/`business_hours` reais da organização. O único cálculo de
  data fora dela é o `+24h` do botão "Adiar 1 dia", documentado no componente e
  conceitualmente distinto (adiamento manual pontual, não cronograma de regra).

### Achado A — BLOQUEANTE · "Cliente respondeu" vira no-op silencioso a partir do segundo ciclo

`markRespondedCore` grava `responded_at` com `.is('responded_at', null)` e faz o
cancelamento em massa **dentro** dessa guarda. Nenhum caminho do produto devolve
`responded_at` para `null`.

**Provado por execução**, com os dois usuários reais de teste (probe descartável,
criada e removida nesta revisão, nunca commitada):

| passo | esperado | obtido |
|---|---|---|
| entra em `proposta_enviada` | 3 automáticos pendentes | 3 ✓ |
| `markResponded` (1ª vez) | 0 pendentes | 0 ✓ |
| sai e volta para `proposta_enviada` (proposta revisada) | — | **3 automáticos regerados, com `responded_at` preenchido** |
| `markResponded` (2ª vez) | 0 pendentes | **`error: null` e os 3 continuam pendentes** |

`next_action_at` do lead continuou apontando para o dia seguinte depois do
segundo "Cliente respondeu".

**Risco concreto:** é violação direta da regra 3 de `PRODUCT_SPEC.md` — o usuário
clica "Cliente respondeu" na tela Hoje, não recebe erro nenhum, a lista atualiza,
e o sistema continua mandando ele cobrar um cliente que já respondeu. Na tela do
lead é pior: `MarkRespondedButton` fica desabilitado para sempre com o texto
"Cliente já respondeu", então nem existe o clique. O cenário é o comum do ICP
(`PRODUCT_SPEC.md` → Para quem), não caso de borda: cliente responde à primeira
proposta, a negociação anda, uma proposta revisada é enviada, o cliente responde
de novo. E a Fase 6.5 é uso real com dados reais da DevRR — as mensagens saem
para clientes de verdade.

**Correção mínima:** decisão de contrato em **D-027**, implementação na tarefa 4.6
abaixo. Duas mudanças pequenas em `lib/actions/leads-core.ts`, nenhuma migration.

### Achado B — IMPORTANTE · `Enter` num botão da linha conclui **e** navega para outra página

`components/today/TodayActionsList.tsx` → `handleKeyDown` está no `<div>` da linha
e não filtra a origem do evento (`event.target !== event.currentTarget`). Os
botões `Concluir` / `Adiar 1 dia` / `Cliente respondeu` são descendentes desse
div, então o `keydown` de `Enter` que aciona o botão **borbulha** até o handler,
que executa `router.push('/leads/…')`.

**Efeito:** usuário de teclado chega em `Concluir` com Tab, aperta `Enter` — a
activity é concluída e a página navega para o lead ao mesmo tempo. O
`FollowupPrompt` da 4.5, que é o objeto inteiro da tarefa, nunca chega a
aparecer. `ArrowUp`/`ArrowDown` de dentro de um botão têm o problema simétrico:
mexem no `activeIndex` e o efeito rouba o foco para outra linha.

Não foi pego na QA da 4.4 porque o teste de teclado de lá exercitou `ArrowDown` e
`Enter` com o foco **na linha**, nunca com o foco dentro de um botão — o único
caminho em que o bug aparece. Correção mínima: uma guarda de uma linha no
`handleKeyDown`.

### Achado C — IMPORTANTE · as duas views da 4.3 não têm um único teste

`grep` por `v_today_actions`/`v_leads_without_action` em `tests/`: **zero
ocorrências**. `security_invoker = true` está no catálogo e o isolamento foi
provado por execução *neste checkpoint*, então **não há buraco aberto hoje** — é
lacuna de cobertura, não vulnerabilidade viva.

**Por que importa mesmo assim:** `ARCHITECTURE.md` → Views registra que view sem
`security_invoker` foi achado real na Fase 4 do CRM-RR, e a doutrina da 2.4 é
literal ("não é escrever RLS, é **provar que ela funciona**"). Qualquer migration
futura que recrie uma dessas views — Fase 5 (`ai_run_id` no join), Fase 9
(Kanban), Fase 11 (dashboard) — perde a opção em silêncio, e a suíte continua
verde. É o tipo de regressão que só um teste pega.

### Achado D — MELHORIA FUTURA · `shouldCancelFollowups` é código morto

Exportada de `lib/domain/followup.ts`, com 5 testes unitários, e **zero
chamadores em produção**. A decisão de cancelar está escrita à mão em
`moveStageCore` (`stage.is_won || stage.is_lost`) e em `markRespondedCore`. É
exatamente a "lógica paralela" que este checkpoint foi verificar: para
*cronograma* existe uma fonte só (`computeFollowupSchedule`); para *cancelamento*
a função de domínio é ignorada, e o Achado A é a consequência visível — a função
pura afirma "`respondedAt !== null` → cancelar" e o caminho real regenera.
Resolver junto do Achado A: depois de D-027 o estado gravado volta a bater com o
que ela afirma. Chamar ou apagar é decisão da 4.6.

### Achado E — MELHORIA FUTURA · desempate de ordenação da timeline

`listActivitiesForLead` ordena só por `created_at desc`. Os 3 passos de uma
sequência nascem no mesmo `insert`, com `created_at` praticamente idêntico — a
ordem entre eles é instável entre carregamentos. Cosmético; um
`.order('step_number')` ou `.order('id')` de desempate resolve.

### Parecer sobre D-026 / `now()` como referência (item 11 do checkpoint)

**Permanece como trade-off. Não precisa ser corrigido antes da Fase 5.** O risco
concreto de sugerir data errada é baixo e limitado: a pergunta só aparece quando
não sobrou nenhuma pendência, a data sugerida é apenas o valor inicial de um
`<input type="datetime-local">` que o usuário edita antes de confirmar, e o erro
possível ("delay a partir de agora" em vez de "a partir da entrada no estágio")
é de dias, não de fuso — cadência, não bug de cálculo. Criar `stage_entered_at`
agora seria migration para melhorar uma sugestão opcional. **Nota para o futuro,
não tarefa:** quando a Fase 7 (agenda) ou a 6.3 (reconciliação) precisar de
"quanto tempo neste estágio", `stage_entered_at` passa a ser necessário por outro
motivo, e aí a sugestão passa a usá-la de graça.

### Q-005 — decidida

**Corrigir agora, na 4.6.** Não é urgência de segurança (`belongsToOrg` é
fail-safe: erro de banco vira "não encontrado" e **rejeita** a escrita). O que
decide é custo relativo: a Fase 5 acrescenta call sites novos do mesmo padrão
(`prompt_id`/`ai_run_id` em 5.1/5.4) e cada um herda a divergência de
D-016/D-018. Sete call sites mecânicos com os testes cross-tenant existentes como
rede é barato; dez depois não fica mais barato. Registrada em `DECISIONS.md` →
Questões abertas.

### [x] 4.6 Correções do checkpoint da Fase 4

> feito: os 6 achados do checkpoint fechados, todos em `lib/actions/leads-core.ts`
> + `lib/actions/activities-core.ts` + `lib/actions/lead-intake-core.ts` +
> `components/today/TodayActionsList.tsx` + `lib/queries/activities.ts`. Nenhuma
> migration, nenhuma mudança de schema — como previsto.
>
> **Achado A / D-027:** `regenerateStageFollowups` agora zera `leads.responded_at`
> no mesmo passo em que insere os follow-ups do estágio de destino (só quando o
> `insert` de fato acontece — o early return de "sem regras"/"nada pra gerar"
> continua intocado, então mover para `negociação`/`qualificado` não mexe em
> nada). `markRespondedCore` tirou o cancelamento em massa de dentro da guarda
> `.is('responded_at', null)` — ele roda sempre agora; só a gravação do
> timestamp e a activity de histórico "Cliente respondeu" continuam atrás da
> guarda (idempotentes por cadência, não duplicam). `MarkRespondedButton` não
> foi tocado, conforme previsto — com o reset em (1) ele volta a habilitar
> sozinho quando uma cadência nova começa.
>
> **Achado B:** `TodayActionsList.tsx` → `handleKeyDown` ganhou a guarda
> `if (event.target !== event.currentTarget) return` logo na entrada — evento
> de teclado nascido num botão/link descendente da linha não navega nem mexe
> no `activeIndex` mais.
>
> **Achado C:** novo describe em `tests/rls.test.ts` — `RLS —
> sales.v_today_actions e sales.v_leads_without_action (migration 0008)`, com
> setup próprio (4 leads cobrindo pendência real, sem ação, só histórico
> done/cancelled, e lead fechado com pendência) provando isolamento cross-tenant
> das duas views, `anon` bloqueado nas duas, lead fechado fora, activity
> done/cancelled fora de `v_today_actions`, e `next_action_at`/`null` decidindo
> `v_leads_without_action` corretamente.
>
> **Achado D:** `shouldCancelFollowups` (`lib/domain/followup.ts`) ganhou
> chamador de verdade — `moveStageCore` decide `cancelAllOnClose` chamando a
> função em vez do `stage.is_won || stage.is_lost` escrito à mão
> (`respondedAt: null` nesse call site porque ali o gatilho é *estágio*, não
> *resposta*; esse é decidido inteiro dentro de `markRespondedCore`, que cancela
> por construção). Função e os 5 testes dela preservados, não removidos.
>
> **Q-005:** `belongsToOrg` devolve `{ exists: boolean; error: string | null }`.
> Novo helper `checkBelongsToOrg` (mesmo arquivo) concentra o padrão nos 9 call
> sites (`leads-core.ts` ×5, `lead-intake-core.ts` ×2, `activities-core.ts` ×2).
> Nenhum teste cross-tenant existente precisou de edição.
>
> **Achado E:** `listActivitiesForLead` ganhou `.order('id', { ascending: true })`
> como desempate depois de `created_at desc`.
>
> **Testes novos:**
> - `tests/actions/leads-followup.test.ts` (+2, describe própria): a sequência
>   completa do Achado A — entra em `proposta_enviada` → `markResponded` (1ª,
>   cancela 3, grava `responded_at`) → sai e volta pro estágio (3 automáticos
>   regerados, `responded_at` já `null` pela reentrada) → `markResponded` (2ª,
>   cancela os 3 regerados) → 2 activities de histórico (uma por resposta real,
>   não duplicata) → `next_action_at` não nulo porque uma tarefa manual plantada
>   no meio da sequência sobrevive às duas rodadas de cancelamento (D-005); e
>   "mover pra estágio sem regras não zera `responded_at`".
> - `tests/actions/activities.test.ts` (+1): erro de banco no `belongsToOrg` do
>   `lead_id` (`stubTableError(clientA, 'leads')`) é reportado e é
>   **diferente** de `'Lead não encontrado.'` — prova a distinção do Q-005.
> - `tests/rls.test.ts` (+6): as duas views, cross-tenant + anon + filtros.
>
> **Validado no browser real** (dev server + Supabase real, usuário de teste
> real, dados de QA removidos ao final — `organizations`/`leads`/`activities`/
> `contacts` conferidos em `0`): logado como `rls-test-a`, focei o botão
> "Concluir" da 1ª linha via `element.focus()` (não clique) e apertei `Enter`
> de teclado real — a activity concluiu, a URL **não** mudou (`/today`), e o
> `FollowupPrompt` apareceu ("Follow-up concluído para Lead Teclado Enter.
> Agendar a próxima ação?"), provando que o fluxo de teclado chega no mesmo
> resultado do clique de mouse. Dispensei com "Agora não", focei a linha (não
> um botão) e apertei `ArrowDown` — o foco moveu pra próxima linha
> (`listitem [active]` na snapshot de acessibilidade), confirmando que a
> navegação entre linhas da 4.4 não regrediu. Apertei `Enter` com foco na linha
> — navegou pro lead certo (`/leads/<id>`), igual ao comportamento anterior.
>
> **Validado, não só assumido:**
> - `npm run test`: **69/69**, inalterado (nenhuma mudança em `lib/domain/`).
> - `npm run test:rls`: **133/133** (124 preservados + 9 novos), rodado duas
>   vezes seguidas, zero organização/lead/activity residual em ambas.
> - `typecheck`/`lint`/`build` limpos. Build sem rota nova.
> - `get_advisors(security)`: mesmos alertas de sempre (3 WARN de D-013 em
>   `sales`), nada novo — esperado, nenhuma migration nesta tarefa.
>
> `docs/DECISIONS.md`: D-027 atualizada de "decidido" pra "implementado", com
> parágrafo de validação; Q-005 marcada implementada nas Questões abertas.
> Nenhuma decisão permanente **nova** — tudo aqui já estava decidido pelo
> checkpoint, esta tarefa executa.
>
> Um commit.
>
> **Não avançado para a Fase 5** — aguardando reauditoria Opus.

<details>
<summary>Texto original da tarefa (referência)</summary>

### [ ] 4.6 Correções do checkpoint da Fase 4

Nenhuma migration. Nenhuma mudança de schema. Não avance para a Fase 5 sem
fechar esta tarefa.

**1. Achado A — `responded_at` como estado da cadência corrente (D-027):**

- `lib/actions/leads-core.ts` → `regenerateStageFollowups`: zerar
  `responded_at` do lead no mesmo passo em que os follow-ups do estágio de
  destino são gerados — e **só** aí. O early return de "estágio sem regras"
  acontece antes, de propósito: mover para `negociação`/`qualificado` não abre
  cadência nenhuma e não pode apagar o registro.
- `lib/actions/leads-core.ts` → `markRespondedCore`: tirar o `update` de
  cancelamento em massa de dentro da guarda `.is('responded_at', null)`. Ele
  passa a rodar sempre; a gravação do timestamp e a activity de histórico
  "Cliente respondeu" continuam idempotentes (é isso que os testes da 4.3
  afirmam, e eles têm que continuar passando sem alteração).
- **Não** mexer em `MarkRespondedButton`: com o item acima o botão volta a
  habilitar sozinho quando uma cadência nova começa, e continuar desabilitado
  dentro da mesma cadência está correto (não há nada para cancelar).

Testes obrigatórios em `tests/actions/leads-followup.test.ts` (a sequência exata
da tabela do Achado A, que hoje passa reprovando o produto):
- reentrar num estágio com regras depois de `markResponded` zera `responded_at`;
- `markResponded` **de novo**, depois da reentrada, cancela os automáticos
  regerados (0 pendentes) — este é o teste que prova o Achado A fechado;
- mover para estágio **sem** regras (`negociacao`) **não** zera `responded_at`;
- regressão: os 3 casos de idempotência já existentes de `markRespondedCore`
  continuam passando sem edição (timestamp preservado, histórico não duplicado).

**2. Achado B — teclado:**

- `components/today/TodayActionsList.tsx` → `handleKeyDown`: ignorar eventos que
  não vieram do próprio contêiner da linha (`if (event.target !==
  event.currentTarget) return`), para `Enter`/`ArrowUp`/`ArrowDown` disparados de
  dentro de um botão não navegarem nem roubarem o foco.
- Validar no browser real com teclado, não só por leitura: Tab até `Concluir`,
  `Enter` → a activity conclui, a página **não** navega, e o `FollowupPrompt`
  aparece quando tem que aparecer. `ArrowDown` com foco na linha continua
  andando entre linhas (regressão da 4.4).

**3. Achado C — cobertura das views:**

Estender `tests/rls.test.ts` (describe própria, org e usuários isolados dos
blocos anteriores — mesmo padrão da 2.5/4.1):
- A enxerga a própria activity pendente em `v_today_actions`; B enxerga `0`;
- A enxerga o próprio lead sem ação em `v_leads_without_action`; B enxerga `0`;
- lead fechado (`status != 'open'`) some das duas views;
- activity `done`/`cancelled` some de `v_today_actions`;
- `anon` não lê nenhuma das duas.

**4. Achado D — `shouldCancelFollowups`:**

Depois do item 1, decidir entre usar a função no ponto de decisão de
`moveStageCore` ou removê-la de `lib/domain/followup.ts` (com os testes dela).
**Não inventar um terceiro caminho.** Se for mantida sem chamador, registrar o
porquê em `DECISIONS.md` — código de domínio sem uso é dívida, não neutro.

**5. Q-005 — `belongsToOrg`:**

`lib/actions/leads-core.ts` → `belongsToOrg` devolve
`{ exists: boolean; error: string | null }` em vez de `boolean`. Atualizar os
call sites em `leads-core.ts`, `lead-intake-core.ts` e `activities-core.ts`:
erro de banco vira erro reportado, ausência continua sendo "não encontrado".
Todos os testes cross-tenant existentes têm que continuar passando **sem
edição** — é essa a rede de segurança da mudança. Um caso novo com
`stubTableError` provando que erro de banco não vira "não encontrado".

**6. Achado E:** desempate na ordenação de `listActivitiesForLead`.

**Pronto quando:** a sequência completa da tabela do Achado A roda com o
resultado esperado (0 pendentes no segundo "Cliente respondeu"), provada por
teste **e** no browser real; `npm run test`, `npm run test:rls`, `typecheck`,
`lint` e `build` limpos; `DATABASE.md` (já atualizado neste checkpoint) bate com
o comportamento implementado. → **Reauditoria Opus**, depois Fase 5.

</details>

## ✅ Reauditoria Opus da 4.6 (2026-08-26) — **FASE 4 FECHADA**

Revisão restrita aos 10 arquivos do commit `30a8eb1`. Nenhum BLOQUEANTE,
nenhum IMPORTANTE restante. Confirmado **por execução**, não por leitura:

1. **Sequência completa do Achado A, inclusive o 2º `markResponded`** —
   `test:rls` 133/133. Mais que rodar verde: o teste foi submetido a
   **mutação**. Neutralizar o reset de `responded_at` (o `.eq('id', leadId)`
   do `update` em `regenerateStageFollowups` apontado para um uuid
   inexistente) deixa a suíte vermelha em
   `tests/actions/leads-followup.test.ts:346` —
   `expected '2026-08-26T17:08:15.812+00:00' to be null`. O teste é guarda de
   regressão de verdade, não teste que passa por acaso. Código restaurado com
   `git checkout --` logo em seguida; árvore limpa conferida.
2. **Tarefa manual sobrevive** — asserção explícita no mesmo teste
   (`manualAfter.status === 'pending'` depois das **duas** rodadas de
   cancelamento em massa). D-005 preservado.
3. **`responded_at` só zera quando follow-up novo é realmente gerado** — os
   dois early returns de `regenerateStageFollowups` (`rules.length === 0` e
   `schedule.length === 0`) acontecem antes do `update`, e o teste "mover pra
   estágio sem regras não zera `responded_at`" cobre o primeiro caso.
4. **Teclado, no browser real** (dev server + Supabase real, usuário
   `rls-test-a`, org de QA criada e removida): foquei `Concluir` da 1ª linha
   com `element.focus()` — não clique, pra ser o caminho puro de teclado — e
   apertei `Enter`: activity concluída, URL **continua** `/today`, e o
   `FollowupPrompt` apareceu ("Follow-up concluído para QA Linha Um. Agendar
   a próxima ação?"). Depois, foco na **linha** (`div[tabindex]`): `ArrowDown`
   moveu o foco pra linha seguinte (4.4 sem regressão) e `Enter` navegou pra
   `/leads/4d920191-…`, exatamente o lead da linha focada.
5. **As duas views têm teste que detectaria perda de `security_invoker`** — a
   prova é comportamental: B consulta a view filtrando por `org_id` de A e
   espera `[]`. Sem `security_invoker`, a view rodaria como dona, ignoraria a
   RLS das tabelas base e devolveria as linhas de A — o teste ficaria
   vermelho. `pg_class.reloptions` continua `security_invoker=true` nas duas.
6. **Erro de banco ≠ entidade inexistente** — `checkBelongsToOrg` só devolve
   `notFoundMessage` quando a consulta respondeu; teste com `stubTableError`
   afirma `not.toBe('Lead não encontrado.')`. Proteção cross-tenant intacta
   (o filtro `.eq('org_id', orgId)` não mudou) e nenhum `service_role` novo.
7. **`shouldCancelFollowups` é a fonte usada** — chamada em `moveStageCore`, e
   equivalente ao `stage.is_won || stage.is_lost` que substituiu:
   `nextStatus !== 'open'` ⟺ `is_won || is_lost` por construção da linha
   acima, e `respondedAt: null` neutraliza o único termo restante. Sem
   terceiro caminho, sem função de domínio órfã.
8. **Ordenação da timeline é determinística** — provado com o caso exato do
   Achado E: 3 activities inseridas num único `insert` ficaram com
   `created_at` idêntico ao microssegundo (`17:11:10.975345+00` nas três), e a
   página do lead devolveu a mesma ordem nos dois carregamentos.
9. **`typecheck` / `lint` / `test` (69/69) / `test:rls` (133/133) / `build`
   verdes**, e `get_advisors(security)` no schema `sales` com só os 3 WARN de
   **D-013**. Dados de QA removidos: `organizations`/`leads`/`activities`/
   `contacts`/`org_members` todos em `0`.

**Duas observações de MELHORIA FUTURA — nenhuma bloqueia a Fase 5, nenhuma
vira tarefa agora:**

- O cancelamento incondicional de `markRespondedCore` (a metade "defesa em
  profundidade" de D-027) **não tem cobertura**: pôr o cancelamento de volta
  atrás da guarda de idempotência mantém a suíte inteira verde (verificado por
  mutação). Não é defeito — com o reset de (1) o estado "`responded_at`
  preenchido **e** automático pendente" é inalcançável pelos fluxos atuais, e
  é justamente por isso que não há teste possível sem forjar o estado à mão.
  Passa a importar se a Fase 5 introduzir um segundo gerador de automáticos
  que não passe por `regenerateStageFollowups`.
- O desempate por `id` torna a ordem **estável**, não **semântica**: os 3
  passos do teste do item 8 aparecem como "Passo 2, Passo 1, Passo 3" — igual
  nos dois carregamentos, que é o que o Achado E pedia, mas fora da ordem de
  `step_number`. `.order('step_number')` daria as duas coisas. Cosmético; se
  a Fase 5 mexer em `listActivitiesForLead` pro join de `ai_run_id`, trocar
  ali sai de graça.

**Veredito: Fase 4 fechada. Liberado para a Fase 5.**

---

# FASE 5 — IA

### [x] 5.1 Infra de IA

- `0008_ai.sql`: `ai_prompts` e `ai_runs` conforme `DATABASE.md`.
- Portar de `../CRM-RR/lib/ai/`: `gateway.ts` (ajustar para `org_id` e `lead_id`),
  `render-template.ts`, `error-categories.ts`, `schemas.ts`.
- `AI_GATEWAY_API_KEY` no env. Modelo default `anthropic/claude-sonnet-5`.
- `runAiPrompt` deve falhar com mensagem clara e **gravar o erro em `ai_runs`** se a
  chave faltar ou o gateway cair — nunca falhar em silêncio.

**Feito:** migration `0009_ai.sql` (número real por `DATABASE.md` → Ordem das
migrations — a tabela já documentava 0009, o texto acima ficou desatualizado)
commitada antes de aplicar, aplicada no projeto real, FK antecipada de
`activities.ai_run_id` fechada. `sales.ai_prompts`/`sales.ai_runs` com RLS
`tenant_isolation`, índice parcial de prompt ativo por slug. `database.types.ts`
atualizado à mão (MCP `generate_typescript_types` só introspecta `public`,
que neste projeto compartilhado pertence a outro app — limitação já
documentada no cabeçalho do próprio arquivo). `get_advisors(security)` sem
alerta novo atribuível a `sales`.

Portados `render-template.ts` e `error-categories.ts`, idênticos ao CRM-RR.
`gateway.ts` portado com adaptação de assinatura (client+`orgId` explícitos,
padrão `*-core`) e `schemas.ts` **não portado** — ambos os desvios são D-028,
com a justificativa completa. Resumo: `gateway.ts` segue D-020 em vez de
resolver a própria sessão (é isso que a action da 5.4 vai chamar), e
`schemas.ts` do CRM-RR é schema de qualificação de deal B2B, fora do escopo
de IA do MVP (`ARCHITECTURE.md` → Camada de IA) — a própria tabela de port do
`ARCHITECTURE.md` já não o listava.

Testes: `tests/ai/render-template.test.ts` (4, puro) e
`tests/actions/ai-gateway.test.ts` (5, Supabase real + `generateText`
mockado — sucesso grava `pending_review`, isolamento entre orgs, slug sem
prompt não grava nada, gateway caindo grava `status='error'` e relança,
`leadId`/`contactId` persistidos). `typecheck`/`lint`/`test` (77/77)/
`test:rls` (138/138)/`build` verdes.

Não implementado (fora do escopo da 5.1, entra na 5.4): nenhuma action
`'use server'` chama `runAiPrompt` ainda — não há botão de IA na UI. Validação
cross-tenant de `leadId`/`contactId` passados a `runAiPrompt` é
responsabilidade do chamador (D-028), a ser exercida quando a action da 5.4
existir.

### [x] 5.2 Prompt de follow-up

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

**Feito:** migration `0010_seed_followup_proposta_prompt.sql` — `create or replace
function sales.seed_org_defaults` reproduzindo o corpo de 0004+0007 na íntegra e
acrescentando só o `insert into sales.ai_prompts` do `followup_proposta` v1
(`model` default `anthropic/claude-sonnet-5`, `temperature` 0.7, `is_active`).
Migration nova, não edição da 0009 (já aplicada — "nova mudança de banco = nova
migration"); o `0010_audit.sql` reservado para a 5.4 passa a `0011_audit.sql` na
tabela de ordem do `DATABASE.md`. Commitada antes de aplicar; aplicada no projeto
real; `get_advisors(security)` sem alerta novo atribuível a `sales` (a lista de
WARNs é a herança conhecida de `public` + `create_organization`/`current_org_ids`
já aceitos nas Fases 2/3).

`renderTemplate` (`lib/ai/gateway.ts`, 5.1) só interpola `user_prompt_template` —
**o wrapper/core da 5.1 não foi tocado.** Por isso `{{empresa}}` e as demais 9
variáveis do contrato vivem no template de usuário; o `system_prompt` as referencia
como "a empresa identificada na mensagem". O texto do contrato acima diz "em nome de
{{empresa}}" no bloco **System**, mas colocar placeholder ali seria interpolação de
`system_prompt`, mudança na função portada — registrado em `DECISIONS.md` **D-029**
para o Opus decidir se quer o comportamento (`gateway.ts` renderizar os dois
templates) num checkpoint futuro.

Schema Zod de saída em `lib/ai/schemas.ts` (`followupPropostaOutputSchema` =
`{ message: string, tone: 'direto'|'consultivo'|'leve', reasoning: string }` +
`FollowupPropostaOutput`) — arquivo novo, não portado (D-028: "cada schema nasce na
tarefa que precisa dele"). Ainda sem call site: a action da 5.4 é quem vai passar
`schema` para `runAiPrompt`.

Testes: `tests/ai/followup-proposta-schema.test.ts` (4, puro — enum, campo
faltando, tipo errado) e um `it` novo no bloco `seed_org_defaults` de
`tests/rls.test.ts` (org nova recebe 1 `followup_proposta` ativo v1, modelo/temp
corretos, variáveis no template de usuário, `system_prompt` sem `{{` pendente, e
coerência: as `followup_rules` semeadas apontam para o slug que existe).
`typecheck`/`lint`/`test` (77/77 — +4 do schema; o "77" citado na 5.1 era
contagem furada, o real pós-5.1 era 73)/`test:rls` (139/139 — +1 do `it` do
seed)/`build` verdes.

### [x] 5.3 Contexto real do lead

`lib/queries/ai-context.ts`: `buildFollowupContext(leadId)` monta as variáveis a
partir do banco — nome, título, interesse, valor formatado, dias desde o último
contato, estágio, passo, e um resumo das últimas 5 atividades.

**Valor só entra no contexto se `value_cents > 0`.** Enviar "R$ 0,00" faz a IA
escrever bobagem sobre preço. Regra da `PRODUCT_SPEC.md` #1 aplicada na prática.

> feito: `lib/domain/ai-context.ts` (puro — `buildFollowupVars` +
> `resolveFollowupStep` + `FOLLOWUP_VAR_KEYS`) e `lib/queries/ai-context.ts`
> (`buildFollowupContext`). Nenhuma migration, nenhum arquivo de banco tocado;
> `renderTemplate`/wrapper/core da 5.1 intocados (D-029 não exigido pela 5.3 — o
> `system_prompt` do seed não tem placeholder). Nenhuma action/UI chama IA ainda
> (isso é 5.4); `buildFollowupContext` não chama o gateway, só monta `vars` +
> `leadId` + `contactId` para a 5.4 passar a `runAiPrompt`.
>
> **Assinatura `buildFollowupContext(supabase, orgId, leadId)`** em vez do
> `(leadId)` literal do texto — registrado em **D-030**: mesma razão de D-028
> (`gateway.ts`) e D-020 (`*-core`), client+org explícitos vindos da action
> `'use server'` da 5.4, o que torna o isolamento entre tenants testável sem
> `cookies()`. `orgId` sempre server-side.
>
> **Contexto só do tenant atual:** lead + contato + estágio + organização +
> atividades, cada `select` filtrado por `org_id` (colunas listadas, sem
> `select *`). Lead fora da org (ou `orgId` que não é do usuário) → lança
> `Lead não encontrado.`, nunca contexto parcial. Contato/estágio ausentes na
> org lançam como invariante quebrada (D-020 valida na escrita). Erro de banco
> é propagado (lança), nunca vira contexto vazio silencioso.
>
> **Campos opcionais — comportamento explícito** (`PRODUCT_SPEC.md` #1: "se não
> tem o dado, declara que não tem"): `valor` só formatado quando
> `value_cents > 0`, senão sentinel `'não informado'` — a linha fixa
> `Valor: {{valor}}` do template do seed 0010 nunca renderiza vazia (teste
> cobre). `interesse` nulo/em branco → `'não informado'`.
> `dias_desde_ultimo_contato` sem `last_contact_at` → `'não informado'` (não
> inventa 0); `done_at` no futuro trava em `'0'`. `historico_resumido` sem
> atividades → `'sem histórico registrado'`; senão até 5 linhas
> (`formatRelativeDateBR` + título + `[pendente]`/`[cancelada]`).
> `passo_followup` = menor `step_number` entre as pendentes automáticas; sem
> nenhuma → `1` (passo de menor pressão), explícito. Telefone/dinheiro/data via
> os helpers de `lib/domain/` já existentes (`formatBRL`, `formatRelativeDateBR`).
>
> Testes: `tests/domain/ai-context.test.ts` (22, puro — valor/interesse/dias/
> histórico/passo, contrato das 9 chaves travado por `FOLLOWUP_VAR_KEYS`,
> render da linha `Valor:`) e `tests/actions/ai-context.test.ts` (12, Supabase
> real na suíte `test:rls` — contexto completo, cross-tenant nos 3 sentidos
> (B→lead de A, A com `orgId` de B, A→lead de B), lead inexistente/ inválido,
> valor/interesse ausentes ponta a ponta, `dias` a partir de `last_contact_at`,
> erro de banco em `leads` e em tabela relacionada). `typecheck`/`lint`/
> `test` (99/99, +22)/`test:rls` (151/151, +12)/`build` verdes. `get_advisors`
> não aplicável — 5.3 não altera o schema.

### [x] 5.4 Gerar, revisar, usar

- Botão `Gerar mensagem com IA` na linha de ação e no lead.
- Painel de revisão: mensagem gerada em textarea **editável**, com o `reasoning`
  ao lado. Botões: `Copiar`, `Gerar outra versão`, `Usar esta`, `Descartar`.
- `Usar esta` grava o texto em `activities.body`, vincula `ai_run_id`, marca o run
  como `reviewed`. `Descartar` marca `discarded`.
- `Copiar` copia para a área de transferência com feedback visual. **Nada é enviado
  automaticamente no MVP.**
- `0011_audit.sql` + `lib/actions/audit.ts` portado do CRM-RR: registrar
  `create`/`update`/`stage_change`/`cancel_followups`/`ai_used`.

**Pronto quando:** dá pra gerar mensagem para um lead real, editar, copiar, colar no
WhatsApp e marcar como enviada — e o `ai_run` fica registrado com tokens e latência.

> **Feito:** migration `0011_audit.sql` (`sales.audit_logs` + RLS `tenant_isolation`
> + índice) commitada antes de aplicar, aplicada no projeto real,
> `get_advisors(security)` sem alerta novo atribuível a `sales`, `database.types.ts`
> atualizado à mão. `lib/actions/audit.ts` portado do CRM-RR com assinatura adaptada
> (`client`/`orgId`/`userId` explícitos, sem `server-only` — **D-031**).
>
> Primeira action real de IA: `lib/actions/ai-followup-core.ts`
> (`generateFollowupMessageCore` / `applyFollowupMessageCore` / `discardAiRunCore`) +
> wrapper `lib/actions/ai-followup.ts` (`'use server'`). `generate` monta o contexto
> via `buildFollowupContext` (5.3), chama `runAiPrompt` (5.1) com
> `followupPropostaOutputSchema` (5.2) e revalida a saída — erro de
> contexto/gateway/schema vira `{ ok: false }`, nunca sucesso. `applyFollowupMessage`
> revalida `runId`/`activityId`/`leadId` contra `org_id` antes de gravar
> `activities.body` + `ai_run_id`, marca o `ai_run` como `reviewed` e grava
> `audit_logs` (`ai_used`). `discardAiRun` → `discarded` (idempotente). `orgId`
> sempre server-side; texto editável revalidado por `messageSchema`. **D-031** para
> os desvios; **Q-006** para instrumentar os outros verbos de auditoria
> (`create`/`update`/`stage_change`/`cancel_followups`) nas actions das Fases 3–4 —
> fora do escopo desta tarefa.
>
> UI: `components/ai/FollowupGenerator.tsx` (cliente, autossuficiente, fala só com
> `lib/actions/ai-followup.ts`) — botão "Gerar IA" + painel de revisão (textarea
> editável, `reasoning`, `Copiar`/`Gerar outra versão`/`Usar esta`/`Descartar`).
> Renderizado na `ActionRow` (tela de hoje, `variant="dropdown"`) e na tela do lead
> quando há follow-up pendente (`variant="inline"`). Nada é enviado automaticamente.
>
> Testes: `tests/actions/ai-followup.test.ts` (15, suíte `test:rls`, `generateText`
> mockado — sucesso grava `pending_review` com tokens/latência/lead/contato,
> cross-tenant em 4 sentidos (B→lead de A, A com `orgId` de B, run de A usado por B,
> activity de B via A), gateway caindo → `error` + `ok:false`, schema inválido →
> `ok:false`, erro de banco no contexto/no run → `ok:false`, "usar esta" grava
> body/`ai_run_id`/`reviewed`/`audit_logs`, mensagem vazia rejeitada, activity fora
> do lead rejeitada, descartar → `discarded` idempotente). `typecheck`/`lint`/
> `test` (99/99)/`test:rls` (166/166, +15)/`build` verdes.

---

# FASE 6 — Testes e validação com dados reais

### [x] 6.1 Seed de demonstração

- `supabase/seed/run.ts` e `purge.ts` (padrão do CRM-RR, via service role):
  1 organização demo, 12 contatos, 18 leads espalhados pelos estágios, atividades
  com datas realistas (algumas atrasadas, algumas hoje, algumas futuras).
- **Tudo com `is_demo = true`.** `purge.ts` remove só `is_demo` — nunca toca em dado
  real. Confirmação explícita antes de rodar purge.

> feito: `supabase/seed/{load-env,client,demo-data,run,purge}.ts`. Nenhuma
> migration, nenhuma mudança de schema — `is_demo` já existia em
> `contacts`/`leads`/`activities` desde as Fases 3–4. **D-032** para os desvios.
>
> `demo-data.ts` é puro (geradores testáveis, zero I/O); `run.ts`/`purge.ts`
> são a orquestração que fala com o banco. `client.ts` monta o próprio client
> de `service_role` lendo `process.env` — não importa `lib/supabase/admin.ts`
> (tem `import 'server-only'`, que lança sob `tsx` puro; mesma razão de
> `tests/helpers/rls-fixtures.ts`). `load-env.ts` popula `process.env` a
> partir de `.env.local` via `loadEnv` do Vite (igual a
> `tests/setup/load-env.ts`).
>
> **Org demo:** `create_organization` não serve (precisa de `auth.uid()`), então
> `run.ts` faz insert direto em `organizations` (slug fixo `devrr-demo`, service
> role bypassa RLS) + `rpc('seed_org_defaults', ...)` para catálogos/regras/
> prompt — `service_role` tem execute nessa função (default privileges da 0001,
> `authenticated` não tem). `seed_org_defaults` foi adicionada ao bloco
> `Functions` de `lib/types/database.types.ts` (existia desde a 0004, sem call
> site até agora).
>
> **Idempotente:** cada `seed:demo` apaga o dado `is_demo` da org e reinsere
> (ids gerados no cliente com `randomUUID`, sem depender da ordem de retorno do
> insert). `leads.next_action_at` recalculado com `resolveNextAction`
> (`lib/domain/followup`, D-006).
>
> **Sem `org_member`:** a org demo não é vinculada a nenhum usuário por padrão
> (não há convite no MVP) — fica invisível no app até alguém ser adicionado.
> `SEED_DEMO_OWNER_EMAIL` (opcional) faz `run.ts` vincular um usuário existente
> como `owner`.
>
> **`purge.ts`:** apaga `is_demo = true` de `activities`/`leads`/`contacts` no
> schema inteiro. Sem `--yes` (ou `SEED_PURGE_CONFIRM=yes`) só mostra a
> contagem que seria removida e sai. Não remove a org demo nem os catálogos
> (não têm `is_demo`).
>
> Validado no projeto real: `seed:demo` → 1 org, 7 estágios / 6 fontes / 3
> regras / 1 prompt, 12 contatos + 18 leads (7 estágios distintos, 5 sem
> valor, 15 abertos com `next_action_at`) + 41 atividades (5 pendências
> atrasadas, 10 futuras, 26 de histórico). Segunda execução: contagens
> idênticas (idempotência). `seed:purge` dry-run mostrou 71 linhas; `--yes`
> removeu as 71, org + catálogos preservados; zero linha real tocada (o schema
> `sales` não tinha dado não-demo). Testes: `tests/seed/demo-data.test.ts` (11,
> puro). `typecheck`/`lint`/`test` (110/110)/`test:rls` (166/166, sem
> regressão)/`build` verdes. `advisors`/`replay` não aplicável (sem DDL).

### [x] 6.2 Testes de fluxo

- Unitários: tudo em `lib/domain/` (`followup`, `phone`, `money`, `next-action`).
- Integração das actions com Supabase de teste: criar lead → mover para
  `proposta_enviada` → 3 follow-ups gerados nas datas certas → `markResponded` →
  os 3 cancelados → `next_action_at` vira null.
- Idempotência: mover A→B→A não duplica follow-up.
- Meta de cobertura: **100% em `lib/domain/`**, 80% no resto.

> feito: sem migration, sem mudança de schema. As Fases 3–5 já escreveram a
> maior parte destes testes conforme implementavam; a 6.2 fecha as lacunas e
> instrumenta a cobertura. **D-033** para o desvio (ferramenta de cobertura).
>
> **Cobertura:** `@vitest/coverage-v8` adicionado (devDep), script novo
> `npm run test:coverage` (`vitest run --coverage`) — **não** entra no
> `npm run test` que as outras tarefas rodam a cada commit; é opt-in. Escopo
> em `vitest.config.ts` → `coverage.include = ['lib/domain/**/*.ts']` com
> `thresholds` 100% (statements/branches/functions/lines). `lib/domain/` bate
> **100% nos quatro** (168/168 stmts, 82/82 branches, 19/19 funcs). O resto de
> `lib/` (actions/queries) é exercitado pela suíte `test:rls` (167 testes,
> Supabase real) — um número único de cobertura combinando as duas suítes não
> é produzido aqui: `test:rls` precisa de rede e roda em config própria
> (`fileParallelism: false`), mesma razão de ela já ser separada desde a 2.4.
>
> **Lacunas de domínio fechadas para chegar a 100%:** `followup.ts` —
> `pushIntoBusinessWindow` ganhou testes para "entrada antes da abertura"
> (07h → 09h do mesmo dia), "entrada depois do fechamento" (19h → 09h do dia
> útil seguinte) e `businessHours.days: []` (guarda de 8 iterações corta o
> laço, não trava); `computeFollowupSchedule` sem `now` (cai em `new Date()`);
> `resolveNextAction` com pendentes em ordem crescente (ramo `else` do
> `reduce`). `ai-context.ts` — atividade sem `done_at`/`due_at` (carimbo cai
> em `created_at`) e `buildFollowupVars` sem `now`. `tests/domain/` passou de
> 99 para 117 testes.
>
> **Fluxo ponta a ponta (6.2):** novo `it` em `tests/actions/leads-followup.test.ts`
> → `markRespondedCore` que faz a cadeia completa da spec: criar lead → mover
> para `proposta_enviada` (3 automáticos, datas conferidas contra
> `computeFollowupSchedule` com tolerância de 10s) → `next_action_at` não-nulo
> → `markResponded` → os 3 `cancelled` → **`next_action_at` vira `null`** (sem
> tarefa manual plantada, nada sobra). A assimetria "não zera quando sobra
> manual" já era coberta pelo teste de reentrada (D-027).
>
> **Idempotência A→B→A:** já coberta desde a 4.3
> (`tests/actions/leads-followup.test.ts` → "mover A→B→A não duplica":
> 3 pendentes + 3 cancelados = 6 no total, nunca 9). Sem duplicação.
>
> Validação: `typecheck`/`lint`/`test` (117/117)/`test:coverage`
> (`lib/domain/` 100%)/`test:rls` (167/167, +1)/`build` verdes.
> `advisors`/`replay` não aplicável (sem DDL).

### [x] 6.3 Reconciliação de caches

> ✅ **DESBLOQUEADA** no checkpoint da Fase 6. **Q-007 resolvida por D-034**:
> `createAdminClient()` (`service_role`) dentro do próprio route handler, construído
> **somente depois** de `CRON_SECRET` bater em comparação de tempo constante.
> Descartadas a função `security definer` nova e o `pg_cron` — leia D-034 antes de
> começar; a justificativa e as guardas obrigatórias estão lá e **não** são
> renegociáveis nesta tarefa.

Rede de segurança do cache denormalizado `leads.next_action_at` / `leads.last_contact_at`
(`DATABASE.md` → "Sobre os caches denormalizados", D-006). Roda diário, cross-tenant,
**corrige** o que estiver divergente e registra o que corrigiu.

**Por que corrigir e não só logar:** `sales.v_leads_without_action` filtra
`l.next_action_at is null`. Um `next_action_at` obsoleto e não-nulo **esconde da tela
um lead esquecido** — a falha silenciosa que o produto existe para evitar
(`PRODUCT_SPEC.md`). Um cache sabidamente errado e deixado errado é pior que não ter
cache. A correção é idempotente e converge: recalcula do zero a partir das
`activities` do próprio lead.

Sem migration, sem DDL — `advisors`/`replay` não se aplicam.

---

#### 6.3.1 `proxy.ts` — excluir `/api/cron` do matcher (achado B do checkpoint da Fase 1, D-012)

**Fazer isto primeiro.** Como está, `updateSession` redireciona toda request sem
cookie de sessão para `/login`; a request do Vercel Cron se autentica por header.
Resultado seria `307` e nenhuma execução, **sem um único erro no log**. O CRM-RR tem
esse defeito hoje.

```
'/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
```

Excluir **`api/cron`**, não `api` inteiro: rota de API nova continua nascendo
protegida por default (é a regra de D-012 — o default seguro vale mais que a
granularidade).

#### 6.3.2 `lib/env.server.ts` — endurecer `CRON_SECRET`

`CRON_SECRET` deixou de ser "um header a mais" e virou a **única** autenticação de uma
rota privilegiada fora do `proxy.ts`. Subir de `.min(1)` para `.min(32)` com mensagem
própria. Atualizar o comentário de `.env.example` dizendo que o valor precisa ser
aleatório de ≥32 caracteres e que **a Vercel injeta `Authorization: Bearer $CRON_SECRET`
automaticamente** nas requests de Cron quando a env var existe no projeto.

#### 6.3.3 `lib/domain/` — uma definição só da regra, testável

Entra no gate de cobertura de 100% (`vitest.config.ts` → `coverage.include`, D-033).

1. **`lib/domain/followup.ts`** — extrair `resolveLastContact(activities): Date | null`
   (= maior `done_at`, `null` sem nenhum). Hoje essa regra está **inline** dentro de
   `recalculateLeadCache` (`lib/actions/leads-core.ts`, o `doneAts.reduce`). Extrair é
   obrigatório, não cosmético: se o reconciliador reimplementar a regra, ele passa a
   "corrigir" o cache para um valor que a aplicação não escreveria — o detector vira
   fonte de divergência. Estender `ActivityLike` com `done_at: string | Date | null`.
2. **`lib/actions/leads-core.ts`** — `recalculateLeadCache` passa a chamar
   `resolveLastContact`. Refactor de comportamento idêntico; os testes existentes de
   `tests/actions/` são a regressão.
3. **`lib/domain/reconcile.ts`** (novo, puro) —
   `computeLeadCacheFixes(leads, activitiesByLead)` devolve **só os leads divergentes**,
   com valor esperado e valor atual (`before`/`after`, para o `diff` da auditoria).

**Comparação por epoch, nunca por string.** A aplicação grava `toISOString()`
(`...Z`); o PostgREST devolve timestamptz como `...+00:00`. Comparar as strings cruas
marcaria **todo lead como divergente em toda execução** e reescreveria a tabela
inteira todo dia. Comparar `getTime()`; `null` × `null` é igual; `null` × valor é
divergência.

#### 6.3.4 `lib/actions/reconcile-core.ts` (novo) — o lote

Padrão `*-core` de D-020: **recebe o client como parâmetro**, não constrói nenhum.
Não importa `lib/supabase/admin.ts` (tem `import 'server-only'`, que lança sob
vitest — mesma razão de `tests/helpers/rls-fixtures.ts` e de `audit.ts`).

```ts
export interface ReconcileRunResult {
  orgs: number
  leadsChecked: number
  leadsFixed: number
  errors: string[]   // mensagens genéricas, sem identificador de tenant
}
export async function reconcileAllOrgs(supabase: SalesClient): Promise<ReconcileRunResult>
export async function reconcileOrg(supabase: SalesClient, orgId: string): Promise<ReconcileOrgResult>
```

- **Escopo:** todo lead com `status = 'open'`, de toda organização. Leads `won`/`lost`
  ficam de fora — as duas views (`v_today_actions`, `v_leads_without_action`) filtram
  `l.status = 'open'`, então cache obsoleto em lead fechado é inerte. Se alguma view
  futura deixar de filtrar por status, esta decisão volta à mesa. Leads `is_demo`
  **não** são excluídos (dado demo inconsistente também engana).
- **Paginação obrigatória.** O PostgREST corta em 1000 linhas por default, em
  silêncio: sem `.range()` o job reconciliaria só a primeira página e reportaria
  sucesso. Páginas de 500, laço enquanto a página vier cheia — tanto para `leads`
  quanto para `activities`.
- **Uma organização que falha não derruba o lote.** Erro por org é capturado,
  acumulado em `errors` e o laço segue para a próxima.
- **Só grava lead divergente.** `leads` tem trigger `leads_set_updated_at` (0005):
  um `update` incondicional carimbaria `updated_at` de toda a base todo dia e
  destruiria o sinal de "mexido recentemente". Um `update` por lead divergente,
  filtrando `.eq('id', leadId).eq('org_id', orgId)` — o `org_id` fica no filtro mesmo
  sob `service_role`, como declaração do write set.
- **Write set fechado (D-034):** `leads.next_action_at`, `leads.last_contact_at` e
  `insert` em `audit_logs`. Nada mais. Nunca `delete`.

**Auditoria.** Por lead corrigido: `entity: 'lead'`, `entity_id: leadId`,
`action: 'cache_reconciled'`, `user_id: null` (sistema), `diff: { before, after }`.
Por organização **que teve pelo menos uma correção**: `entity: 'organization'`,
`entity_id: orgId`, `action: 'cache_reconcile_run'`, `diff: { leads_checked, leads_fixed }`
— org sem divergência não gera linha nenhuma (senão a tabela cresce todo dia sem
informação). Inserir as linhas da org **em um único `insert` de array**, não uma
chamada de `logAudit` por lead: `logAudit` é uma linha por round-trip, o que num job
de lote é N+1. Mantém a semântica best-effort de `lib/actions/audit.ts` — falha ao
gravar auditoria **não** derruba a reconciliação nem invalida a correção já feita.

#### 6.3.5 `lib/api/cron-auth.ts` (novo) — o segredo, em tempo constante

```ts
export function isAuthorizedCronRequest(authorizationHeader: string | null, secret: string): boolean
```

Aceita **só** `Authorization: Bearer <secret>` (é o que o Vercel Cron emite).
Comparação: `timingSafeEqual` sobre o **`sha256` dos dois lados**, nunca sobre os
bytes crus — `timingSafeEqual` lança quando os buffers têm tamanhos diferentes, e o
próprio lançar já é canal lateral de comprimento. Header ausente ou malformado →
`false`, sem lançar. Sem `import 'server-only'` (o segredo chega por parâmetro), para
ser testável direto.

#### 6.3.6 `app/api/cron/reconcile/route.ts` (novo) — fino

```ts
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: Request) { ... }
```

Ordem exata, e ela é a decisão de segurança (D-034):

1. `isAuthorizedCronRequest(request.headers.get('authorization'), serverEnv.CRON_SECRET)`;
2. falhou → `401` com corpo genérico (`{ error: 'unauthorized' }`), **sem** ter
   chamado `createAdminClient()`. Request não autenticada nunca constrói client
   privilegiado;
3. passou → `createAdminClient()` → `reconcileAllOrgs(supabase)`.

- Só `GET` é exportado; qualquer outro método vira `405` pelo próprio Next.
- **Zero entrada do cliente:** nenhum query param, header ou body influencia escopo,
  filtro ou limite.
- **Resposta sem dado de tenant:** só contadores (`orgs`, `leadsChecked`,
  `leadsFixed`, `durationMs`, `errors: number`). Nunca `org_id`, nome de organização,
  id ou título de lead — nem no corpo de sucesso, nem em mensagem de erro.
- `errors.length > 0` → responder **500** com os mesmos contadores, para o run
  aparecer como falho no histórico de Cron da Vercel em vez de passar batido.
- **Resumo da execução no log:** uma linha estruturada
  (`console.log(JSON.stringify({ job: 'reconcile', ... }))`). O log da Vercel é do
  operador, não é resposta HTTP — ali `org_id` pode aparecer no detalhe por org. O
  segredo nunca é logado.

#### 6.3.7 `vercel.json` (novo, em `devrr-sales-ai/`)

```json
{ "crons": [{ "path": "/api/cron/reconcile", "schedule": "0 9 * * *" }] }
```

`0 9 * * *` UTC = **06:00 BRT**, antes do início do expediente default (09:00 local),
para a tela "Ações de hoje" já nascer correta no começo do dia. Schedules da Vercel
são sempre UTC e Cron **só roda em deploy de Production**.

`vercel.ts` seria a forma recomendada hoje, mas exige a dependência `@vercel/config`
para uma entrada de cron — a stack é pinada de propósito (`CLAUDE.md` → Stack fixada)
e o ganho não paga a devDep. `vercel.json` é estático, zero dep.

Conferir no painel da Vercel (projeto `devrr-sales-ai`) que `CRON_SECRET` existe em
**Production** — sem a env var a Vercel não injeta o `Authorization`, e a rota
responde `401` a cada execução agendada.

#### 6.3.8 Testes

| Arquivo | Suíte | Prova |
|---|---|---|
| `tests/domain/reconcile.test.ts` | `test` | sem divergência → nada; `next_action_at` obsoleto não-nulo sem pendente → corrige para `null` (o caso que esconde lead da tela); cache `null` com pendente → menor `due_at`; `last_contact_at` = maior `done_at`, `null` sem `done_at`; lead sem activity → os dois `null`; **mesmo instante em `...Z` e `+00:00` não é divergência** |
| `tests/domain/followup.test.ts` | `test` | `resolveLastContact` extraída (mantém 100% do gate de `lib/domain/`) |
| `tests/api/cron-auth.test.ts` | `test` | segredo certo → `true`; segredo errado de mesmo tamanho → `false`; de tamanho diferente → `false` **sem lançar**; header ausente / sem `Bearer` / token vazio → `false` |
| `tests/api/cron-reconcile.test.ts` | `test` | sem header → `401`; segredo errado → `401`; **e `createAdminClient` não foi chamado** em nenhum dos dois (é a asserção de segurança central); segredo certo → `200` e chamou `reconcileAllOrgs`; `errors` não vazio → `500`; nenhum corpo de resposta contém `org_id`/id de lead |
| `tests/actions/reconcile.test.ts` | `test:rls` | Supabase real, duas orgs: planta divergência em cada uma (corrompe `leads.next_action_at` direto pelo client admin), roda `reconcileAllOrgs`, **as duas** são corrigidas (prova o cross-tenant); lead já correto **não** tem `updated_at` alterado; `audit_logs` ganha as linhas na org certa; **segunda execução corrige 0** (idempotência) |
| `tests/proxy-matcher.test.ts` | `test` | regex de `config.matcher`: `/api/cron/reconcile` **não** casa; `/today`, `/login` e `/api/qualquer-outra` casam (regressão de 6.3.1) |

`tests/api/**` cai na suíte default (`vitest.config.ts` inclui `tests/**/*.test.ts` e
só exclui `rls.test.ts` + `tests/actions/**`). O teste da rota roda sem rede:
`vi.mock('server-only', () => ({}))` + mocks de `@/lib/env.server`,
`@/lib/supabase/admin` e `@/lib/actions/reconcile-core`, com `await import()` da rota
depois dos mocks.

`tests/helpers/rls-fixtures.ts` precisa **exportar** o `testAdminClient` que hoje é
privado (o teste de `test:rls` precisa de um client de `service_role`).

#### 6.3.9 Docs a atualizar junto

- `lib/supabase/admin.ts` — o docstring ainda diz "Só para scripts server-only
  (seed/purge de dados demo)". Trocar pela lista fechada de D-034.
- `IMPLEMENTATION_PLAN.md` — marcar `[x]` e escrever o "o que mudou", como sempre.

**Pronto quando:** `typecheck`/`lint`/`test`/`test:coverage` (`lib/domain/` segue em
100%)/`test:rls`/`build` verdes; `vercel.json` commitado; `CRON_SECRET` (≥32) presente
em Production; e uma chamada manual à rota em Production com o header correto devolve
`200` com contadores, e sem o header devolve `401` (não `307` — é a prova de que
6.3.1 funcionou).

**Fora do escopo:** instrumentar `audit_logs` nas actions das Fases 3–4 (é Q-006);
reconciliar leads fechados; qualquer segunda rota de cron.

> feito: sem migration, sem DDL — `advisors`/`replay` não aplicável. Contrato
> inteiro de D-034 implementado, nada renegociado.
>
> **6.3.1** `proxy.ts` — `api/cron` entrou no negative lookahead do matcher
> (`'/((?!api/cron|_next/static|...).*)'`). Novo `tests/proxy-matcher.test.ts`:
> `/api/cron/reconcile` não casa; `/today`, `/login`, `/onboarding`,
> `/api/qualquer-outra` casam; assets seguem fora.
>
> **6.3.2** `lib/env.server.ts` — `CRON_SECRET` de `.min(1)` para `.min(32)`
> com mensagem própria. `.env.example` atualizado (valor aleatório ≥32; a
> Vercel injeta `Authorization: Bearer $CRON_SECRET` em Production quando a
> env var existe). `.env.local` local já tem 64 chars — nenhum boot quebrou.
>
> **6.3.3** `lib/domain/followup.ts` — `resolveLastContact(activities): Date | null`
> extraída (= maior `done_at`, `null` sem nenhum); era o `doneAts.reduce`
> inline de `recalculateLeadCache`. `ActivityLike` ganhou `done_at?: string |
> Date | null` (opcional — o seed 6.1 só resolve `next_action_at`).
> `recalculateLeadCache` (`lib/actions/leads-core.ts`) passou a chamar
> `resolveLastContact` — refactor de comportamento idêntico, coberto pelos
> testes `test:rls` existentes. Novo `lib/domain/reconcile.ts` (puro):
> `computeLeadCacheFixes(leads, activitiesByLead)` devolve só os divergentes
> com `before`/`after`. Comparação **por epoch** (`getTime()`), nunca string —
> `null`×`null` igual, `null`×valor divergência. Ambos entram no gate de
> cobertura de `lib/domain/` (segue **100%**: 208/208 stmts, 110/110 branches).
>
> **6.3.4** `lib/actions/reconcile-core.ts` (novo) — `reconcileAllOrgs` /
> `reconcileOrg`, padrão `*-core` (recebe o client, não importa `admin.ts`).
> Escopo: leads `status = 'open'` de toda org (demo incluído). Paginação de
> 500 em `organizations`, `leads` e `activities` (laço enquanto a página vier
> cheia). Uma org que falha não derruba o lote (erro genérico acumulado em
> `errors`, sem id de tenant); falha ao listar orgs derruba o run. Só grava
> lead divergente, `update` filtrado por `id`+`org_id` (write set declarado).
> Write set fechado: `next_action_at`, `last_contact_at`, `insert` em
> `audit_logs` — nunca `delete`, nunca outra tabela. Auditoria em um único
> `insert` de array por org com ≥1 correção: linha `cache_reconciled`
> (`user_id: null`, `diff: {before, after}`) por lead + linha
> `cache_reconcile_run` (`entity: 'organization'`, `diff: {leads_checked,
> leads_fixed}`). Best-effort — falha de auditoria não derruba a correção.
>
> **6.3.5** `lib/api/cron-auth.ts` (novo) — `isAuthorizedCronRequest(header,
> secret)`. Só `Authorization: Bearer <secret>`. `timingSafeEqual` sobre o
> `sha256` dos dois lados (digests de 32 bytes → nunca lança, não vaza
> comprimento). Header ausente/malformado/token vazio → `false`. Sem
> `server-only` (segredo por parâmetro).
>
> **6.3.6** `app/api/cron/reconcile/route.ts` (novo) — `GET`, `dynamic =
> 'force-dynamic'`, `maxDuration = 60`. Ordem: valida segredo → `401` genérico
> **sem** ter chamado `createAdminClient()` → só então `createAdminClient()` +
> `reconcileAllOrgs`. Zero entrada do cliente. Resposta só com contadores
> (`orgs`, `leadsChecked`, `leadsFixed`, `durationMs`, `errors: number`) — sem
> `org_id`/id de lead no corpo nem em erro. `errors.length > 0` → `500`. Linha
> estruturada no log (`{ job: 'reconcile', ... }`, `errors` por extenso ali —
> log é do operador). Outros métodos → `405` pelo próprio Next.
>
> **6.3.7** `vercel.json` (novo em `devrr-sales-ai/`) —
> `{ "crons": [{ "path": "/api/cron/reconcile", "schedule": "0 9 * * *" }] }`
> (`0 9 UTC` = 06:00 BRT). **Pendente de operador:** confirmar no painel da
> Vercel (projeto `devrr-sales-ai`) que `CRON_SECRET` existe em **Production**
> e rodar a chamada manual (`200` com header, `401` sem) — Cron só roda em
> deploy de Production, não verificável daqui.
>
> **6.3.8** Testes: `tests/domain/reconcile.test.ts` (7), `resolveLastContact`
> em `tests/domain/followup.test.ts` (+5, 29 no total), `tests/api/cron-auth.test.ts`
> (6), `tests/api/cron-reconcile.test.ts` (5 — mock de `server-only`/`env.server`/
> `admin`/`reconcile-core`, `import()` da rota depois; asserção central:
> `createAdminClient` **não** chamado nos dois `401`), `tests/actions/reconcile.test.ts`
> (`test:rls`, 4 — duas orgs, planta divergência em cada, corrige as duas,
> lead consistente sem `updated_at` alterado, `audit_logs` na org certa,
> segunda execução corrige 0), `tests/proxy-matcher.test.ts` (4).
> `tests/helpers/rls-fixtures.ts` → `testAdminClient` agora exportado.
>
> **6.3.9** Docstring de `lib/supabase/admin.ts` trocado pela lista fechada de
> D-034.
>
> Validação: `typecheck`/`lint`/`test` (144/144)/`test:coverage` (`lib/domain/`
> 100%)/`test:rls` (171/171, +4)/`build` verdes.

### [x] 6.4 Validar RLS de novo, com tudo pronto

Reexecutar `tests/rls.test.ts` estendido para todas as tabelas criadas nas Fases 3-5,
incluindo `ai_runs` e `audit_logs`. Rodar `get_advisors(type:'security')` e
`get_advisors(type:'performance')`. Resolver todo alerta.

**Pronto quando:** advisors limpos e todos os casos de isolamento passam.

> feito: sem migration, sem DDL. Nenhum uso de `service_role` ampliado; D-034
> intacto.
>
> **`tests/rls.test.ts` estendido (+30, de 55 → 85 no arquivo; `test:rls`
> 171 → 201).** Bloco novo `RLS — sales.contacts, leads, ai_prompts, ai_runs,
> audit_logs (Fases 3–5, revalidação 6.4)` com `beforeAll`/`afterAll` próprios
> (mesmo padrão dos blocos existentes). Por tabela, 6 casos: A lê a própria
> linha; B não vê linha de A (0 linhas, não erro); B não insere com `org_id`
> de A (`WITH CHECK` → erro real); B não faz `UPDATE` nem `DELETE` de linha de
> A (`USING` → 0 linhas, sem erro, checado via `.select()` encadeado — D-016);
> `anon` não lê. Os leads de A usam `contact_id`/`stage_id` da própria org B
> no teste de `INSERT` cross-tenant — o que barra é a policy de `org_id`, não
> a FK. As tabelas já cobertas antes (`organizations`, `org_members`,
> `activities`, `followup_rules`, as duas views) seguem inalteradas e passam.
>
> **`audit_logs`:** só isolamento entre tenants aqui. Endurecer a policy para
> append-only (bloquear `update`/`delete` do próprio membro) é **Q-006**, fora
> do escopo da 6.4 (registrado como continua aberto).
>
> **`get_advisors(security)`:** zero alerta novo no schema `sales`. Os três
> `authenticated_security_definer_function_executable` (`create_organization`,
> `current_org_ids`, `current_org_role`) são os já adjudicados em **D-013**
> ("esperado, não é falha" — RPC que o app precisa chamar via `authenticated`,
> nenhuma vaza dado de outro usuário). `seed_org_defaults` **não** aparece — o
> `revoke execute ... from authenticated` funcionou. Todo o resto do relatório
> é do schema `public`/`crm` (outro projeto no mesmo banco Supabase), fora de
> escopo.
>
> **`get_advisors(performance)`:** 18 lints no schema `sales`, **todos INFO,
> zero WARN/ERROR** — 17 × `unindexed_foreign_keys` + 1 × `unused_index`
> (`leads_org_status_next_action_idx`, não usado só porque ainda não há dado —
> é índice deliberado do hot path, DATABASE.md). Nenhum é regressão da 6.3/6.4
> (a 6.3 não teve DDL; todos vêm do DDL de tabela das Fases 3–5). Decidir se
> vale um `0012_*` de índices de cobertura agora ou no checkpoint da Fase 6
> com dados reais (D-014, "revisar se performance real na 6.5 justificar") é
> **Q-008** — devolvido ao Opus, não improvisado aqui (CLAUDE.md: Sonnet não
> decide schema).
>
> Validação: `typecheck`/`lint`/`test` (144/144)/`test:coverage` (`lib/domain/`
> 100%)/`test:rls` (201/201, +30)/`build` verdes.

### [ ] 6.5 Uso real — **em andamento (janela: 2026-08-27 → 2026-09-10)**

Deploy Vercel (projeto `devrr-sales-ai`, root `devrr-sales-ai/`, env configuradas).
Cadastrar os leads reais da DevRR. Usar por **duas semanas**, todo dia, de verdade.

Registrar atrito em `docs/FIELD_NOTES.md`: o que incomodou, o que faltou, o que
sobrou. Isso vira o backlog real das fases 7+ — mais confiável do que qualquer plano
escrito hoje.

**Pronto quando:** o sistema responde as 6 perguntas da `PRODUCT_SPEC.md` → Definição
de pronto usando dados reais. → **Checkpoint Opus: revisar plano das fases 7+.**

> **Preparado (agente):** a 6.5 é tarefa de operador + tempo de calendário —
> deploy, entrada de dado real da DevRR e duas semanas de uso não são
> executáveis por agente, e as field notes vêm desse uso, não podem ser
> escritas antes. Feito o que era automatizável:
>
> - **`docs/FIELD_NOTES.md`** criado — esqueleto de registro: checklist das 6
>   perguntas de `PRODUCT_SPEC.md` (com coluna de tela/data), o fluxo ponta a
>   ponta passo a passo, a verificação em Production do job de reconciliação
>   (6.3/D-034 — fecha o item operacional que a 6.3 deixou pendente), e
>   seções de log de atrito / faltou / sobrou / bugs + fechamento.
> - **`README.md` → Deploy** — runbook do projeto Vercel `devrr-sales-ai`:
>   Root Directory `devrr-sales-ai/`, as 5 env vars (`CRON_SECRET` ≥32 em
>   Production), `vercel.json` (cron só roda em Production), e os dois `curl`
>   de verificação pós-deploy (`200` com header, `401` sem — não `307`).
> - **Gates** (pré-deploy): `typecheck`/`lint`/`test` (144/144)/`test:coverage`
>   (`lib/domain/` 100%)/`test:rls` (201/201)/`build` verdes.
>
> **Sem código de produto novo, sem migration, sem DDL.** `service_role` e RLS
> inalterados (D-034 intacto). Q-006 e Q-008 **não** tocadas — entram no mesmo
> checkpoint Opus do fim da 6.5.
>
> **Falta (operador):** configurar o projeto Vercel e as env vars, deployar a
> Production, cadastrar os leads reais, usar por duas semanas preenchendo
> `FIELD_NOTES.md`. Ao fim: marcar `[x]` aqui e abrir o checkpoint Opus das
> Fases 7+.

---

# FASE 7 — Dossiê Digital de Prospecção

Origem: `DOSSIE.md` (raiz deste projeto), pedido do operador em 2026-08-27, durante a
janela de uso real da 6.5.

**O que é:** hoje o cadastro grava só o comercial (nome, telefone, título, interesse,
fonte, valor, observações). Esta fase adiciona o **dossiê da presença digital pública**
da empresa prospectada — Google, Google Business Profile, site, conversão, Instagram e
PageSpeed —, um diagnóstico inicial, um score 0–100 derivado, e a exportação desse
dossiê em JSON/Markdown/CSV para colar direto numa IA antes da abordagem comercial.

**Observação de escopo (não bloqueia):** `PRODUCT_SPEC.md` descreve o produto como
inbound (o lead chega até a PME). O dossiê é **outbound** — é a DevRR pesquisando uma
clínica no Google antes de prospectar. Isso não conflita com nada já construído: a
DevRR é o cliente #0 e prospecta ativamente. O dossiê é uma camada opcional sobre o
lead: não muda o funil, o follow-up, nem a tela "Ações de hoje". Se um dia o produto
for vendido a uma PME inbound, a aba simplesmente não é usada.

**Fora do escopo desta fase** (explícito no `DOSSIE.md` §22): análise de conversa de
WhatsApp, atendimento comercial, Cliente Oculto. Não implementar nada disso aqui.

## Regras que valem para a fase inteira

1. **Nenhum campo do dossiê é obrigatório.** Campo vazio significa "não foi possível
   encontrar/avaliar", nunca "o valor é zero/não". Só `lead_id` e `researched_at` são
   obrigatórios. Ver **D-037**.
2. `null`, `nao_analisado`, `nao_identificado` e `nao_se_aplica` são **não avaliado** —
   saem do numerador **e** do denominador do score. `nao` é **avaliado e ausente** —
   entra no denominador valendo 0. Essa distinção é a razão de existir da completude.
3. `digital_score` e `digital_score_completeness` **nunca** vêm do formulário. São
   derivados de `lib/domain/digital-score.ts` na camada de action, a cada gravação.
4. Toda regra de classificação (Lighthouse, Core Web Vitals, rótulo de enum) vive num
   único módulo de domínio e é importada pela UI, pelo Markdown e pelo CSV. Zero
   duplicação de limiar em componente (`DOSSIE.md` §8).
5. Nada de `service_role`. A exportação em massa roda com a sessão do usuário e a RLS
   de sempre (**D-041**). D-034 continua com a lista fechada de três usos.
6. Salvar parcial é o caminho normal, não a exceção: criar hoje, completar depois.

---

### [x] 7.0 Gerador de types + guarda de drift — **antes da 7.1**

> feito: `scripts/gen-types.mjs` (gerador) + `scripts/check-types.mjs` (guarda),
> scripts `gen:types`/`types:check` no `package.json`. O gerador dá `fetch` no
> endpoint da Management API
> (`/v1/projects/{ref}/types/typescript?included_schemas=sales`), lê o campo
> `types` do JSON e escreve `lib/types/database.types.ts` — carrega `.env.local`
> sozinho via `loadEnv` do `vite` (mesmo padrão de `tests/setup/load-env.ts`),
> ref do projeto extraído de `NEXT_PUBLIC_SUPABASE_URL` (ou `SUPABASE_PROJECT_REF`).
> Falha explícita e nunca parcial: sem token → exit 1 com instrução; HTTP != 200
> → imprime status + corpo e exit 1; arquivo só é escrito depois do conteúdo
> inteiro em memória. `types:check` reusa `generateSalesTypes()`, compara com o
> commitado, imprime a primeira divergência e sai != 0; sem `SUPABASE_ACCESS_TOKEN`
> no ambiente, pula com aviso e sai 0 (opt-in, igual a `test:rls`).
>
> **Arquivo gerado adotado** (924 linhas: 8 de cabeçalho "não editar à mão" +
> 916 do endpoint) — substitui o `database.types.ts` escrito à mão desde a 2.1.
> Diferenças de forma absorvidas sem ação (enum por alias `Database["sales"]["Enums"][...]`,
> `Database` como `type` + `__InternalSupabase`, helpers `Tables`/`TablesInsert`/`Constants`).
>
> **Drift real das views tratado explicitamente, sem `!`/`as`** (era o ponto da
> tarefa): o Postgres tipa toda coluna de view como nullable. `lib/queries/today.ts`
> ganhou tipos estreitados (`TodayActionRow`/`LeadWithoutActionRow`) e mappers
> (`toTodayActionRow`/`toLeadWithoutActionRow`) que validam coluna a coluna as
> garantidas não-nulas pelas junções internas + filtro `due_at is not null`
> (`0008_views.sql`), com `requireColumn()` lançando erro claro se vier nulo —
> nunca um `null` propagando três camadas acima. Colunas de fato opcionais
> (`body`, `step_number`, `contact_phone`, `last_contact_at`) seguem nullable.
> `components/today/ActionRow.tsx` e `TodayActionsList.tsx`: removidos os
> `action.due_at!` agora redundantes (o tipo estreitado já é `string`). Nenhum
> outro consumidor de view no código. Passada pequena, coube na camada de
> `queries` — não precisou parar e reportar.
>
> `CLAUDE.md` (regra de banco), `README.md` (nova seção "Types do banco") e
> `.env.example` (`SUPABASE_ACCESS_TOKEN` como ferramenta dev-only) atualizados.
> `docs/DATABASE.md` → checklist e `DECISIONS.md` → D-042 já vinham da spec do Opus.
>
> Validação: `npm run gen:types` produz o arquivo; `typecheck` verde com a saída
> do gerador e os nulos das views tratados; `types:check` verde (exit 0);
> `lint` limpo; `test` 144/144; `test:coverage` `lib/domain/` 100%; `test:rls`
> 201/201; `build` verde (8 rotas + Proxy). Não avancei para a 7.1.

**O problema que esta tarefa fecha.** `lib/types/database.types.ts` é escrito à mão
desde a 2.1 (a ferramenta MCP `generate_typescript_types` só introspecta `public`).
Com 11 tabelas pequenas isso passou; com as ~116 colunas da 7.1 vira lacuna de
verdade — `npm run typecheck` valida o código **contra o arquivo**, não contra o
banco, então uma coluna esquecida, um nullable errado ou um valor de enum a mais
passam verdes e só explodem em runtime. Fazer a 7.1 antes desta tarefa significaria
digitar 116 colunas à mão para jogá-las fora depois. Ordem: **7.0 → 7.1**.

Duas partes, as duas obrigatórias.

**(a) Gerador — script próprio sobre a Management API (verificado)**

O endpoint oficial `GET https://api.supabase.com/v1/projects/{ref}/types/typescript?included_schemas=sales`
devolve o arquivo TypeScript pronto. **Testado nesta máquina em 2026-08-27**: HTTP 200,
916 linhas, todas as 11 tabelas + as 2 views + os enums do schema `sales`. É o mesmo
que o `supabase gen types --project-id` chama por baixo.

- `scripts/gen-types.mjs`: `fetch` no endpoint com `Authorization: Bearer
  $SUPABASE_ACCESS_TOKEN`, escreve `lib/types/database.types.ts` (o corpo vem no campo
  `types` do JSON). ~30 linhas, zero dependência nova.
- `package.json`: `"gen:types": "node scripts/gen-types.mjs"`.
- Falha explícita, nunca silenciosa: sem token → mensagem dizendo o que configurar e
  exit 1; HTTP != 200 → imprime status e corpo, exit 1. Nunca escrever arquivo parcial.
- **Por que não o Supabase CLI:** o CLI resolve o mesmo problema baixando um binário de
  plataforma como devDependency, e ainda exige confirmar sintaxe de flag entre versões.
  O script é menor, roda igual em qualquer máquina e em CI, e usa exatamente a mesma
  fonte de verdade (o banco remoto). O CLI (`npm i -D supabase` +
  `supabase gen types --lang typescript --project-id ... --schema sales`) fica como
  **plano B** se o endpoint mudar.
- Credencial: `SUPABASE_ACCESS_TOKEN` (personal access token `sbp_...`), **já
  configurada em `.env.local`** (confirmado fora do Git: casa com `.env*.local` no
  `.gitignore`, nunca rastreado, sem histórico). Dev-only: não vai para a Vercel, não
  entra em `lib/env.server.ts`, nenhum código de produção a lê, não é `service_role`
  (D-034 intacto). Documentar em `.env.example` com valor vazio e o comentário de que
  é ferramenta de desenvolvimento.
- O script precisa carregar `.env.local` sozinho (não roda dentro do Next): reusar
  `loadEnv` do `vite`, como `tests/setup/load-env.ts` já faz, ou ler o arquivo direto.

**Drift já medido (2026-08-27) — o que a adoção vai acusar**

Comparação campo a campo entre o gerado e o `database.types.ts` escrito à mão, feita
antes de abrir a tarefa:

| Diferença | Onde | Natureza |
|---|---|---|
| `status`/`type`/`role`/`temperature`/`channel` como `Database["sales"]["Enums"][...]` em vez de união inline | `activities`, `ai_runs`, `followup_rules`, `leads`, `org_members` | equivalente, só forma |
| **Colunas das views tipadas como nullable** | `v_today_actions` (11 colunas), `v_leads_without_action` (8 colunas) | **divergência real** |

A segunda é a que importa e é exatamente o tipo de coisa que o arquivo à mão escondia:
coluna de view é sempre nullable para o Postgres (o planner não prova que o `join`
casa), mas o arquivo atual as declara não-nulas. Hoje o código de `lib/queries/today.ts`
e dos componentes de "Ações de hoje" lê esses campos como se nunca fossem nulos, e o
`typecheck` concorda — porque está conferindo contra o próprio arquivo.

Ao adotar o gerado, **o `typecheck` vai apontar esses acessos**. Tratar cada um
explicitamente na camada de `queries` (`null` → erro claro, ou fallback declarado),
nunca com `!` ou `as` para calar o compilador — silenciar aqui recria o gap que esta
tarefa existe para fechar. Se o volume disso passar de uma passada pequena, **parar e
reportar** em vez de improvisar.

**(b) Guarda — `npm run types:check`**

- Regenera para um arquivo temporário e compara com o commitado; sai != 0 e imprime o
  diff se divergirem. É isto que transforma "lembrar de regerar" em verificação: se
  alguém aplicar DDL sem regerar, ou editar o arquivo à mão, o comando acusa.
- **Opt-in quanto à credencial**, no mesmo espírito de `test:rls`: sem
  `SUPABASE_ACCESS_TOKEN` no ambiente, pula com aviso e sai 0 — CI sem o segredo não
  pode dar falso vermelho. Com o segredo presente, divergência é erro.
- Entra no checklist de migration do `DATABASE.md` e na regra de banco do
  `CLAUDE.md`.

**Pronto quando:** `npm run gen:types` produz o arquivo; `npm run typecheck` verde com
a saída do gerador e com os nulos das views tratados explicitamente; `npm run types:check` verde; `README.md` e `.env.example`
documentam a credencial dev-only; a suíte inteira segue verde
(`test`/`test:coverage`/`test:rls`/`build`).

---

### [x] 7.1 Migration `0012_lead_digital_audits.sql` + enums + types

> feito: `supabase/migrations/0012_lead_digital_audits.sql` commitada sozinha
> (`14f1e7f`) antes de aplicada no remoto (`fvgbbixxcapltudonxqx`, CLAUDE.md
> regra dura). 8 enums do dossiê (`tri_state`, `quality_level`, `frequency_level`,
> `speed_level`, `activity_level`, `cwv_status`, `google_result_type`,
> `sales_priority` — D-036) + `sales.lead_digital_audits` com **109 colunas**,
> campo a campo conforme `DATABASE.md` → Tabelas — Fase 7 (7 de identidade +
> 102 do dossiê). Confirmado contra o banco por `information_schema.columns`:
> só `id/org_id/lead_id/researched_at` e `digital_opportunities` (`text[] not
> null default '{}'`) são `not null`; todo o resto nullable (D-037). CHECKs de
> faixa (`>= 1`, `>= 0`, `between 0 and 100`, `between 0 and 10`, rating
> `between 0 and 5`) e o `<@` de subconjunto de `digital_opportunities`
> (constraint nomeada `lead_digital_audits_opportunities_subset`). RLS
> `tenant_isolation` "for all" (dado operacional, D-017 não se aplica), trigger
> `lead_digital_audits_set_updated_at` → `sales.fn_set_updated_at()`, 2 índices
> (`(org_id, lead_id, researched_at desc)` — cobre a FK `lead_id`, Q-008; e
> `(org_id, digital_score desc nulls last)`).
>
> **Verificado, não assumido:** `get_advisors(type:'security')` idêntico à
> baseline pré-migration — zero alerta novo em `sales` (sem função nova, sem
> view, RLS + policy presentes). `npm run gen:types` regenerou
> `lib/types/database.types.ts` (+615 linhas: tabela + 8 enums + `Constants`);
> `npm run types:check` verde (exit 0). Tabela nasce com 0 linhas; nenhuma
> coluna nova em `sales.leads` (D-035).
>
> **Sem alteração em `tests/rls.test.ts`** — os 6 casos de RLS para
> `lead_digital_audits` são escopo explícito da 7.11, não desta tarefa. Suíte
> `test:rls` rodada como regressão: 201/201 (inalterada).
>
> `DATABASE.md` já trazia a seção completa da Fase 7 e a linha `0012` na tabela
> "Ordem das migrations" (commit de spec do Opus `482b3f0`); conferido que bate
> com o schema aplicado — nada a alterar no doc.
>
> Validação: `typecheck` / `lint` / `test` (144/144) / `types:check` (exit 0) /
> `test:rls` (201/201) / `build` (8 rotas + Proxy) verdes.

Criar os 8 enums compartilhados e a tabela `sales.lead_digital_audits`, exatamente
como especificados em `docs/DATABASE.md` → **Tabelas — Fase 7 (dossiê digital)**. Não
inventar coluna, não renomear, não omitir: a lista de lá é o contrato, derivada campo
a campo do `DOSSIE.md` §2–§10.

Checklist da migration (o de `DATABASE.md` → Checklist obrigatório por migration):
arquivo commitado antes de aplicar · `org_id not null` + FK + índice · RLS
`tenant_isolation` · trigger `fn_set_updated_at` · `get_advisors(type:'security')` sem
alerta novo · types regenerados por `npm run gen:types` com `npm run types:check`
verde (7.0 — o arquivo deixou de ser escrito à mão, D-042) · `DATABASE.md`
atualizado no mesmo commit (a linha
`0012` na tabela "Ordem das migrations").

Nenhuma coluna nova em `sales.leads`. Nenhum dado existente é tocado — a tabela nasce
vazia e todo lead atual continua funcionando sem auditoria nenhuma (**D-035**).

**Pronto quando:** migration aplicada, advisors limpos, `npm run typecheck` verde com
os types atualizados, `DATABASE.md` refletindo o que está no banco.

---

### [ ] 7.2 `lib/domain/digital-score.ts` + `lib/domain/pagespeed.ts` + testes

Lógica pura, zero import de `supabase`/`next` (regra de dependência da
`ARCHITECTURE.md`). O domínio declara a própria interface de entrada
(`DigitalAuditFields`) — a `Row` do banco a satisfaz estruturalmente, mas o domínio
não importa `database.types.ts` para isso.

**`digital-score.ts`** implementa a tabela de pesos abaixo. Total = 100 pontos, o que
faz a completude ser literalmente "quantos pontos foram avaliáveis".

```
computeDigitalScore(audit: DigitalAuditFields): {
  score: number | null            // round(100 * earned / available); null se available = 0
  completeness: number            // round(available)  — o total é 100 por construção
  earned: number
  available: number
  sections: { key, label, earned, available }[]
}
```

**Google / Google Business — 20 pts**

| Item | Campo | Peso | Conversão |
|---|---|---|---|
| Tem perfil | `google_business_profile` | 4 | sim=1 · nao=0 |
| Nota | `google_rating` | 3 | >=4.5 = 1 · 4.0–4.49 = 0.6 · 3.0–3.99 = 0.3 · <3 = 0 |
| Volume de avaliações | `google_reviews_count` | 2 | >=50 = 1 · 20–49 = 0.6 · 5–19 = 0.3 · <5 = 0 |
| Avaliações recentes | `google_recent_reviews` | 2 | sim=1 · nao=0 |
| Responde avaliações | `google_replies_reviews` | 2 | frequentemente=1 · algumas=0.5 · raramente=0.25 · nao=0 |
| Fotos | `google_has_photos` | 1 | sim=1 · nao=0 |
| Horário | `google_has_hours` | 1 | sim=1 · nao=0 |
| Telefone | `google_has_phone` | 1 | sim=1 · nao=0 |
| Site no Google | `google_has_website` | 1 | sim=1 · nao=0 |
| WhatsApp fácil | `google_easy_whatsapp` | 2 | sim=1 · nao=0 |
| Agendamento | `google_has_booking` | 1 | sim=1 · nao=0 |

`google_profile_completeness` fica **fora** do score (é impressão subjetiva e
sobrepõe itens já pontuados) — aparece no dossiê e no Markdown.

**Website — 25 pts**

| Item | Campo | Peso | Conversão |
|---|---|---|---|
| Tem site | `website_exists` | 5 | sim=1 · nao=0 |
| HTTPS | `website_https` | 1 | sim=1 · nao=0 |
| Mobile | `website_mobile_friendly` | 3 | sim=1 · parcialmente=0.5 · nao=0 |
| Qualidade visual | `website_visual_quality` | 2 | excelente=1 · boa=0.75 · regular=0.4 · ruim=0 |
| Velocidade percebida | `website_perceived_speed` | 1 | rapido=1 · aceitavel=0.6 · lento=0.2 · muito_lento=0 |
| Serviços claros | `website_services_clear` | 2 | sim=1 · parcialmente=0.5 · nao=0 |
| Página do serviço pesquisado | `website_has_target_service_page` | 2 | sim=1 · nao=0 |
| CTA claro | `website_has_clear_cta` | 2 | sim=1 · nao=0 |
| WhatsApp visível | `website_has_whatsapp` | 2 | sim=1 · nao=0 |
| Formulário | `website_has_contact_form` | 1 | sim=1 · nao=0 |
| Agendamento online | `website_has_online_booking` | 1 | sim=1 · nao=0 |
| Telefone visível | `website_phone_visible` | 1 | sim=1 · nao=0 |
| Prova social | `website_has_social_proof` | 2 | sim=1 · nao=0 |

Fora do score, dentro do dossiê: `website_whatsapp_clickable`,
`website_whatsapp_floating`, `website_address_visible`, `website_has_team`,
`website_has_clear_differentiators`, `website_content_updated`.

**Conversão — 20 pts**

| Item | Campo | Peso | Conversão |
|---|---|---|---|
| Caminho até contato | `conversion_clear_contact_path` | 6 | sim=1 · parcialmente=0.5 · nao=0 |
| Cliques até WhatsApp | `conversion_clicks_to_whatsapp` | 4 | <=1 = 1 · 2 = 0.6 · 3 = 0.3 · >=4 = 0 |
| CTA acima da dobra | `conversion_cta_above_fold` | 4 | sim=1 · nao=0 |
| CTA repetido | `conversion_repeated_cta` | 2 | sim=1 · nao=0 |
| Captura alternativa | `conversion_alternative_capture` | 2 | sim=1 · nao=0 |
| Sem fricção | `conversion_has_friction` | 2 | **invertido**: nao=1 · sim=0 |

**PageSpeed — 20 pts**

| Item | Campo | Peso | Conversão |
|---|---|---|---|
| Performance mobile | `pagespeed_mobile_performance` | 6 | valor/100 |
| Core Web Vitals mobile | `pagespeed_mobile_core_web_vitals` | 4 | aprovado=1 · reprovado=0 · dados_insuficientes = **não avaliado** |
| SEO mobile | `pagespeed_mobile_seo` | 2 | valor/100 |
| Accessibility mobile | `pagespeed_mobile_accessibility` | 2 | valor/100 |
| Best Practices mobile | `pagespeed_mobile_best_practices` | 1 | valor/100 |
| Performance desktop | `pagespeed_desktop_performance` | 3 | valor/100 |
| Core Web Vitals desktop | `pagespeed_desktop_core_web_vitals` | 2 | aprovado=1 · reprovado=0 · dados_insuficientes = não avaliado |

**Instagram — 15 pts**

| Item | Campo | Peso | Conversão |
|---|---|---|---|
| Tem Instagram | `instagram_exists` | 3 | sim=1 · nao=0 |
| Link na bio | `instagram_has_bio_link` | 1 | sim=1 · nao=0 |
| Bio clara | `instagram_clear_bio` | 2 | sim=1 · parcialmente=0.5 · nao=0 |
| CTA na bio | `instagram_has_cta` | 2 | sim=1 · nao=0 |
| WhatsApp fácil | `instagram_easy_whatsapp` | 2 | sim=1 · nao=0 |
| Site fácil | `instagram_easy_website` | 1 | sim=1 · nao=0 |
| Perfil ativo | `instagram_active` | 2 | ativo=1 · pouco_ativo=0.5 · inativo=0 |
| Qualidade visual | `instagram_visual_quality` | 1 | excelente=1 · boa=0.75 · regular=0.4 · ruim=0 |
| Conteúdo mostra serviços | `instagram_services_content` | 1 | sim=1 · parcialmente=0.5 · nao=0 |

`instagram_content_cta` fica fora do score, dentro do dossiê.

**Regras de cascata** (o que acontece quando a base da seção não existe):

- `website_exists = 'nao'` → os outros 20 pontos de Website contam como **avaliados
  valendo 0** (não ter site é uma lacuna real, medida — não uma lacuna de pesquisa);
  e **toda a seção PageSpeed sai do denominador** (não há o que medir).
- `website_exists` nulo/não analisado → seção Website inteira fora do denominador.
- `instagram_exists = 'nao'` → os outros 12 pontos de Instagram contam avaliados
  valendo 0.
- `google_business_profile = 'nao'` → os outros 16 pontos de Google contam avaliados
  valendo 0.
- Item numérico com valor fora do domínio válido (não deveria chegar aqui — Zod e
  CHECK barram antes) é tratado como **não avaliado**, nunca como 0.

**`pagespeed.ts`** centraliza a classificação visual (`DOSSIE.md` §8):

```
classifyLighthouseScore(v: number | null): 'bom' | 'precisa_melhorar' | 'ruim' | null
  // >=90 bom · 50-89 precisa_melhorar · <50 ruim · null -> null
classifyLcpMs(v)    // <=2500 bom · <=4000 precisa_melhorar · >4000 ruim
classifyInpMs(v)    // <=200  bom · <=500  precisa_melhorar · >500  ruim
classifyClsValue(v) // <=0.1  bom · <=0.25 precisa_melhorar · >0.25 ruim
formatMsAsSeconds(ms) // 2480 -> "2,48 s"  (armazenamos ms, exibimos segundos)
```

Nenhum componente repete um limiar desses. UI, Markdown e CSV importam daqui.

**Testes** (`tests/domain/digital-score.test.ts`, `tests/domain/pagespeed.test.ts`):
auditoria toda vazia → `score: null`, `completeness: 0`; auditoria perfeita → 100/100;
`nao_analisado` não derruba score e reduz completude; `nao` derruba score e **não**
reduz completude; cada regra de cascata; fricção invertida; limiares de cada
classificador nas bordas exatas (90, 89, 50, 49, 2500, 2501, 200, 201, 0.1, 0.11).

**Pronto quando:** 100% de cobertura em `lib/domain/` mantida (`npm run test:coverage`).

---

### [ ] 7.3 `lib/validation/digital-audit.ts` (Zod) + testes

Schema espelhando a tabela, **tudo opcional/nullable** exceto `lead_id`. Reaproveitar
os helpers `optionalText`/`optionalUuid` de `lib/validation/leads.ts` em vez de
redefinir. Limites (`DOSSIE.md` §19):

- `google_rating` 0–5 (uma casa decimal), `google_reviews_count` inteiro >= 0;
- scores Lighthouse 0–100 inteiros; `digital_opportunity_score` 0–10;
- posições (`google_ads_position`, `google_organic_position`) inteiras >= 1;
- `conversion_clicks_to_whatsapp` inteiro >= 0;
- `cls` decimal >= 0; LCP/INP/FCP/TBT/Speed Index inteiros >= 0 em **milissegundos**;
- URLs validadas com `z.string().url()` **depois** do transform de vazio→null (campo
  vazio não pode virar erro de URL inválida);
- enums do banco como `z.enum([...])` com exatamente os mesmos valores do Postgres;
- `digital_opportunities` como array de enum, default `[]`;
- `digital_score`/`digital_score_completeness` **não existem no schema de entrada** —
  são derivados no servidor (mesmo motivo de `org_id`/`status` não estarem em
  `createLeadSchema`).

Formulário HTML manda tudo como string: usar `z.coerce` nos numéricos e tratar `''`
como `null` **antes** do coerce (senão `''` vira `0` e um campo em branco viraria
"nota zero" — exatamente o erro que a regra 1 da fase proíbe).

**Testes**: campo vazio → `null`, nunca `0`; nota 5.1 rejeitada; score 101 rejeitado;
posição 0 rejeitada; URL inválida rejeitada mas vazia aceita; `digital_score` enviado
pelo cliente é ignorado.

---

### [ ] 7.4 `lib/actions/digital-audit-core.ts` + wrapper `digital-audit.ts`

Mesmo padrão de `lead-intake-core.ts` (D-020): core recebe `supabase`/`orgId`/`userId`
prontos, sem `'use server'`, sem `next/headers`.

```
saveDigitalAuditCore(supabase, orgId, userId, input): Promise<DigitalAuditResult>
```

Ordem: Zod → `checkBelongsToOrg(supabase, 'leads', lead_id, orgId, 'Lead não
encontrado.')` → `computeDigitalScore` → `insert` (auditoria nova) ou `update` (quando
vem `audit_id`, revalidando que a linha é da org) → `logAudit(..., 'lead_digital_audit',
auditId, 'create' | 'update', diff)`.

`audit_id` vindo do cliente é id não confiável: checar `org_id` antes de gravar, igual
a todo o resto (D-020). Erro de banco vira erro reportado, ausência vira "não
encontrado" — `checkBelongsToOrg` já faz essa distinção (Q-005/4.6).

O wrapper `'use server'` resolve sessão/org, chama o core, faz
`revalidatePath('/leads/[leadId]', 'page')` e devolve o resultado (sem `redirect` —
salvar dossiê mantém o usuário na mesma tela; é preenchimento incremental).

**Testes** (`tests/actions/digital-audit.test.ts`, com `tests/helpers/stub-client.ts`):
cria auditoria; atualiza a existente; recusa `lead_id` de outra org; recusa `audit_id`
de outra org; grava `digital_score`/`digital_score_completeness` calculados e ignora os
que vierem no input; erro de banco na tabela relacionada não vira "não encontrado".

---

### [ ] 7.5 `lib/queries/digital-audits.ts`

Leitura para Server Components, `import 'server-only'`, colunas listadas (nunca
`select *` — regra dura do `CLAUDE.md`). Como a lista de colunas é enorme, declarar
**uma** constante literal `DIGITAL_AUDIT_COLUMNS` e reusar (string literal única — o
`.select()` do postgrest-js perde o tipo se a string for concatenada, achado já
registrado em `lib/queries/leads.ts`).

```
getLatestAuditForLead(leadId): Promise<DigitalAudit | null>
  // order by researched_at desc, created_at desc, limit 1  -> "auditoria atual" (D-035)
getAuditById(auditId): Promise<DigitalAudit | null>
listAuditsForLead(leadId): Promise<DigitalAudit[]>           // histórico (DOSSIE §17)
listLatestAuditsByLead(leadIds: string[]): Promise<Map<string, DigitalAudit>>
  // usado pela exportação em massa; uma query só, agrupada em memória
```

Todas filtram por `org_id` de `requireOrgId()`, sempre.

---

### [ ] 7.6 `lib/domain/digital-labels.ts` + componentes de seção do dossiê

**`digital-labels.ts`** (puro): mapa `valor do enum → rótulo em português` para os 8
enums, mais a lista de opções de `digital_opportunities`, mais o rótulo de cada campo.
Fonte única para UI, Markdown e cabeçalho do CSV. Nenhum rótulo escrito à mão dentro de
componente.

**Componentes** em `components/leads/dossier/`:

- `DossierSection.tsx` — accordion (`<details>`/`<summary>` nativo, sem lib): título,
  contador "N de M preenchidos", botão **Limpar seção** (só os campos daquela seção) e
  botão **Marcar não analisado** onde o enum tem esse valor (`DOSSIE.md` §12).
- `DossierFields.tsx` — primitivos `SelectField`/`TextField`/`NumberField`/
  `TextareaField`/`MultiCheckField`, no padrão visual já usado em `NewLeadForm.tsx`
  (mesmas classes `inputClass`/`labelClass`, `font-mono` em **todo** campo numérico —
  regra visual mais importante do `DESIGN_SYSTEM.md`).
- `DossierSummary.tsx` — a faixa de resumo do topo (`DOSSIE.md` §11): Empresa · Score
  digital · Completude · Google Ads · Site · Nota Google · Nº avaliações · Performance
  Mobile · Performance Desktop · Potencial 0–10. Números em DM Mono; classificação por
  cor vinda de `pagespeed.ts` (emerald/amber/red dos tokens, sem hex novo).
- Campos condicionais: `website_exists != 'sim'` esconde os demais campos de site
  (mantendo no estado o que já foi digitado, sem apagar); idem `instagram_exists`.

Sem animação de entrada, sem glow, sem glassmorphism (`DESIGN_SYSTEM.md` → o que NÃO
herdar). Responsivo: `grid gap-4 sm:grid-cols-2`, como no formulário atual.

---

### [ ] 7.7 Telas: `/leads/new` com seções recolhidas e `/leads/[leadId]/dossie`

**`/leads/new`** (`components/leads/NewLeadForm.tsx`): os campos comerciais atuais
continuam **exatamente como estão**, agora dentro da seção 1 "Dados do lead" (aberta
por padrão). Abaixo, as 7 seções do dossiê, todas recolhidas e opcionais. Se nenhuma
for tocada, a action grava só o lead — comportamento de hoje, byte a byte. Se qualquer
campo do dossiê estiver preenchido, `createLeadIntakeCore` cria também a auditoria,
**depois** do lead, na mesma action; falha na auditoria não desfaz o lead: devolve o
lead criado com aviso, porque perder o cadastro por causa do anexo seria o pior
resultado possível (mesmo espírito do `logAudit` best-effort).

**`/leads/[leadId]/dossie`** — página nova de edição do dossiê, reusando os mesmos
componentes de seção. É onde o preenchimento continua depois. Sem exigir nada completo
para salvar (`DOSSIE.md` §12).

**`/leads/[leadId]`** — ganha um card compacto "Dossiê digital": ou o `DossierSummary`
com os botões **Editar dossiê · Copiar dossiê · Exportar JSON**, ou, quando não há
auditoria, um estado vazio honesto com **Iniciar diagnóstico** (regra 5 do
`PRODUCT_SPEC.md`: nada de dado mockado em tela).

`lib/navigation.ts` não muda — dossiê não vira item de menu.

---

### [ ] 7.8 `lib/domain/dossier-export.ts` — JSON aninhado, Markdown e CSV

Puro e testável, sem tocar banco.

- `buildDossierJson(lead, audit)` → objeto **aninhado** exatamente nas chaves do
  `DOSSIE.md` §13: `lead` · `prospecting` · `google` · `website` · `conversion` ·
  `instagram` · `pagespeed.mobile` · `pagespeed.desktop` · `diagnostic`. Inclui nulos
  (o nulo é informação: "não encontrado"). Proibido JSON achatado.
- `buildDossierMarkdown(lead, audit)` → o layout do `DOSSIE.md` §14, com rótulos em
  português vindos de `digital-labels.ts`, números formatados (segundos para LCP/FCP/
  TBT/Speed Index, `R$` para valor) e **omissão de campo vazio**; uma seção inteira
  vazia é omitida, exceto `IDENTIFICAÇÃO` e `DIAGNÓSTICO`, que sempre aparecem (com
  "não analisado" explícito) — é o que a IA precisa para saber o que falta.
- `DOSSIER_CSV_COLUMNS` (ordem estável, nomes iguais aos das colunas do banco) +
  `buildDossierCsvRow(lead, audit)` + `buildDossierCsv(rows)`: achatado
  (`DOSSIE.md` §15), separador vírgula, aspas duplas escapadas por duplicação
  (RFC 4180), `\r\n` entre linhas, BOM UTF-8 no início para o Excel pt-BR não comer os
  acentos. Enum exportado com o **valor** do banco (estável para comparar dezenas de
  empresas), não com o rótulo.

**Testes** (`tests/domain/dossier-export.test.ts`): JSON tem as 9 chaves e nenhuma
propriedade solta no topo; Markdown omite vazio e mantém as duas seções obrigatórias;
CSV escapa vírgula, aspas e quebra de linha dentro de observações; a ordem das colunas
do CSV não muda quando o dossiê está parcialmente preenchido.

---

### [ ] 7.9 Botões de exportação e rota de exportação em massa

- **Copiar dossiê** (`components/leads/dossier/CopyDossierButton.tsx`, client):
  `navigator.clipboard.writeText(markdown)` com fallback de `<textarea>` +
  `document.execCommand('copy')` para contexto sem permissão, e feedback "Copiado" por
  2s. O Markdown chega pronto do Server Component — o cliente não recalcula nada.
- **Exportar JSON** (individual): `Blob` + `URL.createObjectURL`, nome
  `dossie-<slug-da-empresa>-<yyyy-mm-dd>.json`.
- **Exportação em massa**: `app/api/leads/export/route.ts`, `GET ?format=csv|json`,
  autenticada **pela sessão do usuário** (`requireOrgId()` + client normal, zero
  `service_role` — D-041/D-034), respeitando os mesmos filtros da lista
  (`stage`/`source`/`status`/`search`). Responde com `Content-Type` correto e
  `Content-Disposition: attachment`. Botão **Exportar** na barra de filtros de
  `/leads`.
  **Atenção ao `proxy.ts`:** esta rota **precisa** da sessão, então **não** entra no
  negative lookahead do matcher (ao contrário de `api/cron`, D-012). Confirmar que
  continua passando pelo `updateSession`.

**Testes** (`tests/api/leads-export.test.ts`): `format` inválido → 400; CSV começa com
BOM e com o cabeçalho esperado; JSON é array de dossiês aninhados; sem sessão →
redirect do proxy (não 200).

---

### [ ] 7.10 `Consultar PageSpeed` — integração oficial, server-side

API oficial: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`. Chave
**opcional** (`PAGESPEED_API_KEY`, adicionada a `lib/env.server.ts` como `.optional()`
— ausência não pode quebrar o boot nem o cadastro) e documentada no `README.md`.
Nenhum serviço pago, nenhuma chave no cliente, nenhuma API inventada.

- `lib/domain/pagespeed-parse.ts` (**puro**): `parsePagespeedResponse(json, strategy)`
  → os campos `pagespeed_*` já normalizados. Mapa:
  - scores: `lighthouseResult.categories.{performance,accessibility,best-practices,seo}.score` × 100, arredondado;
  - laboratório (ms): `audits['largest-contentful-paint' | 'first-contentful-paint' | 'total-blocking-time' | 'speed-index'].numericValue`; `audits['cumulative-layout-shift'].numericValue` (decimal, sem unidade);
  - campo/CrUX: `loadingExperience.metrics.{LARGEST_CONTENTFUL_PAINT_MS, INTERACTION_TO_NEXT_PAINT, CUMULATIVE_LAYOUT_SHIFT_SCORE}.percentile`. **INP só existe em campo** — sem CrUX, `pagespeed_*_inp` fica `null`, nunca 0;
  - `core_web_vitals`: `aprovado` se os três percentis de campo passam (LCP <= 2500 ms,
    INP <= 200 ms, CLS <= 0.1); `reprovado` se algum falha; `dados_insuficientes`
    quando não há `loadingExperience`;
  - `pagespeed_field_data_available`: `sim`/`nao` conforme a presença de CrUX
    (`DOSSIE.md` §7 — diferenciar campo de laboratório é requisito, não detalhe);
  - `report_url`: `https://pagespeed.web.dev/analysis?url=<encodeURIComponent(url)>&form_factor=<mobile|desktop>`.
- `lib/api/pagespeed.ts`: só o `fetch` (timeout por `AbortSignal.timeout(60000)`,
  `Promise.allSettled` para mobile+desktop em paralelo) devolvendo união discriminada
  `{ ok: true, data } | { ok: false, reason: 'timeout' | 'unavailable' | 'invalid_url' | 'rate_limited' | 'error', message }`.
  Uma estratégia pode falhar e a outra ser aproveitada.
- `lib/actions/pagespeed.ts` (`'use server'`): recebe a URL, **devolve** os valores
  para o formulário — **não grava sozinho**. O usuário revisa, edita se quiser e
  salva. `pagespeed_analyzed_at`/`pagespeed_analyzed_url` vêm preenchidos da consulta.
  Falha aqui **nunca** bloqueia o cadastro nem o salvamento: vira aviso na tela.

**Testes** (`tests/domain/pagespeed-parse.test.ts`): fixture JSON real recortada →
scores e métricas corretos; resposta sem `loadingExperience` → `dados_insuficientes` +
`field_data_available: 'nao'` + INP `null`; resposta de erro do Google não vira dado
parcial silencioso. `tests/actions/pagespeed.test.ts`: timeout e 4xx viram
`{ ok: false }` com a razão certa, sem lançar.

---

### [ ] 7.11 RLS, advisors e fechamento da fase

- `tests/rls.test.ts`: +6 casos para `lead_digital_audits`, no molde exato dos blocos
  da 6.4 (A lê a própria linha · B não vê linha de A · B não insere com `org_id` de A ·
  B não faz `UPDATE` nem `DELETE` de linha de A, checado com `.select()` encadeado,
  D-016 · `anon` não lê).
- `get_advisors(type:'security')` e `get_advisors(type:'performance')`: zero alerta
  novo em `sales`. A FK `lead_digital_audits.lead_id` já nasce indexada pelo índice
  composto — não somar mais um `unindexed_foreign_keys` a Q-008.
- Rodar a suíte inteira: `npm run typecheck && npm run lint && npm run test && npm run test:coverage && npm run test:rls && npm run build`.
- Entrega do `DOSSIE.md` §22: listar arquivos criados/alterados, explicar a migration
  e as decisões (apontando para D-035…D-041), descrever o fluxo ponta a ponta (criar
  lead → iniciar diagnóstico → salvar → editar → consultar PageSpeed → copiar dossiê →
  exportar), reportar testes e limitações.

**Pronto quando:** dá para cadastrar uma clínica odontológica, documentar a presença
digital pública dela, ver o score com a completude, clicar em **Copiar dossiê** e colar
o Markdown direto numa IA.

---

# Fases 8+ — pós-MVP (esboço, não especificar ainda)

Deliberadamente sem detalhe. Especificar antes de ter `FIELD_NOTES.md` é escrever
ficção — a Fase 6.5 vai mudar as prioridades.

| Fase | Módulo | Depende de |
|---|---|---|
| 8 | Agendamento + lembretes (Projeto 2 do roadmap) | uso real da Fase 6.5 |
| 9 | Gerador de propostas + PDF (Projeto 3) | catálogo de serviços |
| 10 | Kanban visual (Projeto 4) | volume de leads > 50 |
| 11 | IA conversacional + WhatsApp Cloud API (Projeto 5) | fluxo humano validado |
| 12 | Dashboard comercial (Projeto 6) | 3+ meses de dado real |
| 13 | Assistente interno com documentos (Projeto 7) | independente |

Ordem provável de mudar. A Fase 10 (Kanban) tende a subir se você tiver muitos leads;
a Fase 9 (propostas) tende a subir se propostas manuais virarem o gargalo.
