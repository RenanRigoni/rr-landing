# Decisões — DevRR Sales AI

Registro de decisões arquiteturais tomadas e **por quê**. Existe para não ficar
re-discutindo o mesmo trade-off toda semana.

Se você é o Sonnet e uma tarefa parece contrariar uma decisão daqui: **não mude a
arquitetura por conta própria.** Registre em "Questões abertas" no fim do arquivo e
devolva pro Opus.

Formato: `D-NNN` · decisão · alternativas descartadas · custo aceito.

---

## D-001 — Projeto novo portando o CRM-RR, não evolução dele

**Data:** 2026-08-23 · **Status:** decidido

O `CRM-RR/` já resolve pipeline, atividades, follow-up e IA com human-in-the-loop,
em 9 fases entregues. Ainda assim, o DevRR Sales AI é projeto novo que **copia as
camadas provadas** do CRM-RR (`lib/supabase/`, `lib/ai/`, validação, design system,
config de build).

**Por quê:**
- CRM-RR é single-tenant: RLS é `auth.uid() is not null`, sem `org_id`. Este produto
  é multi-tenant desde o dia 1. Retrofitar isso significa reescrever toda policy e
  toda query — não é mais barato que começar limpo com o código copiado.
- CRM-RR é **outbound** (você prospecta empresas). Este é **inbound** (o lead chega
  na PME). Qualificação BANT+, motivos de perda e duração de estágio são do modelo
  outbound e não se aplicam aqui.
- CRM-RR está em uso com seus dados reais. Convertê-lo em SaaS multi-tenant no meio
  do uso é risco desnecessário sobre uma ferramenta que funciona.

**Descartado:** evoluir o CRM-RR (risco sobre ferramenta em uso + mistura de dois
modelos de negócio); começar do zero absoluto (joga fora infra provada de IA, auth e
Supabase por nada).

**Custo aceito:** duas bases com código parecido em `lib/supabase/` e `lib/ai/`.
Correção de bug numa não propaga na outra. Aceitável enquanto forem 2 projetos; se
virar 3, extrair pacote compartilhado.

---

## D-002 — Migrations versionadas em arquivo, sempre

**Data:** 2026-08-23 · **Status:** decidido, bloqueante

Toda alteração de schema é um `.sql` em `supabase/migrations/NNNN_nome.sql`,
commitado **antes** de aplicar.

**Por quê:** `CRM-RR/supabase/migrations/` está vazio — todas as migrations foram
aplicadas direto no Supabase remoto via MCP. O schema daquele projeto só existe em
produção: não dá pra recriar em outro ambiente, revisar diff, nem fazer rollback.
Para um produto que vai rodar em vários clientes, isso é inviável.

**Custo aceito:** um passo a mais por alteração de schema.

---

## D-003 — `organizations` / `contacts` / `leads`, não `companies` / `customers`

**Data:** 2026-08-23 · **Status:** decidido

O roadmap original usa `companies` para o tenant e `customers` para o cliente da PME.
Aqui: `organizations` = tenant, `contacts` = a pessoa, `leads` = o interesse dela.

**Por quê:** "company" significaria duas coisas diferentes no mesmo schema (a PME que
usa o sistema, e a empresa do cliente dela). Isso gera bug de `join` e conversa
ambígua. `org_id` como coluna de tenant é convenção reconhecível em SaaS.

**Custo aceito:** divergência de vocabulário em relação ao `ROADMAP_ORIGINAL.md`.
Documentada em `ARCHITECTURE.md` → Multiempresa.

---

## D-004 — Estágio é linha configurável; `aguardando_resposta` não é estágio

**Data:** 2026-08-23 · **Status:** decidido

`pipeline_stages` é tabela por organização, com `key` estável para o código e `label`
editável. Os status `aguardando_resposta` e `followup` do roadmap **não** viram
estágio.

**Por quê:** os dois são estado **derivado** — "existe follow-up pendente para este
lead" —, não posição no funil. Se virassem estágio, todo lead com proposta enviada
oscilaria entre `proposta_enviada` e `aguardando_resposta` sem avançar, e o funil
mediria ruído. Deriva-se de `activities`.

**Custo aceito:** a tela precisa calcular esse estado em vez de ler uma coluna. É uma
`join` barata, com índice.

---

## D-005 — `activities` unifica histórico, tarefa e follow-up

**Data:** 2026-08-23 · **Status:** decidido

Uma tabela só. `due_at is null` = histórico; `due_at` + `pending` = agendado;
`is_auto` = gerado por regra.

