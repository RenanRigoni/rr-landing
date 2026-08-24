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

## Questões abertas

Sonnet: adicione aqui o que travar. Opus resolve no próximo checkpoint.

- **Q-001** — Um contato pode ter vários leads simultâneos abertos? Modelo permite.
  Falta decidir se a UI incentiva ou alerta contra. Decidir na Fase 3.5, com dado real.
- **Q-002** — Quando um lead vai para `perdido`, o contato deve entrar em alguma
  cadência de reativação futura? Fora do MVP; reavaliar após a Fase 6.5.
- **Q-003** — Multi-usuário por organização: `org_members` já suporta, mas não há
  "dono do lead" (`assigned_to`). Adicionar quando existir a primeira PME com 2+
  vendedores. Não antes.
- **Q-004** — `tsconfig.json` da **raiz** do repo inclui `**/*.ts` sem excluir os
  projetos irmãos, então `npx tsc --noEmit` na raiz compila `CRM-RR/` e
  `devrr-sales-ai/` contra o `node_modules` e o alias `@/*` do `rr-landing`: 281 erros
  hoje (263 do CRM-RR, 18 daqui). É pré-existente e não afeta os builds de cada
  projeto isoladamente, mas é dívida do repositório. Correção mínima: adicionar
  `"CRM-RR"` e `"devrr-sales-ai"` ao `exclude` do tsconfig da raiz. Fora do escopo
  deste projeto — decisão do dono do `rr-landing`.
