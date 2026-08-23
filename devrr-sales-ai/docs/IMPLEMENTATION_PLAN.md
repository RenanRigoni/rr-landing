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
> **Não fiz, e por quê:**
> - **"Expor `sales` em Settings → API → Exposed schemas"** (citado no texto
>   da tarefa): é ação exclusiva do dashboard do Supabase, sem equivalente em
>   SQL nem em nenhuma ferramenta MCP disponível — confirmado tentando
>   `generate_typescript_types`, que só devolveu o schema `public`
>   (`sales` não introspectado por não estar exposto). **Ação manual
>   pendente do usuário** antes da 2.2, senão `org_members`/`organizations`
>   também não aparecerão no gerador.
> - **Types "gerados"**: como consequência do ponto acima, não veio do
>   `generate_typescript_types`. Escrevi `lib/types/database.types.ts` à
>   mão, espelhando exatamente os 6 enums da migration aplicada (`Tables`/
>   `Views`/`Functions`/`CompositeTypes` continuam `Record<string, never>`
>   — nenhum existe ainda). Comentário no arquivo explica que é temporário até
>   a exposição manual acontecer; a partir da 2.2 o gerador real pode
>   substituir este arquivo por completo.
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

### [ ] 2.2 Organizations + org_members

`supabase/migrations/0002_organizations.sql`:

- Tabelas `organizations` e `org_members` conforme `DATABASE.md`.
- RLS nas duas. `organizations` usa `id in (select sales.current_org_ids())`.
- RPC `sales.create_organization(p_name text)` `security definer`: cria a org, insere
  o `auth.uid()` como `owner`, retorna o `id`. Precisa ser RPC porque a policy de
  insert não pode passar antes da membership existir.
- Trigger de `updated_at`.

**Pronto quando:** advisors limpo, types regerados, `DATABASE.md` atualizado.

### [ ] 2.3 Vincular usuário → organização na aplicação

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

### [ ] 2.4 Provar o isolamento

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

# FASE 3 — Leads

### [ ] 3.1 Catálogos: fontes e estágios

`supabase/migrations/0003_catalogs.sql`: `lead_sources` e `pipeline_stages` conforme
`DATABASE.md`, com RLS.

- Função `sales.seed_org_defaults(p_org_id uuid)` (`security definer`) criando as 6
  fontes e os 7 estágios padrão.
- Chamar `seed_org_defaults` dentro de `create_organization` (alterar a RPC da 2.2).
- `lib/queries/catalogs.ts`: `listStages()`, `listSources()`.

**Pronto quando:** org nova nasce com 6 fontes e 7 estágios; a org criada na 2.3
recebe o seed via chamada manual da função.

### [ ] 3.2 Contatos e leads (banco)

`supabase/migrations/0004_contacts_leads.sql` conforme `DATABASE.md`, com todos os
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

`0005_activities.sql` e `0006_followup_rules.sql` conforme `DATABASE.md`.
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
- `0008_views.sql`: `v_today_actions` e `v_leads_without_action`, ambas com
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

- `0007_ai.sql`: `ai_prompts` e `ai_runs` conforme `DATABASE.md`.
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
- `0009_audit.sql` + `lib/actions/audit.ts` portado do CRM-RR: registrar
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