**Por quê:** a tela "Ações de hoje" precisa mostrar tarefa manual e follow-up
automático na mesma lista ordenada por horário; a timeline do lead precisa
intercalar histórico e agendamento. Com duas tabelas, toda query vira `union all`.
O CRM-RR usa o mesmo modelo e ele se sustentou por 9 fases.

**Custo aceito:** a tabela tem colunas que ficam nulas dependendo do tipo de linha.

---

## D-006 — `next_action_at` e `last_contact_at` são cache mantido na aplicação

**Data:** 2026-08-23 · **Status:** decidido, revisar na Fase 11

Denormalizados em `leads`, atualizados por `lib/actions/`, **não por trigger SQL**.

**Por quê:** a regra de qual atividade conta como "próxima ação" é lógica de produto
que precisa de teste unitário rápido (`lib/domain/next-action.ts`). Trigger em SQL não
é testável com vitest e vira lógica de negócio escondida no banco. Sem o cache, a tela
principal faz subquery agregada em `activities` para cada lead a cada carregamento.

**Custo aceito:** disciplina — toda escrita em `activities` recalcula o cache. Mitigado
pelo job de reconciliação (tarefa 6.3) que detecta divergência.

---

## D-007 — Prompt no banco, nunca no código

**Data:** 2026-08-23 · **Status:** decidido

`sales.ai_prompts`, por organização, versionado, com um ativo por slug.

**Por quê:** tom de voz é ajuste de produto, não de código — a oficina e a
consultoria querem coisas diferentes. Prompt no banco permite versionar, comparar
versões e corrigir sem deploy. Com prompt hardcoded, toda mudança de tom vira um
ciclo de build.

**Custo aceito:** uma query a mais por chamada de IA; seed de prompts por organização
nova.

---

## D-008 — Todo output de IA nasce `pending_review`

**Data:** 2026-08-23 · **Status:** decidido

Nada gerado por IA é aplicado ou enviado automaticamente no MVP. O usuário lê, edita,
copia, envia pelo canal dele.

**Por quê:** o produto manda mensagem em nome do dono da PME para o cliente dele. Uma
mensagem errada não é bug de software — é dano à relação comercial do cliente. A
confiança precisa ser construída com o humano no meio antes de qualquer automação de
envio.

**Custo aceito:** menos "mágica" na demo. Revisar só depois de ter volume real de runs
mostrando taxa de aceite alta.

---

## D-009 — Cores como CSS custom properties desde a Fase 1

**Data:** 2026-08-23 · **Status:** decidido

Tokens de cor definidos em `:root` e consumidos pelo Tailwind via
`rgb(var(--token) / <alpha-value>)`.

**Por quê:** white-label por organização é requisito previsível do modelo comercial.
Fazer agora custa cinco minutos de config; fazer depois custa auditar todo componente
atrás de cor hardcoded.

**Custo aceito:** uma indireção a mais na config do Tailwind.

---

## D-010 — Sem integração de WhatsApp no MVP

**Data:** 2026-08-23 · **Status:** decidido

Fluxo `copiar → colar → marcar como enviada`. WhatsApp Cloud API só na Fase 10.

**Por quê:** a Cloud API traz aprovação de template, janela de 24h, verificação de
negócio e webhook — semanas de trabalho que não testam a hipótese central do produto.
A hipótese é: *"o dono da PME abre a tela de manhã e dá retorno para quem precisa"*.
Isso se testa com copiar e colar. Se o fluxo não gruda no manual, integrar o WhatsApp
não salva.

**Custo aceito:** demo menos impressionante.

---

## D-011 — Env em dois arquivos: `env.ts` (público) e `env.server.ts` (servidor)

**Data:** 2026-08-23 · **Status:** decidido no checkpoint da Fase 1 · **Origem:** Sonnet, tarefa 1.3

`lib/env.ts` valida só `NEXT_PUBLIC_*` e **não** importa `server-only`.
`lib/env.server.ts` valida `SUPABASE_SERVICE_ROLE_KEY`, `AI_GATEWAY_API_KEY` e
`CRON_SECRET`, e importa `server-only` na primeira linha.

**Por quê:** `lib/supabase/client.ts` roda no browser e precisa das públicas. Se as duas
validações vivessem no mesmo módulo com `server-only` no topo, o bundle do browser
quebraria no build. Com um módulo só sem `server-only`, o nome das variáveis de servidor
entraria em código de cliente — exatamente o que `ARCHITECTURE.md` → Segurança proíbe.

