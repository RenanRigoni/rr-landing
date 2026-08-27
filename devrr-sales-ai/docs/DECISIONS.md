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

## D-023 — Um contato pode ter vários leads abertos ao mesmo tempo, e a UI não alerta

**Data:** 2026-08-24 · **Status:** decidido no checkpoint da Fase 3 · **Resolve:** Q-001

O modelo sempre permitiu (`leads.contact_id` é FK simples, sem unicidade), mas
faltava decidir se a interface incentiva, ignora ou alerta contra. A Q-001 marcava
"decidir na Fase 3.5, com dado real" e nenhuma tarefa decidiu — enquanto isso, a 3.6
já implementou o comportamento na prática: quando o telefone bate com um contato
existente, o botão "Vincular a este contato" cria um **lead novo** para um contato
que pode já ter outros leads abertos, sem nenhum aviso.

**Decisão: permitir, sem alerta.** É o comportamento certo para o ICP do produto
(`PRODUCT_SPEC.md`): a PME de serviço recebe do mesmo cliente um pedido de orçamento
hoje e outro daqui a duas semanas, e os dois são vendas independentes que precisam de
follow-up independente. Tratar o segundo como suspeito criaria atrito exatamente no
fluxo que o produto existe para destravar — e `D-003` já define lead como "o
interesse", não "o cliente", justamente para que vários coexistam.

**Descartado:** alertar "este contato já tem lead aberto" (transforma o caso normal
em exceção e treina o usuário a ignorar o aviso); bloquear ou sugerir mesclar
(destrói a separação entre contato e interesse, que é a base do modelo em D-003).

**O que isso não resolve:** a tela de contato ainda não mostra "este contato tem N
leads" — quando `/contacts` existir, listar os leads do contato é a forma correta de
dar essa visibilidade, em vez de um alerta no cadastro.

**Custo aceito:** nada impede dois leads praticamente idênticos criados por engano
para o mesmo contato. A lista de leads mostra os dois, e o usuário resolve marcando
um como perdido. Revisitar se o uso real da Fase 6.5 mostrar que acontece com
frequência.

---

## D-024 — `@date-fns/tz` para todo cálculo de fuso horário; `BusinessHours.days` usa a convenção de `Date.getDay()`

**Data:** 2026-08-25 · **Status:** decidido, tarefa 4.2 · **Aplica a:** `lib/domain/followup.ts` e todo domínio futuro que precise de horário local por organização