**Regra que isso cria:** nada que possa acabar no bundle do browser importa
`@/lib/env.server`. Hoje só `lib/supabase/admin.ts` importa (e ele já é `server-only`).
Vale a mesma verificação por grep que já existe para `@/lib/supabase` em `components/`.

**Custo aceito:** dois arquivos em vez de um; `zod` entra no bundle do browser via
`lib/env.ts` (alguns KB, aceitável pelo ganho de falhar no boot em vez de em produção).

---

## D-012 — `proxy.ts` é o único ponto de sessão, e o matcher é parte do contrato

**Data:** 2026-08-23 · **Status:** decidido no checkpoint da Fase 1

Next.js 16 usa `proxy.ts` na raiz (não `middleware.ts`). Ele só chama
`updateSession` de `lib/supabase/middleware.ts`, que renova a sessão e faz dois
redirects: sem usuário → `/login`; com usuário em `/login` → `/today`.

**O matcher não é detalhe de configuração, é regra de segurança e de funcionamento:**

- tudo que não é asset estático passa por ali — é o que garante que nenhuma rota de
  aplicação nasce desprotegida por esquecimento;
- por isso mesmo, **toda rota que se autentica por outro mecanismo tem que ser
  excluída explicitamente**. O caso concreto é `/api/cron/*`, que se autentica por
  `CRON_SECRET` e não tem cookie: hoje ela levaria `307` para `/login` e falharia em
  silêncio. Corrigir na 6.3, antes de existir a primeira rota de cron.

**Descartado:** proteger rota por rota dentro de cada layout — dá o mesmo resultado
quando você lembra, e deixa buraco quando esquece. O default seguro vale mais que a
granularidade.

**Custo aceito:** uma chamada a `supabase.auth.getUser()` por request.

---

## D-013 — Toda RLS que checa papel dentro de `org_members` passa por helper `security definer`

**Data:** 2026-08-23 · **Status:** decidido, tarefa 2.2

`org_members` precisa restringir escrita a `role in ('owner','admin')`
(`DATABASE.md`), mas uma policy de `org_members` não pode consultar `org_members`
diretamente — é a mesma recursão que `current_org_ids()` já resolve para leitura
(`ARCHITECTURE.md` → Multiempresa). Criado `sales.current_org_role(p_org_id)`,
`security definer`, `search_path` fixo, mesmo padrão de `current_org_ids()`.

**Por quê:** sem o helper, `with check (exists (select 1 from org_members where
org_id = x and user_id = auth.uid() and role in (...)))` dispara a própria policy de
`org_members` ao ler `org_members` — recursão infinita, o mesmo bug que
`current_org_ids()` já existe para evitar em `select`.

**Regra que isso cria:** qualquer tabela futura que precise checar papel/atributo de
`org_members` dentro de uma policy usa um helper `security definer` dedicado, nunca
uma subquery direta em `org_members`. `org_members` também é a primeira tabela a não
seguir o padrão "uma policy `tenant_isolation` `for all`" — leitura (qualquer membro
vê os outros da própria org) e escrita (só owner/admin) têm regras diferentes,
exigindo policies por operação. Documentar esse padrão em `DATABASE.md` quando a
próxima tabela precisar de policy assimétrica por operação.

**Efeito colateral aceito, não é falha:** `get_advisors(security)` acusa
`current_org_role`, `current_org_ids` e `create_organization` como
"Signed-In Users Can Execute SECURITY DEFINER Function" (WARN). É esperado — as três
são RPC que o app precisa mesmo chamar via `authenticated`, e nenhuma vaza dado de
outro usuário: `current_org_ids`/`current_org_role` só retornam dado do próprio
`auth.uid()` (nulo/vazio para org alheia), `create_organization` cria uma org nova e
torna o chamador `owner` dela — comportamento pretendido. Nenhuma das três aparece
para `anon` (confirmado via `has_function_privilege`).

**Custo aceito:** uma função a mais por tipo de checagem de papel; policies de
`org_members` mais numerosas (4) que o padrão de 1 policy por tabela.

---

## D-014 — Gate de onboarding consulta o banco em toda request autenticada, sem cache

**Data:** 2026-08-23 · **Status:** decidido, tarefa 2.3

`lib/supabase/middleware.ts` roda `select id from org_members limit 1` em toda
request de usuário autenticado (exceto a resposta já resolvida por outro branch),
para decidir se ele vai para `/onboarding` ou segue para a rota pedida.

**Por quê:** é o mesmo trade-off já aceito para `supabase.auth.getUser()` no mesmo
middleware — uma chamada de rede a mais por request, em troca de nunca depender de
estado potencialmente desatualizado. Cachear "tem org" em cookie ou JWT claim
economizaria a query, mas criaria uma janela onde um cookie desatualizado prende o
usuário no onboarding (ou libera acesso indevido) até expirar — errado justamente no
momento mais sensível do fluxo (cadastro).

**Descartado:** cookie `has_org` setado após `createOrganization` — resolve o caso
feliz mas não invalida sozinho se a membership for removida por outro caminho (fora
de escopo hoje, mas a tabela já suporta múltiplos membros desde D-013).

**Custo aceito:** uma query extra (`org_members`, índice por `user_id` já criado na
2.2) em toda navegação autenticada. Revisar se performance real na 6.5 justificar.

---

## D-015 — Usuários de teste de RLS são provisionados automaticamente, não manualmente

**Data:** 2026-08-23 · **Status:** decidido, tarefa 2.4

`tests/helpers/rls-fixtures.ts` → `ensureTestUser()` garante que
`rls-test-a@devrr-sales-ai.test` e `rls-test-b@devrr-sales-ai.test` existem antes de
`tests/rls.test.ts` rodar: tenta logar primeiro (rápido); só cria a conta via API
admin do Supabase Auth (`email_confirm: true`) se o login falhar. Domínio `.test`
(reservado pela IANA, nunca resolve — nenhum e-mail sai de verdade).

**Por quê:** o texto original da tarefa 2.4 pedia "documentar em README.md como criar
os dois usuários de teste", sugerindo criação manual via dashboard — mas isso torna a
suíte não reproduzível sem um passo humano toda vez que o ambiente for resetado (ou
em CI, quando existir). Provisionamento automático e idempotente resolve isso sem
custo: primeira execução cria, todas as seguintes só logam.

**Descartado:** documentar só o passo manual (dashboard → Authentication → Users) —
mantido no README.md como *fallback* para reset manual, não como caminho principal.

**Custo aceito:** a suíte de RLS precisa de `SUPABASE_SERVICE_ROLE_KEY` válida em
`.env.local` — achado real na 2.4: essa variável estava vazia desde a cópia original
do `.env.local` do CRM-RR (tarefa 1.3), nunca antes exercitada em código.

---

## D-016 — Teste de RLS em UPDATE/DELETE sempre encadeia `.select()`

**Data:** 2026-08-23 · **Status:** decidido, tarefa 2.4 · **Aplica a:** todo teste de RLS futuro (Fase 6.4 inclusive)

Quando a cláusula `USING` de uma policy bloqueia um `UPDATE`/`DELETE` (o usuário não
tem permissão nenhuma sobre a linha), o Postgres **não gera erro** — a linha
simplesmente não entra no conjunto afetado, e a operação "sucede" com 0 linhas.
Erro real só acontece quando `USING` passa mas o `WITH CHECK` rejeita o novo valor
(ex.: mover `org_id` para uma org onde o usuário não é admin).

**Por quê importa:** um teste que só checa `expect(error).not.toBeNull()` em um
`UPDATE`/`DELETE` bloqueado por `USING` **passa por engano mesmo se a policy cair** —
`error` vem `null` de qualquer forma. Achado real na 2.4: os dois testes de "member
não consegue alterar/apagar a própria membership" falharam na primeira rodada
exatamente por isso, e a correção (checar `data` do `.select()` encadeado, esperando
`[]`) é o padrão certo, não gambiarra pontual.

**Regra permanente:** todo teste de RLS que exercita `UPDATE`/`DELETE` encadeia
`.select()` e verifica `data` (deve vir `[]` quando bloqueado por `USING`); só usa
`expect(error).not.toBeNull()` para `INSERT` (onde `WITH CHECK` falhando sempre gera
erro real) ou para `UPDATE` que muda um valor coberto por `WITH CHECK` (ex.: `org_id`).

**Custo aceito:** nenhum — é estritamente mais correto que a alternativa, sem
complexidade extra relevante.

---

## D-017 — Dado de governança do tenant tem RLS por papel, não `for all`

**Data:** 2026-08-23 · **Status:** decidido no checkpoint da Fase 2, implementado na tarefa 2.5

`sales.organizations` nasceu (0002) com uma policy `tenant_isolation` `for all`:
`using (id in (select sales.current_org_ids()))`. Isso é isolamento entre orgs
correto, e autorização dentro da org **errada** — dá a qualquer `member` o mesmo
poder que o `owner` sobre a linha da organização.