**1. `date-fns` sozinho (v4, já pinada por `ARCHITECTURE.md`) não tem noção de
fuso horário** — confirmado por execução: `Object.keys(require('date-fns'))`
não tem nenhum símbolo de timezone. Sem isso, `computeFollowupSchedule`
calcularia "horário comercial" no fuso do servidor, não da organização —
exatamente o bug que `DATABASE.md` descreve como motivo de `timezone`/
`business_hours` existirem ("follow-up agendado pra sábado às 3h da manhã é
bug de produto").

**Decisão:** adicionar `@date-fns/tz` (`^1.5.0`) como dependência.
`TZDate` se comporta como `Date` para qualquer API que espera um `Date`
(`instanceof Date`, `.getTime()`, comparações), mas seus getters/setters
(`getDay`, `getHours`, `setHours`...) leem/escrevem no horário local do fuso
informado — inclusive DST, resolvido pela ICU do runtime (Node/V8), não por
aritmética de offset escrita à mão. Confirmado por execução antes de
escrever qualquer teste: mesmo instante UTC em `America/Sao_Paulo` (UTC-3) e
`America/Manaus` (UTC-4) produz horas locais diferentes; `addDays`/
`setHours` do `date-fns` preservam a classe `TZDate` (`instanceof TZDate` se
mantém depois da chamada).

**Por que não é violação de "versões iguais às do CRM-RR" (`CLAUDE.md`):**
essa regra existe pra portar código 1:1 entre os dois projetos
(`lib/supabase/`, `lib/ai/`, etc.). `followup.ts` não tem equivalente no
CRM-RR — `ARCHITECTURE.md` só lista `next-action.ts` como referência de
estilo pra reescrever, não pra portar literalmente, e o CRM-RR é
single-tenant (não tem fuso por organização pra calcular). É dependência
nova de funcionalidade nova, não divergência de uma já portada.

**Descartado:** implementar a conversão de fuso à mão com `Intl.DateTimeFormat`
+ aritmética de offset — tecnicamente possível (é o que `@date-fns/tz` faz
por baixo), mas é a classe de código mais fácil de acertar no caso feliz e
errar silenciosamente em borda de DST/virada de ano; escrever isso à mão
custaria mais superfície de bug pra um produto que já teve o cuidado de
fixar `date-fns` como dependência única de manipulação de data.
`date-fns-tz` (o pacote mais antigo, não `@date-fns/tz`) foi descartado por
ser de outra major/API incompatível com `date-fns` v4 — `@date-fns/tz` é o
companion oficial do mesmo projeto, pareado com a v4 já pinada.

**2. `BusinessHours.days: number[]` usa a convenção nativa de
`Date.getDay()`** (`0` = domingo … `6` = sábado), não ISO 8601 (`1` =
segunda … `7` = domingo). O default `[1,2,3,4,5]` (segunda a sexta) dá o
mesmo resultado nas duas convenções — a diferença só apareceria se algum
dia existisse regra de expediente aos domingos, então vale registrar antes
que a ambiguidade vire bug real: todo código que gerar ou ler
`business_hours.days` (seed, formulário de configuração futuro,
`computeFollowupSchedule`) usa `Date.getDay()`, nunca ISO.

**Custo aceito:** uma dependência a mais no `package.json`, pequena e sem
peer deps conflitantes (`npm audit` limpo, `date-fns` continua a única
versão instalada).

---

## D-025 — Escopo do cancelamento em `moveStageCore`: só o estágio de destino, exceto quando é `is_won`/`is_lost`

**Data:** 2026-08-25 · **Status:** decidido, tarefa 4.3 · **Aplica a:** `lib/actions/leads-core.ts` → `moveStageCore`/`regenerateStageFollowups`

O texto da tarefa 4.3 é literal só até certo ponto: "se já existirem
pendentes automáticos para aquele estágio, cancelar antes de regerar
(idempotência — mover A→B→A não duplica)" não diz o que fazer com pendentes
de um estágio **diferente** do destino. Três leituras possíveis: (a) cancelar
só os do estágio de destino, (b) cancelar todos os pendentes automáticos do
lead em qualquer `moveStage`, (c) nunca cancelar fora do destino.

**Decisão, resolvida sem devolver pro Opus porque `DATABASE.md` já continha a
resposta:** a seção "Semântica de cancelamento" (mesma tarefa, mesmo arquivo)
já lista os três gatilhos de cancelamento em massa — `responded_at`, estágio
`is_won`/`is_lost`, ou "cliente respondeu" manual. Mover para um estágio
aberto que não é o de destino original **não está na lista**. Logo:

1. Fora de `is_won`/`is_lost`: `regenerateStageFollowups` cancela só os
   pendentes automáticos cujo `rule_id` pertence às regras do estágio de
   **destino** (a leitura (a) — implementa literalmente "para aquele
   estágio"). Pendentes gerados por um estágio anterior que o lead já
   deixou continuam pendentes até um gatilho de cancelamento real acontecer.
2. Estágio `is_won`/`is_lost`: cancela **todos** os pendentes automáticos do
   lead, não só os do destino — é o gatilho documentado, e um lead fechado
   não pode ter follow-up pendente de nenhum estágio anterior.

**Efeito colateral que virou funcionalidade, não bug:** para que o gatilho
`is_won`/`is_lost` funcionasse a partir do estágio (e não só de uma ação
manual futura), `moveStageCore` passou a gravar `leads.status`/`closed_at`
a partir de `pipeline_stages.is_won`/`is_lost` do destino — documentado em
`DATABASE.md` → `sales.leads`. Sem isso as duas views desta mesma tarefa
(`v_today_actions`/`v_leads_without_action`, que filtram `status = 'open'`)
nunca parariam de mostrar um lead fechado. Não estava no texto literal da
4.3, mas já estava previsto: o comentário de `lib/validation/leads.ts`
(tarefa 3.4) já dizia que `status`/`closed_at` "nascem da transição de
estágio", e `moveStage` é o único caminho de mudança de estágio desde a 3.4.

**Passo já executado não duplica:** todo `rule_id` do estágio de destino com
uma `activity` `status = 'done'` para o lead entra como `alreadyExecuted:
true` em `computeFollowupSchedule` (4.2) antes de regerar — sem isso,
reentrar num estágio depois de já ter concluído o passo 1 geraria um passo 1
novo.

**Descartado:** leitura (b) (cancelar tudo em qualquer `moveStage`) — cancelaria
follow-up de um estágio que o lead pode voltar a ocupar (ex.: `negociação` →
`proposta_enviada` → `negociação` → `proposta_enviada` de novo, uma
renegociação real), sem gatilho documentado que justifique o cancelamento no
meio do caminho. Leitura (c) (nunca cancelar fora do destino) — não cumpre a
idempotência explícita pedida no texto da tarefa (A→B→A duplicaria).

**Achado registrado, não corrigido nesta tarefa:** `belongsToOrg()` (D-020,
`lib/actions/leads-core.ts`) descarta o `error` da consulta e só olha
`data !== null` — um erro transitório de rede vira `false` (mesmo formato de
"não encontrado, não é desta org"), igual ao formato do Achado A da 3.7, mas
na direção seguramente diferente: lá o erro virava "sem duplicata" e deixava
gravar dado errado; aqui o erro vira "não encontrado" e **rejeita** a
escrita — falha segura, não abertura de dado cross-tenant. Descoberto ao
escrever o teste de "erro de banco não vira sucesso" desta tarefa (o teste
foi redirecionado para não depender de `belongsToOrg`, ver
`tests/actions/activities.test.ts`). Não corrigido aqui porque `belongsToOrg`
é código da 3.4/3.6, já auditado e aprovado no checkpoint da Fase 3, e mudar
sua assinatura tocaria `leads-core.ts`, `lead-intake-core.ts` e
`activities-core.ts` de uma vez — fora do escopo estrito da 4.3. Registrado
como **Q-005** para o Opus decidir se vale a pena.

**Custo aceito:** `moveStageCore` não é transacional — se `regenerateStageFollowups`
falhar depois do `update` de estágio (ex.: erro ao carregar `followup_rules`),
o lead já mudou de estágio/status mas os follow-ups não foram gerados/cancelados
corretamente. O erro é reportado (não vira sucesso — provado por teste com
client stub), mas a correção fica manual (reenviar `moveStage` resolve, porque
o passo de cancelamento/geração é idempotente). Postgres/PostgREST não expõe
transação multi-statement para o client JS sem uma function `security definer`
dedicada — criar uma agora seria antecipar infraestrutura que nenhuma outra
action deste projeto usa ainda.

---

## D-026 — "Agendar a próxima ação" só pergunta quando não sobra nenhuma pendência; sugestão de data usa `computeFollowupSchedule` com `now()`, nunca a data original de entrada no estágio

**Data:** 2026-08-26 · **Status:** decidido, tarefa 4.5 · **Aplica a:** `lib/actions/activities-core.ts` → `completeActivityCore`/`suggestNextFollowupDueAt`, `components/today/FollowupPrompt.tsx`

O texto da tarefa é literal até certo ponto: "`Concluir`... pergunta se
quer agendar a próxima (sugerindo a data do próximo passo da regra)". Não
diz **quando** perguntar nem **como** calcular a data sugerida — e as duas
respostas óbvias colidem com o que já existe.

**Quando perguntar — só quando `next_action_at` fica `null` depois do
recálculo do cache.** `moveStageCore` (4.3) já gera de uma vez todos os
passos ativos e ainda não executados de uma sequência ao entrar no estágio
— então, no caminho normal, quando o usuário conclui o passo 1, o passo 2
**já existe** como activity própria, pendente, com data própria. Perguntar
"quer agendar o passo 2?" nesse momento seria perguntar por algo que já
está agendado — o `nextActionAt` que `recalculateLeadCache` (D-006, agora
devolvendo o valor calculado em vez de só `error`) já contém a resposta.
A pergunta só faz sentido no estado exato que justifica o bloco "Sem
próxima ação" existir (4.4): nenhuma pendência sobrou pra este lead.

**Como calcular a data sugerida — `computeFollowupSchedule` (4.2) com
`enteredStageAt: new Date()`, nunca o instante em que o lead entrou no
estágio de verdade.** `leads` não tem (e esta tarefa não criou) uma coluna
`stage_entered_at` — recalcular "delay a partir da entrada real no
estágio" dias depois exigiria uma migration nova só pra isso, fora do
escopo de uma tarefa que é sobre UI de conclusão, não sobre schema. Usar
"agora" como referência é também semanticamente defensável por si: o
usuário está confirmando o próximo passo no momento em que acabou de fazer
o anterior, então "delay_days a partir de agora" é uma leitura de cadência
tão válida quanto "a partir da entrada no estágio" — só que sem inventar
dado que o schema não guarda.

**"Próximo passo" pula regra desativada e devolve o próximo passo ativo
(`step_number` maior, `is_active = true`), não o `step_number + 1`
literal.** Testado nos dois sentidos: pula um passo desativado e sugere o
seguinte; não sugere nada quando todos os passos seguintes estão
desativados. Sem isso, desativar um passo no meio da sequência (recurso já
existente em `followup_rules.is_active`, usado por `moveStageCore` desde a
4.3) faria a sugestão sumir de vez em vez de simplesmente pular pro próximo
que ainda vale.

**A resposta "sim" cria uma activity manual de verdade (`createActivity`,
4.3), nunca escreve `rule_id`.** Reaproveita a action existente — não é um
caminho paralelo de criação — e o resultado é deliberadamente `is_auto =
false`: é uma confirmação humana pontual, não a regra regenerando sozinha
(D-020/mass assignment já garante isso: `createActivityCore` nunca aceita
`rule_id`/`is_auto` do chamador).

**Descartado:** perguntar sempre que qualquer activity é concluída, mesmo
com outra pendência sobrando — geraria pergunta óbvia e ruído; recalcular
a data a partir de uma coluna nova de "entrada no estágio" — exigiria
migration fora do escopo desta tarefa só pra uma sugestão de UI que já é
opcional (o campo de data continua editável); sugerir sempre o
`step_number + 1` sem checar `is_active` — quebraria o caso real de regra
desativada no meio.

**Validado no browser real, não só por teste:** sequência completa
(mover lead pra `proposta_enviada` → 3 passos gerados de verdade →
concluir passo 1 e 2 sem pergunta nenhuma, porque sempre sobrava pendência
→ concluir o passo 3, o último, e a pergunta aparecer sem sugestão de data
(não há passo 4) → preencher data manual e confirmar → activity nova
criada com o tipo herdado da concluída, `is_auto = false`, data exata
digitada; em outro lead, mesmo fluxo terminando em "Agora não" → lead volta
pra "Sem próxima ação" sem criar nada.

**Custo aceito:** a sugestão de data é uma aproximação ("a partir de
agora", não "a partir da entrada real no estágio") — aceitável porque o
campo continua editável antes de confirmar, e o alternativa exigiria
schema novo pra um ganho de precisão pequeno.

---

## D-027 — `responded_at` significa "respondeu à cadência atual", não "respondeu alguma vez na vida"

**Data:** 2026-08-26 · **Status:** implementado na tarefa 4.6 · **Corrige:** Achado A do checkpoint · **Aplica a:** `lib/actions/leads-core.ts` → `moveStageCore`/`regenerateStageFollowups`/`markRespondedCore`

`markRespondedCore` (4.3) grava `responded_at` com `.is('responded_at', null)` e faz
o cancelamento em massa **dentro** dessa guarda de idempotência. Nenhum caminho
do produto volta `responded_at` para `null`. A consequência não é hipótese —
**provada por execução** neste checkpoint, com os dois usuários reais de teste:

| passo | esperado | obtido |
|---|---|---|
| entra em `proposta_enviada` | 3 automáticos pendentes | 3 ✓ |
| `markResponded` (1ª vez) | 0 pendentes, `responded_at` gravado | 0 ✓ |
| sai e volta para `proposta_enviada` (proposta nova) | — | **3 automáticos regerados, com `responded_at` preenchido** |
| `markResponded` (2ª vez) | 0 pendentes | **`error: null` e os 3 continuam pendentes** |

O segundo clique em "Cliente respondeu" **reporta sucesso e não cancela nada** —
violação direta da regra 3 de `PRODUCT_SPEC.md` ("cliente respondeu = todo
follow-up automático futuro daquele lead é cancelado... nada é mais destruidor de
confiança do que o sistema cobrar um cliente que já respondeu"). Na tela do lead é
pior: `MarkRespondedButton` fica desabilitado para sempre, então nem existe o
clique. O cenário é o normal do ICP, não um caso de borda: cliente responde à
primeira proposta, a negociação anda, uma proposta revisada é enviada
(`moveStage` de volta), o cliente responde de novo.

**Decisão, em duas partes:**

1. **`responded_at` volta a `null` quando uma cadência nova começa.**
   `regenerateStageFollowups` zera `responded_at` no mesmo passo em que gera os
   follow-ups do estágio de destino — e **só** aí (o early return de "estágio sem
   regras" acontece antes, então mover para `negociação` não mexe em nada). Uma
   proposta nova é uma pergunta nova: o cliente não respondeu *a esta*.
2. **O cancelamento em massa sai de dentro da guarda de idempotência.**
   `markRespondedCore` passa a cancelar os automáticos pendentes sempre, mesmo
   quando `responded_at` já estava preenchido. A idempotência que a 4.3 garantiu
   continua intacta no que importa — o timestamp não é reescrito e a activity de
   histórico "Cliente respondeu" não duplica; só o cancelamento sai da guarda, e
   ele já é idempotente por construção (`status = 'pending'` no filtro).

Com (1), o botão da tela do lead volta a habilitar sozinho — não é preciso mexer
no componente. (2) é defesa em profundidade para o botão da linha de ação, que
nunca fica desabilitado, e para qualquer linha que já tenha nascido no estado
inconsistente.

**Por que isso também fecha a lógica paralela:** `shouldCancelFollowups`
(`lib/domain/followup.ts`, 4.2) tem 5 testes unitários e **zero chamadores em
produção** — a decisão de cancelar está escrita à mão em `moveStageCore`
(`stage.is_won || stage.is_lost`) e em `markRespondedCore`. É exatamente a
divergência que o Achado A expõe: a função pura diz "`respondedAt !== null` →
cancelar", e o caminho real regenera. Depois de (1), o estado gravado volta a
bater com o que a função pura afirma.

**Descartado:** deixar `responded_at` imutável e só tirar o cancelamento da
guarda — resolveria o clique, mas manteria um lead marcado como "respondeu" com
cobrança automática pendente, um estado que a própria função de domínio declara
impossível. Descartado também zerar `responded_at` em todo `moveStage` — mover
para `negociação` ou `qualificado` não envia proposta nenhuma, não abre cadência
nenhuma, e apagaria o registro sem motivo.

**Custo aceito:** `responded_at` deixa de servir como "a primeira vez que este
cliente respondeu". Esse histórico não se perde: a activity "Cliente respondeu"
gravada por `markRespondedCore` fica na timeline para sempre (D-005), que é o
lugar certo dele — `responded_at` é estado operacional da cadença corrente, não
arquivo histórico.

**Implementado e validado na tarefa 4.6:** a sequência exata da tabela acima
virou teste permanente (`tests/actions/leads-followup.test.ts`), com uma tarefa
manual plantada no meio pra provar D-005 nas duas rodadas de cancelamento — e
passa: 0 pendentes depois do 2º "Cliente respondeu", `responded_at` nulo depois
da reentrada, 2 activities de histórico (uma por resposta real), tarefa manual
intacta. Reproduzido também no browser real (dev server + Supabase real) com o
mesmo par de usuários de teste antes da correção existir, confirmando o defeito,
e depois dela, confirmando o fechamento. `shouldCancelFollowups` deixou de ser
código morto: `moveStageCore` passou a chamá-la pra decidir `cancelAllOnClose`
em vez do `stage.is_won || stage.is_lost` escrito à mão.

---

## D-028 — Port de `lib/ai/` (5.1): `gateway.ts` recebe client+orgId como todo `*-core`; `schemas.ts` não portado

`ARCHITECTURE.md` → "Port do CRM-RR" listava `lib/ai/gateway.ts` como "igual",
ajustando só `ai_runs` ganhar `org_id` e os ids de contexto virarem
`leadId`/`contactId`. No CRM-RR original, `gateway.ts` resolve sua própria
sessão (`createClient()` de `lib/supabase/server.ts`, que usa `cookies()`) e
não recebe `orgId` como parâmetro — só grava o resultado.

**Decisão:** `runAiPrompt(supabase, orgId, { slug, vars, schema, leadId,
contactId })` — client e `orgId` explícitos, no mesmo formato de todo
`*-core` já existente (`leads-core.ts`, `activities-core.ts`,
`contacts-core.ts`, D-020). `import 'server-only'` do original também caiu.

**Por quê:** duas razões, não uma preferência solta.

1. **Consistência real, não só estética.** Todo outro módulo chamado por uma
   action `'use server'` neste projeto recebe sessão resolvida como
   parâmetro — nunca resolve a própria. `gateway.ts` vai ser chamado pela
   action de "Gerar mensagem com IA" (5.4), que já vai ter `orgId` resolvido
   via `requireOrgId()`. Fazer `gateway.ts` chamar `createClient()`/cookies()
   de novo por conta própria duplicaria a resolução de sessão sem motivo.
2. **`import 'server-only'` quebra teste direto.** Já documentado em
   `tests/helpers/rls-fixtures.ts` (comentário sobre `lib/supabase/admin.ts`):
   o pacote lança fora do bundler do Next, mesmo em Node puro — inclusive em
   vitest. Nenhum `*-core` do projeto importa `server-only` por este motivo
   exato; todos são testados diretamente contra o Supabase real
   (`tests/actions/*.test.ts`). `gateway.ts` seguiu o mesmo padrão —
   `tests/actions/ai-gateway.test.ts` teste 5 cenários (sucesso grava
   `pending_review`, isolamento entre orgs, slug sem prompt não grava nada,
   gateway caindo grava `status='error'`, `leadId`/`contactId` persistidos)
   contra o Supabase real, com `generateText` mockado.

**Cross-tenant de `leadId`/`contactId`:** não validado dentro de
`runAiPrompt`. Mesma divisão de responsabilidade que `activities-core.ts` já
tem em outro sentido — aqui quem valida é o chamador (a action de 5.4 vai
rodar `checkBelongsToOrg` antes de passar o id, igual a todo outro call site
D-020). `gateway.ts` só grava o que recebe; a responsabilidade de garantir
que o id pertence à org não muda de lugar, só de camada.

**`lib/ai/schemas.ts` não foi portado.** A tabela do `ARCHITECTURE.md` →
"Port do CRM-RR" já **não lista** `schemas.ts` — só `render-template.ts`,
`gateway.ts` e `error-categories.ts`. O texto da tarefa 5.1 em
`IMPLEMENTATION_PLAN.md` cita `schemas.ts` também, mas o conteúdo do arquivo
original (`qualifyDealOutputSchema`, `summarizeDealOutputSchema`,
`draftFollowupEmailOutputSchema`) é de qualificação de deal B2B outbound —
exatamente a categoria que a seção "Camada de IA" do `ARCHITECTURE.md`
descarta pro MVP ("O que a IA pode fazer no MVP: escrever mensagem de
follow-up. Só isso."). Portar traria schema de produto errado pro
repositório. Seguido `ARCHITECTURE.md` como fonte de verdade (é o documento
que `CLAUDE.md` manda ler especificamente para "o que portar do CRM-RR").
O schema de output de `followup_proposta` (`{ message, tone, reasoning }`)
nasce na tarefa 5.2, que é quem de fato precisa dele.

---

## D-029 — Seed do prompt `followup_proposta` (5.2): migration própria `0010`; `{{empresa}}` no template de usuário, `gateway.ts` intocado

**Data:** 2026-08-26 · **Status:** decidido, tarefa 5.2 · **Aplica a:** `sales.seed_org_defaults`, `lib/ai/gateway.ts`, numeração de migrations

Dois pontos da 5.2 que não estavam fechados nos docs.

**1. Migration própria, não edição da 0009.** A 0009 (5.1) criou `ai_prompts`
vazia e já está aplicada no remoto. A regra dura do `CLAUDE.md` ("toda migration
é um arquivo versionado, commitado antes de aplicar" + "nunca aplique SQL direto
sem o arquivo") combinada com "não altere migrations anteriores" força o seed do
prompt para um arquivo novo: `0010_seed_followup_proposta_prompt.sql`, que faz
`create or replace function sales.seed_org_defaults` reproduzindo o corpo de
0004+0007 e só acrescentando o `insert into sales.ai_prompts`. Consequência: o
`0010_audit.sql` que o `IMPLEMENTATION_PLAN.md` reservava para a 5.4 vira
`0011_audit.sql` — ajustado na tabela de ordem do `DATABASE.md` e na linha da 5.4
do plano. A numeração segue ordem de aplicação (já era assim desde a 4.3), então
renumerar a reserva não quebra nada.

**2. `{{empresa}}` fica no `user_prompt_template`; `gateway.ts` não muda.** O
contrato da 5.2 escreve "em nome de {{empresa}}" no bloco **System**. Mas
`runAiPrompt` (5.1, D-028) só passa `system_prompt` cru para `generateText` —
`renderTemplate` roda apenas no `user_prompt_template`. Honrar o placeholder no
system exigiria `renderTemplate(promptRow.system_prompt, vars)` também, mudança de
comportamento na função portada do CRM-RR, contra "preserve wrapper/core".

**Decisão:** as 9 variáveis do contrato (`{{empresa}}` inclusive) vivem no
`user_prompt_template`; o `system_prompt` descreve a empresa como "a empresa
identificada na mensagem abaixo". Nenhum placeholder pendente no `system_prompt`
(teste cobre isso). É a leitura que entrega o contrato sem tocar a 5.1.

**Aberto para o Opus:** se o comportamento desejado for `gateway.ts` renderizar os
dois templates com o mesmo `vars`, é 1 linha, retrocompatível com todos os testes
da 5.1 (nenhum `system_prompt` de teste tem placeholder), e o `system_prompt` do
seed poderia então usar `{{empresa}}` direto. Fica para um checkpoint — não foi
feito na 5.2 para não ampliar escopo.

**Custo aceito:** o `system_prompt` fala da empresa de forma indireta em vez de
nomeá-la no cabeçalho. Irrelevante para a qualidade da geração (o nome aparece na
primeira linha do user prompt), reversível a qualquer momento.

---

## D-030 — Contexto de IA (5.3): `buildFollowupContext(supabase, orgId, leadId)`, não `(leadId)`; camada pura separada; sentinel explícito para campo opcional

**Data:** 2026-08-27 · **Status:** decidido, tarefa 5.3 · **Aplica a:** `lib/queries/ai-context.ts`, `lib/domain/ai-context.ts`, qualquer construção futura de contexto para prompt

O texto da 5.3 no `IMPLEMENTATION_PLAN.md` escreve `buildFollowupContext(leadId)`.
Três pontos que não estavam fechados nos docs.

**1. Assinatura recebe `client` + `orgId` explícitos.** Mesma decisão de **D-028**
(`gateway.ts`) e **D-020** (`*-core`): a função é chamada pela action `'use server'`
da 5.4, que já resolve sessão/org via `requireOrgId()`. Fazer `buildFollowupContext`
chamar `createClient()`/`cookies()` por conta própria (padrão dos outros
`lib/queries/*.ts`, que são `server-only`) duplicaria a resolução de sessão **e**
tornaria impossível o requisito da própria 5.3 de testes cross-tenant — a suíte
`test:rls` prova isolamento com dois clientes anônimos autenticados
(`tests/actions/*.test.ts`), o que exige o client injetado. `orgId` continua sempre
server-side; nada vem do cliente. Por isso o arquivo **não** tem `import
'server-only'` (mesma exceção que `gateway.ts` abriu em D-028). Fica em
`lib/queries/` como o plano pede — é leitura pura, sem escrita.

**2. Lógica de formatação/decisão isolada em `lib/domain/ai-context.ts`.** Regra
dura do `CLAUDE.md` ("toda função em `lib/domain/` tem teste vitest; regra de
negócio sem teste não fecha tarefa"). `buildFollowupVars` + `resolveFollowupStep`
+ `FOLLOWUP_VAR_KEYS` são puros (zero `supabase`/`next`/`ai`), testados no
`npm run test` padrão. `lib/queries/ai-context.ts` só busca as linhas (cada
`select` filtrado por `org_id`, colunas listadas) e delega. Mesmo split de
`lib/queries/today.ts` ↔ `lib/domain/today.ts`.

**3. Campo opcional ausente = sentinel explícito `'não informado'`, nunca string
vazia nem valor inventado.** O `user_prompt_template` do seed 0010 tem linhas
fixas (`Valor: {{valor}}`, `Interesse: {{interesse}}`, ...). `renderTemplate`
troca `{{x}}` por `vars[x] ?? ''` — sem o sentinel, `value_cents = 0` ou
`interest = null` renderizaria `Valor:` / `Interesse:` pendurado, o que a 5.3
proíbe ("não envie 'Valor:' vazio"). `'não informado'` é a leitura da regra 1 da
`PRODUCT_SPEC.md` ("se não tem o dado, declara que não tem — não estima"); o
`system_prompt` do seed já instrui a IA a não mencionar o que está marcado assim.
`valor` só é formatado (`formatBRL`) quando `value_cents > 0`.
`dias_desde_ultimo_contato` sem `last_contact_at` → `'não informado'` (não fabrica
`0`). `passo_followup` sem nenhuma atividade automática pendente → `1` (menor
pressão), decisão explícita, não fallback silencioso.

**Descartado:** (a) `buildFollowupContext(leadId)` resolvendo a própria sessão —
quebra os testes cross-tenant e diverge de D-020/D-028; (b) mandar `R$ 0,00` /
linha vazia e deixar a IA lidar — é exatamente o que a 5.3 diz que faz a IA
"escrever bobagem sobre preço"; (c) omitir a chave do `vars` — `renderTemplate`
cairia em `''` e o resultado é o mesmo problema da linha pendurada.

**Aberto para o Opus:** nada bloqueante. Se num checkpoint o `system_prompt`
passar a ter placeholders (D-029), `buildFollowupContext` já entrega o `vars`
completo — só o `gateway.ts` mudaria.

---

## D-031 — Primeira action real de IA (5.4): `ai-followup-core` + wrapper, ids do cliente revalidados antes de gravar; `audit.ts` portado com `ai_used` apenas

**Data:** 2026-08-27 · **Status:** decidido, tarefa 5.4 · **Aplica a:** `lib/actions/ai-followup*.ts`, `lib/actions/audit.ts`, `sales.audit_logs`, `components/ai/FollowupGenerator.tsx`

A 5.4 é a primeira tarefa que liga a camada de IA (5.1–5.3) a uma action de
verdade. Cinco pontos que o texto do `IMPLEMENTATION_PLAN.md` não fechava.

**1. Mesmo split wrapper + core de todo o resto.** `lib/actions/ai-followup-core.ts`
(`generateFollowupMessageCore` / `applyFollowupMessageCore` / `discardAiRunCore`,
recebem `supabase` + `orgId` + `userId`, sem `'use server'`, sem `cookies()`) e
`lib/actions/ai-followup.ts` (`'use server'`, resolve `requireOrgId()` +
`createClient()` + `auth.getUser()`, delega, `revalidatePath`). É D-020/D-028/D-030
de novo — e é o que torna os testes cross-tenant de `test:rls` possíveis. A 5.1
(`gateway.ts`) e a 5.3 (`buildFollowupContext`) já foram desenhadas prevendo este
call site; aqui ele só apareceu.

**2. `orgId` sempre server-side; todo id vindo do browser é revalidado contra o
tenant antes de qualquer escrita.** `generateFollowupMessageCore` delega a
revalidação do `leadId` ao próprio `buildFollowupContext` (5.3), que já lança
`Lead não encontrado.` para lead de outro tenant — vira `{ ok: false }`, nunca
contexto parcial nem `{ ok: true }`. `applyFollowupMessageCore` recebe três ids do
cliente (`runId`, `activityId`, `leadId`) e faz uma consulta própria filtrada por
`org_id` para cada um antes de gravar `activities.body`/`ai_run_id`: o `ai_run` tem
que ser da org, a `activity` tem que ser da org **e** pertencer ao `leadId`
informado, e o `leadId` passa por `checkBelongsToOrg`. O texto editável da textarea
é revalidado por `messageSchema` (`trim().min(1).max(4000)`) — o servidor não confia
no que veio do browser. Provado por teste (`tests/actions/ai-followup.test.ts`):
B não gera para lead de A, B não usa run de A, activity de B não é alcançável com
run/lead de A, e a activity alvo fica intacta em todos esses casos.

**3. Erro de contexto / gateway / schema nunca vira sucesso, e `ai_runs` registra o
estado certo.** `generateFollowupMessageCore` devolve `{ ok: false, error }` quando
`buildFollowupContext` lança (contexto/banco), quando `runAiPrompt` relança (gateway
— e o gateway já gravou `ai_runs` com `status='error'` antes de relançar, 5.1), e
quando `followupPropostaOutputSchema.safeParse(output)` falha (formato inesperado).
Sucesso grava `pending_review` (via gateway). "Usar esta" → `reviewed` +
`reviewed_by`/`reviewed_at`. "Descartar" → `discarded`. Testado nos quatro estados.

**4. `lib/actions/audit.ts` portado com assinatura adaptada; só `ai_used` tem call
site na 5.4.** O `audit.ts` do CRM-RR é o helper `logAudit` (single-tenant, com
`import 'server-only'`, sem `org_id`). Portado como
`logAudit(supabase, orgId, userId, entity, entityId, action, diff)` — `client`/`orgId`
explícitos (D-028) e sem `server-only` (o pacote lança em vitest, impediria o teste
direto do log; mesma exceção de `gateway.ts`). Best-effort como no original: falha
ao gravar o log não derruba a operação de negócio já concluída. A 5.4 chama
`logAudit(..., 'activity', activityId, 'ai_used', { ai_run_id })` dentro de
`applyFollowupMessageCore`. Os outros verbos listados no plano
(`create`/`update`/`stage_change`/`cancel_followups`) são o vocabulário de
`audit_logs.action`, mas instrumentar as actions das Fases 3–4 sairia do escopo
estrito de uma tarefa de IA e mexeria em `leads-core.ts`/`activities-core.ts`
inteiros ("não refatore fora do escopo", "preserve wrapper/core"). Registrado como
**Q-006**. O "Pronto quando" da 5.4 só exige o `ai_run` registrado com tokens e
latência — que está.

**`audit_logs` RLS `tenant_isolation for all`.** Dado operacional (D-017 não se
aplica: registrar que algo aconteceu não muda quem manda nem se o tenant existe) —
mesma classificação de `activities`/`ai_runs`. Endurecer para append-only real
(policy só de `insert`/`select`, sem `update`/`delete`) seria desvio do padrão de 1
policy por tabela que o plano não pede; anotado para o checkpoint da Fase 6, não
feito aqui.

**5. `FollowupGenerator` é componente cliente autossuficiente renderizado pela
`ActionRow` e pela tela do lead.** Fala só com `lib/actions/ai-followup.ts` (D-020),
tem só estado de UI. Renderizá-lo dentro de `ActionRow` (em vez de threading mais um
par de callbacks por `TodayActionsList`, já com 300 linhas e navegação por teclado)
mantém a linha sem regra de negócio própria — exceção comentada no header do
arquivo. Na tela do lead, aparece só quando há um follow-up pendente (o alvo do
`body`/`ai_run_id`). "Gerar outra versão" cria um `ai_run` novo e deixa os
anteriores em `pending_review` (só o usado vira `reviewed`, só o descartado vira
`discarded`) — aceitável no MVP; revisitar se o volume de runs órfãos incomodar.

---

## D-032 — Seed de demonstração (6.1): org por insert direto + `seed_org_defaults`; `is_demo` só nas 3 tabelas transacionais; purge com `--yes`; owner opcional

**Data:** 2026-08-27 · **Status:** decidido, tarefa 6.1 · **Aplica a:** `supabase/seed/*.ts`, `lib/types/database.types.ts` (bloco `Functions`), `package.json` (scripts `seed:demo`/`seed:purge`, já existentes desde a 1.1)

A 6.1 pede `supabase/seed/run.ts` + `purge.ts` "padrão do CRM-RR". O CRM-RR **não
tem** esses arquivos (`supabase/seed/` vazio — é a falha que o `CLAUDE.md` deste
projeto cita). "Padrão do CRM-RR" aqui é só o formato: dois scripts `tsx`, service
role, flag `is_demo`, purge que só toca `is_demo`. Cinco pontos que o texto não
fechava.

**1. Criação da org demo: insert direto + `seed_org_defaults`, não `create_organization`.**
A RPC `create_organization` insere `auth.uid()` como `owner` em `org_members` — sob
service role `auth.uid()` é `null` e o insert viola `not null`. O seed faz insert
direto em `sales.organizations` (slug fixo `devrr-demo`; service role tem BYPASSRLS,
não precisa de policy de insert) e chama `rpc('seed_org_defaults', { p_org_id })`
para catálogos/regras/prompt. `service_role` mantém `execute` em `seed_org_defaults`
(default privileges da 0001; `authenticated` teve o `execute` revogado na 0004) —
confirmado por `has_function_privilege` antes de implementar. A função foi
acrescentada ao bloco `Functions` de `database.types.ts` (existe desde a 0004, nunca
teve call site tipado).

**2. `is_demo` só existe em `contacts`/`leads`/`activities`.** `organizations` e os
catálogos (`lead_sources`/`pipeline_stages`/`followup_rules`/`ai_prompts`) não têm a
coluna (`DATABASE.md` → "nunca nas de configuração"). Consequência: `purge.ts`
remove o dado transacional demo mas **não** a org demo nem os catálogos. É o
comportamento que o texto da 6.1 descreve ("remove só `is_demo`"). O shell
`devrr-demo` fica no projeto de propósito — `run.ts` é idempotente sobre ele.

**3. `run.ts` é idempotente.** Cada execução apaga o `is_demo` da org e reinsere.
Ids gerados no cliente (`node:crypto` `randomUUID`) e passados explícitos no insert —
não depende da ordem de retorno do PostgREST para ligar lead↔contato↔atividade.
`leads.next_action_at` (cache mantido pela app, D-006) é recalculado com
`resolveNextAction` de `lib/domain/followup` — o mesmo helper das actions, não uma
segunda regra.

**4. Org demo sem `org_member` por padrão.** Não há convite/multi-usuário no MVP
(Q-003), então vincular um usuário exigiria hardcodar um e-mail. `run.ts` só vincula
se `SEED_DEMO_OWNER_EMAIL` estiver setado (busca o usuário via Admin API, `upsert`
`owner` com `ignoreDuplicates`). Sem isso, a org demo **não aparece no app** para
ninguém (nada em `current_org_ids()`) — o seed serve para inspeção via SQL /
exploração local, não para abrir o app já povoado. Aceitável no MVP; revisitar na
6.5 se atrapalhar o uso real.

**5. `purge.ts` exige confirmação explícita.** Sessão não-interativa não tem
`readline` confiável: a confirmação é o argumento `--yes` (ou
`SEED_PURGE_CONFIRM=yes`). Sem ele, o script imprime a contagem que **seria**
apagada e sai sem tocar em nada. O filtro é sempre `is_demo = true` nas 3 tabelas —
nunca há caminho que alcance dado real.

**Escopo:** nenhuma migration, nenhum DDL — `advisors`/`replay` não se aplicam. Os
scripts usam `service_role`, mas são código de seed server-only (exceção já prevista
em `ARCHITECTURE.md` → Segurança e no doc de `admin.ts`), nunca acionados por
request de usuário.

---

## D-033 — Cobertura (6.2): `@vitest/coverage-v8` com gate só em `lib/domain/` (100%), opt-in via `test:coverage`; "80% no resto" fica com a suíte `test:rls`

**Data:** 2026-08-27 · **Status:** decidido, tarefa 6.2 · **Aplica a:** `package.json` (script `test:coverage`), `vitest.config.ts` (bloco `coverage`), `devDependencies`

A 6.2 pede "Meta de cobertura: **100% em `lib/domain/`**, 80% no resto". Um número
exige ferramenta — o projeto não tinha nenhuma (nem o CRM-RR). Três escolhas.

**1. `@vitest/coverage-v8` como devDep, não como parte de `npm run test`.** É a devDep
oficial do Vitest 3.x (pinada `^3`, mesma major do `vitest`). O gate vive num script
próprio, `npm run test:coverage` (`vitest run --coverage`) — o `npm run test` que
todas as outras tarefas rodam a cada commit **não muda de comportamento** (a config de
`coverage` só entra em ação com a flag). Motivo: um threshold de 100% no comando de
teste padrão vira freio brusco em qualquer tarefa futura que ainda não escreveu o
teste; a disciplina "regra de negócio sem teste não fecha tarefa" do `CLAUDE.md` já
cobre isso sem gate automático.

**2. `coverage.include` restrito a `lib/domain/**/*.ts`.** É o único trecho de `lib/`
100% exercitável pela suíte pura (sem rede). O threshold de 100%
(statements/branches/functions/lines) está em `vitest.config.ts` →
`coverage.thresholds['lib/domain/**/*.ts']`. Medido: 168/168 statements, 82/82
branches, 19/19 functions — **100% nos quatro**.

**3. "80% no resto" não vira um número único aqui.** `lib/actions/` e `lib/queries/`
são cobertos pela suíte `test:rls` (167 testes contra o Supabase real), que roda em
config separada (`vitest.rls.config.ts`, `fileParallelism: false`, precisa de rede) —
separada desde a 2.4 justamente por isso. Fundir a cobertura das duas suítes num
relatório só exigiria rodar a suíte de rede com `--coverage` a cada medição, o que
sai do escopo de "testes de fluxo" da 6.2. A checagem de fluxo, isolamento e erro de
banco dessas camadas já é feita por asserção explícita naquela suíte, não por
percentual.

**Lacunas de `lib/domain/` fechadas na 6.2 para bater 100%:** `followup.ts` —
`pushIntoBusinessWindow` (antes da abertura / depois do fechamento / `days: []`),
`computeFollowupSchedule` sem `now`, `resolveNextAction` ramo `else` do `reduce`;
`ai-context.ts` — carimbo caindo em `created_at`, `buildFollowupVars` sem `now`.
Nenhuma dessas era bug — código defensivo/parâmetro de teste sem exercício. 18 testes
novos em `tests/domain/` (99 → 117).

---

## Questões abertas

Sonnet: adicione aqui o que travar. Opus resolve no próximo checkpoint.

- ~~**Q-001**~~ — resolvida no checkpoint da Fase 3, ver **D-023** (permitir, sem alerta).
- **Q-002** — Quando um lead vai para `perdido`, o contato deve entrar em alguma
  cadência de reativação futura? Fora do MVP; reavaliar após a Fase 6.5.
- **Q-003** — Multi-usuário por organização: `org_members` já suporta, mas não há
  "dono do lead" (`assigned_to`). Adicionar quando existir a primeira PME com 2+
  vendedores. Não antes.
- ~~**Q-004**~~ — resolvida, ver **D-019**.
- **Q-006** — `audit_logs` (D-031) só tem call site para `ai_used` (5.4). Instrumentar
  `create`/`update`/`stage_change`/`cancel_followups` nas actions das Fases 3–4
  (`leads-core.ts`, `activities-core.ts`) é uma passada de manutenção que toca código
  de fases anteriores — vale a pena fazer antes da Fase 6.4 (que revalida RLS de
  `audit_logs`) ou junto dela? Também aberto: endurecer a RLS de `audit_logs` para
  append-only (sem `update`/`delete`).
- ~~**Q-005**~~ — **implementada na tarefa 4.6.** `belongsToOrg`
  (`lib/actions/leads-core.ts`) passou a devolver `{ exists: boolean; error:
  string | null }` em vez de `boolean`; novo helper `checkBelongsToOrg` (mesmo
  arquivo) concentra o padrão "erro de banco vira erro reportado, ausência vira
  a mensagem de 'não encontrado'" pros 9 call sites (`leads-core.ts` ×5,
  `lead-intake-core.ts` ×2, `activities-core.ts` ×2). Nenhum teste cross-tenant
  existente precisou de edição (regressão coberta); teste novo em
  `tests/actions/activities.test.ts` prova a distinção com `stubTableError` na
  tabela relacionada, confirmando que o erro não vira `'Lead não encontrado.'`.