**Achado real, provado no checkpoint**, não hipótese: simulação SQL com os dois
usuários reais de teste, `set local role authenticated` + `request.jwt.claims` do
usuário B com papel `member` na org de A. Resultado: `UPDATE organizations SET name`
→ **1 linha afetada** (nome trocado); `DELETE FROM organizations` → **1 linha
afetada** (org apagada). Ambos deveriam ser 0.

**Por que importa mais a cada fase:** toda tabela transacional da Fase 3+ tem
`org_id ... references sales.organizations(id) on delete cascade`. A partir da 3.2,
esse `DELETE` de uma linha apaga contatos, leads, atividades, follow-ups, runs de IA
e auditoria da empresa inteira — um `member` derruba o tenant com uma chamada
PostgREST, sem passar por nenhuma tela. Hoje não é explorável (o onboarding cria a
org com um único membro `owner` e não existe fluxo de convite), e é exatamente por
isso que a hora de fechar é agora: a superfície é de duas policies.

**Decisão:** `organizations` passa a seguir o mesmo modelo assimétrico de
`org_members` (D-013) — `select` por associação, `update` para `owner`/`admin`,
`delete` só para `owner`, nenhuma policy de `insert` (a criação legítima é só pela
RPC `create_organization`, `security definer`, que não passa por RLS). SQL final em
`DATABASE.md` → `sales.organizations`.

**Regra geral que isso cria:** o padrão `tenant_isolation` `for all` vale para dado
**operacional** (contatos, leads, atividades — todo membro trabalha o funil da
empresa). Dado de **governança do tenant** (a própria organização, quem é membro, e
futuramente assinatura/cobrança) é sempre por papel. Critério: se a operação muda
*quem manda* ou *se o tenant existe*, não é `for all`.

**Descartado:** deixar para quando existir gestão de membros na UI — a policy errada
já está aplicada no banco, e o custo de corrigir cresce com o número de tabelas que
cascateiam a partir de `organizations`. Também descartado tirar o `on delete cascade`
(ele está certo: org apagada não deve deixar órfão; o que estava errado era quem pode
apagar).

**Custo aceito:** três policies onde havia uma; `organizations` deixa de ser
gravável por `member` — se algum dia um `member` precisar editar algo da empresa,
vira coluna/tabela separada, não afrouxamento desta policy.

---

## D-018 — Erro do gate de onboarding não decide destino às cegas; deixa a request seguir

**Data:** 2026-08-23 · **Status:** decidido, tarefa 2.5 · **Corrige:** Achado B do checkpoint da Fase 2

`lib/supabase/middleware.ts` descartava o `error` de `select id from org_members
limit 1`, tratando qualquer falha (rede, timeout, PostgREST fora do ar) como
`hasOrg = false`. Efeito: usuário autenticado **com** organização, numa falha
transitória, era jogado em `/onboarding` — onde o único caminho oferecido é criar
uma **segunda** empresa.

**Decisão:** ao capturar `error`, o middleware não tenta adivinhar `hasOrg`. Fora de
`/login`, deixa a request seguir para a rota pedida sem aplicar o gate — a própria
página resolve org ausente com segurança (`getCurrentOrg()` retorna `null`,
`requireOrgId()` lança). Saindo de `/login` (onde algum destino precisa ser
escolhido), o fallback é `/today`, que por sua vez redireciona para `/onboarding` se
`getCurrentOrg()` confirmar ausência real de organização.

**Por quê não é bypass de segurança:** este gate é UX (evitar telas quebradas para
quem não tem org), não autorização. Nenhuma query de dado deixa de passar por RLS —
`org_id` nunca é decidido pelo middleware, sempre por `getCurrentOrg()`/
`requireOrgId()` no servidor, que consultam o banco de novo, com RLS de novo.
Deixar a request seguir numa falha do gate não abre nenhum dado que a policy não
abriria de qualquer forma.

**Descartado:** manter `hasOrg = false` no erro (o bug original — falso negativo
prende usuário existente no onboarding); assumir `hasOrg = true` no erro (falso
positivo simétrico — deixaria passar direto quem de fato não tem org ainda,
quebrando em outra tela em vez de no onboarding, sem ganho real).

**Custo aceito:** numa falha transitória bem no meio da navegação, o usuário pode
bater numa página que ainda não resolveu a org (ela mesma trata isso — ver
`app/(app)/today/page.tsx`) em vez de ser redirecionado de propósito. Preferível a
destruir o fluxo de quem já tem organização.

---

## D-019 — `tsconfig.json` da raiz exclui `CRM-RR/` e `devrr-sales-ai/`

**Data:** 2026-08-23 · **Status:** decidido e aplicado · **Resolve:** Q-004 · **Escopo:** repositório, não este projeto

`tsconfig.json` da raiz (`rr-dev`, projeto Vercel `rr-landing`) incluía `**/*.ts` e
`**/*.tsx` sem excluir os projetos irmãos. Isso não era só ruído de
`tsc --noEmit` avulso (subestimado quando a Q-004 foi aberta): o `next build` da
raiz também typecheca por esse `tsconfig.json`, e quebrou o deploy real do
`rr-landing` na Vercel — `CRM-RR/app/(app)/ai-quality/page.tsx` importa
`@/lib/queries/ai`, que existe de verdade em `CRM-RR/lib/queries/ai.ts`, mas sob o
`paths` da raiz (`@/*` → `./*` da raiz, não de `CRM-RR/`) o alias resolve para um
caminho que não existe — "Cannot find module" falso, build vermelho em produção.

**Correção:** `"CRM-RR"` e `"devrr-sales-ai"` adicionados ao `exclude` do
`tsconfig.json` da raiz. Cada projeto já tem `tsconfig.json` e build próprios,
isolados — excluir da raiz só para de misturar os três; não reduz cobertura de
typecheck de nenhum deles.

**Validado:** `next build` da raiz limpo (`/`, `/servicos`, `/_not-found`);
`npm run typecheck` de `CRM-RR/` e de `devrr-sales-ai/` continuam limpos, cada um
isolado no próprio `tsconfig.json`.

**Descartado:** deixar como dívida documentada (postura original da Q-004) — deixou
de ser opção no momento em que ficou provado que quebra o build real, não só o
`tsc` avulso.

**Custo aceito:** nenhum — é correção estritamente melhor, sem trade-off.

---

## D-020 — Actions ganham módulo `*-core` injetável; IDs relacionados são checados por org na mão

**Data:** 2026-08-24 · **Status:** decidido, tarefa 3.4 · **Aplica a:** todo `lib/actions/*.ts` futuro

Duas descobertas na 3.4 que viram padrão permanente, não só solução pontual de
`contacts.ts`/`leads.ts`.

**1. `cookies()` não roda em vitest puro — actions precisam de um núcleo
testável separado do `'use server'`.** `lib/supabase/server.ts` usa
`next/headers` (`cookies()`), que só existe dentro de uma request real do
Next; chamar `createClient()` (e por tabela, `requireOrgId()`) direto de um
teste vitest lança `cookies was called outside a request scope` — confirmado
na prática antes de decidir, não hipótese. Sem separação, a única forma de
testar a lógica de uma action seria mockar o Supabase, o que não prova nada
de RLS/isolamento (mesmo argumento de `README.md` → Testes de RLS).

**Decisão:** todo arquivo de action ganha um par de arquivos —
`lib/actions/<entidade>-core.ts` (sem `'use server'`, funções `async` que
recebem `supabase` (client já autenticado) e `orgId` como parâmetros, toda a
lógica de validação/gravação mora aqui) e `lib/actions/<entidade>.ts`
(`'use server'`, só resolve `orgId` via `requireOrgId()`, `supabase` via
`createClient()`, delega pro `-core` e chama `revalidatePath`). Produção usa
o wrapper; testes de integração chamam o `-core` direto com um client
autenticado real (`tests/helpers/rls-fixtures.ts`, mesmo padrão de
`tests/rls.test.ts`) — prova real de isolamento entre tenants na camada de
action, não só na de RLS pura. `tests/actions/*.test.ts` roda em
`vitest.rls.config.ts` pelo mesmo motivo de `tests/rls.test.ts`: precisa de
rede real e dos dois usuários de teste.

**Efeito colateral que também virou regra:** com mais de um arquivo
dependendo dos mesmos dois usuários reais (`rls-test-a/b`) na mesma suíte, o
paralelismo padrão de arquivo do Vitest faz um arquivo apagar organização que
o outro ainda está usando — `tests/rls.test.ts`, inalterado, passou a falhar
de forma instável só por rodar ao lado de `tests/actions/leads.test.ts`.
`vitest.rls.config.ts` ganhou `fileParallelism: false`. Vale para todo teste
futuro adicionado a essa suíte.

**2. FK garante que a linha existe, não que existe na organização certa —
toda referência a outra tabela multi-tenant precisa de checagem explícita de
`org_id`.** `sales.leads.contact_id`/`source_id`/`stage_id` são FKs simples
para `contacts`/`lead_sources`/`pipeline_stages` (migration 0005); nenhuma
delas garante que a linha referenciada pertence à mesma organização do lead.
RLS de `leads` filtra só `leads.org_id` — não impede um `insert`/`update`
apontando `stage_id` de outra organização, porque a FK só checa "a linha
existe em algum lugar" e a policy de `pipeline_stages` roda numa query
separada, sem saber que está sendo referenciada por um lead de fora.

**Decisão:** toda action que recebe um id de entidade relacionada
(`contact_id`, `source_id`, `stage_id`, e o padrão vale para o que vier
depois — `rule_id`, `ai_prompt_id`, etc.) confirma com uma query própria
(`select id from <tabela> where id = :id and org_id = :orgId`) antes de
gravar. `lib/actions/leads-core.ts` → `belongsToOrg()`. Testado de propósito
com id real de outra organização, não só com uuid inválido — é o caso que
prova a checagem existe, o `uuid()` do Zod só prova que o formato é válido.

**Descartado:** confiar só na RLS da tabela relacionada (ela impede o
não-membro de *ler* a linha errada, mas o `insert`/`update` em `leads` nunca
consulta a policy de `pipeline_stages`, então não vaza erro nem bloqueia
sozinha); resolver com constraint de banco (checar `org_id` cruzado entre
tabelas exigiria trigger ou constraint composta bem mais complexa que a
checagem de aplicação, para um ganho marginal — a checagem em código já é
suficiente e testada).

**Custo aceito:** uma query a mais por id relacionado em cada `create`/
`update` que referencia outra tabela multi-tenant.

---

## D-021 — Data relativa via `date-fns` + `ptBR`; join de exibição em queries explícitas, não embedded select

**Data:** 2026-08-24 · **Status:** decidido, tarefa 3.5 · **Aplica a:** toda tela futura que mostrar data relativa ou juntar linhas de tabelas `sales.*` diferentes

**1. `lib/domain/date.ts` usa `date-fns` (`formatDistance`, locale `ptBR`), não
implementação própria.** `date-fns` já é dependência pinada do projeto
(`ARCHITECTURE.md`: versões iguais às do `CRM-RR/package.json` de propósito)
e o CRM-RR já usa exatamente esse par —
`components/pipeline/DealCard.tsx` de lá chama `formatDistanceToNow` com
`{ addSuffix: true, locale: ptBR }` pro mesmo propósito ("Próximo: ... há 4
dias"). `formatDistance` (não `formatDistanceToNow`) foi escolhida de
propósito: só ela aceita um segundo argumento de data explícito, necessário
pra passar `now` no teste (determinístico) e no render (data fixa por
request).

**Achado ao testar, não hipótese:** a locale `ptBR` do `date-fns` usa "cerca
de" em alguns baldes (`"há cerca de 3 horas"`, `"há cerca de 2 anos"`) e não
em outros (`"há 4 dias"`, `"há 2 meses"`) — não é adivinhável, teria quebrado
uma asserção de teste escrita "no chute". Toda string esperada em
`tests/domain/date.test.ts` foi conferida rodando a função de verdade antes
de virar `expect(...).toBe(...)`, mesmo cuidado do achado do NBSP em
`formatBRL` (D-020 documentou o padrão do achado, este é outro caso dele).

**Descartado:** reimplementar o cálculo de distância relativa à mão (o que
`lib/domain/phone.ts`/`money.ts` fazem para BR-específico não tem
equivalente pronto: normalização de telefone BR e symbol `R$` via `Intl`
são triviais o bastante pra não precisar de lib; texto relativo em
português com plural/aproximação correta não é — reinventar é retrabalho e
mais superfície de bug que usar a lib que o CRM-RR já valida em produção).

**2. `lib/queries/leads.ts` junta lead + contato + estágio + fonte com três
`select` explícitos filtrados por `org_id` e `.in(ids)`, não com embedded
select do postgrest-js (`.select('*, contacts(...), pipeline_stages(...)')`).**
Com os types de `sales` mantidos à mão (limitação já documentada:
`generate_typescript_types` não introspecta esse schema), não há garantia de
que o formato de `Relationships` em `database.types.ts` produz o alias que o
embed do postgrest-js espera pra tipar certo — e esta mesma tarefa/fase já
teve um caso real de `.select()` virando `GenericStringError` por motivo de
tipagem não óbvio (string concatenada perdendo o tipo literal, achado da
3.4). Três queries simples com filtro `org_id` explícito são previsíveis:
mesmo padrão já usado em toda a camada de queries, sem depender de um
mecanismo de tipagem que não dá pra confirmar sem tentar.

**Descartado:** embedded select mesmo assim, aceitando `as any`/cast solto no
retorno — resolveria a tipagem à força, mas esconderia erro de coluna
renomeada ou relação errada até o runtime, exatamente o tipo de bug que os
types manuais já tornam mais fácil de introduzir.

**Custo aceito:** `attachDisplayData()` faz 3 queries em vez de 1 por
carregamento de lista/detalhe de lead — aceitável no volume do MVP (uma PME
não tem milhares de leads na tela ao mesmo tempo); revisar se paginação
(fora do escopo do MVP) tornar isso um gargalo real.

---

## D-022 — Formulário de cadastro em um passo: dedupe por telefone só sugere, nunca força; campos controlados por causa do reset automático do React 19 em `useActionState`

**Data:** 2026-08-24 · **Status:** decidido, tarefa 3.6 · **Aplica a:** todo formulário futuro que precise reapresentar uma confirmação sem perder o que o usuário já digitou

**1. `createLeadIntakeCore` nunca cria contato duplicado por engano, mas também
nunca bloqueia o cadastro por telefone repetido.** Se o telefone digitado bate
com um contato já existente na organização, a função devolve
`status: 'duplicate'` com os dados do contato encontrado e **não grava nada**
— quem decide é o usuário: reenviar com `contact_id` (vincula ao existente,
`belongsToOrg()` revalida mesmo assim — D-020) ou com `force_new_contact`
(cria mesmo repetido; PMEs reais têm dois clientes na mesma linha de WhatsApp
comercial, forçar unicidade seria dado errado, não proteção).

**Descartado:** bloquear silenciosamente e sempre vincular ao contato
encontrado — tira do usuário um caso legítimo (nova pessoa, mesmo telefone);
bloquear com erro duro exigindo edição manual do telefone — o objetivo
declarado da tarefa é "nunca forçar cadastrar contato antes", forçar resolver
um conflito de telefone tem o mesmo efeito de atrito.

**2. `components/leads/NewLeadForm.tsx` usa inputs controlados, não o padrão
uncontrolled+`defaultValue` que o resto do projeto usa (`OnboardingForm`,
`LoginForm`).** Achado real testado no browser antes de decidir: com
`<form action={formAction}>` via `useActionState`, o React 19 reseta todo
input não controlado depois de **qualquer** chamada da action que não lança
exceção — inclusive quando `createLeadIntake` devolve `status: 'duplicate'`
sem erro nenhum. Confirmado visualmente (screenshot): nome, título, e-mail,
empresa, interesse, fonte, valor e observações voltavam vazios assim que a
faixa de "já existe contato com esse telefone" aparecia — exatamente o
momento em que perder o que foi digitado dói mais. Trocar os inputs para
controlados (estado local `values`, `value`+`onChange`) resolve porque o
valor renderizado deixa de depender do que o DOM tenta resetar sozinho.

**Descartado:** `defaultValue` combinado com `key` para forçar remount —
resolveria, mas exigiria devolver os valores digitados de volta pelo próprio
`LeadIntakeResult` (estado do servidor ecoando o que o cliente já tem)
só para poder montar de novo o mesmo `defaultValue`; mais estado percorrendo
a rede pelo mesmo resultado. Estado controlado local é mais direto quando o
formulário já precisa sobreviver a múltiplas idas e voltas da mesma action.

**Regra geral que isso cria:** todo formulário que possa reprocessar a mesma
tela mais de uma vez com a mesma instância montada (confirmação, correção de
erro sem navegação) usa inputs controlados. Formulário de submissão única
(cria e sai, ou cria e falha só uma vez antes de o usuário editar) continua
uncontrolled — é o caso comum, e o padrão dos formulários anteriores
(`OnboardingForm`) segue correto para o caso deles.

**Custo aceito:** mais código no componente (um `useState` de objeto e um
`handleChange` genérico) do que o padrão uncontrolled do resto do projeto.

---

## Questões abertas

Sonnet: adicione aqui o que travar. Opus resolve no próximo checkpoint.

- **Q-001** — Um contato pode ter vários leads simultâneos abertos? Modelo permite.
  Falta decidir se a UI incentiva ou alerta contra. Decidir na Fase 3.5, com dado real.
- **Q-002** — Quando um lead vai para `perdido`, o contato deve entrar em alguma
  cadência de reativação futura? Fora do MVP; reavaliar após a Fase 6.5.
- **Q-003** — Multi-usuário por organização: `org_members` já suporta, mas não há
  "dono do lead" (`assigned_to`). Adicionar quando existir a primeira PME com 2+
  vendedores. Não antes.
- ~~**Q-004**~~ — resolvida, ver **D-019**.
