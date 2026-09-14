# Fase 8 — Pipeline visual, WhatsApp e previsão de receita

Spec de arquitetura (Opus, 2026-09-14) para implementação (Sonnet). Objetivo:
fechar as lacunas que um cliente percebe ao comparar a DevRR Sales AI com
Pipedrive/HubSpot — Kanban do funil, abrir conversa no WhatsApp com um clique e
previsão ponderada de receita.

**Ordem obrigatória:** 8.1 → 8.2 → 8.3 → 8.4 → 8.5 → 8.6. Um commit por tarefa
(`feat(sales): Fase 8.x — …`), `git push` ao fim de cada uma (CLAUDE.md da raiz).

## Regras que valem para a fase inteira

1. **Next 16 não é o que você conhece.** Antes de usar qualquer API do Next,
   ler o guia correspondente em `node_modules/next/dist/docs/` (AGENTS.md).
   Seguir os padrões que já existem no repo (`searchParams: Promise<…>`,
   Server Actions em `lib/actions/*.ts` com `'use server'`).
2. **D-020 — core + wrapper.** Regra de negócio e acesso a banco em
   `lib/actions/*-core.ts` (recebe `supabase` + `orgId`); o wrapper
   `'use server'` só resolve sessão (`requireOrgId()`), delega e revalida.
   Componente cliente nunca fala com o Supabase direto.
3. **Domínio puro com 100% de cobertura.** Todo cálculo novo mora em
   `lib/domain/` sem import de supabase/next/react, com teste em
   `tests/domain/`. `npm run test:coverage` precisa continuar verde (gate 100%).
4. **Sem migration nesta fase.** Tudo cabe no schema atual
   (`pipeline_stages.probability` e `leads.lost_reason` já existem). Se achar
   que precisa de DDL, pare e registre a dúvida — não improvise schema.
5. **Sem `service_role`** fora dos usos permitidos em `lib/supabase/admin.ts`.
6. **Visual:** `docs/DESIGN_SYSTEM.md` — ferramenta densa, todo número em
   `font-mono`, zero glow/animação de entrada, `rounded-lg` em card,
   `rounded-md` em linha. Cores de gráfico: tokens `chart-1..3` (já validados).
   Semântica: `success` ganho, `danger` perdido/atrasado, `warning` hoje.
7. **Gates por tarefa:** `npm run typecheck && npm run lint && npm run test`.
   Na 8.2 também `npm run test:rls` (toca action com banco). No fim (8.6),
   `test:coverage` e `build`.

---

## 8.1 Domínio: quadro, WhatsApp e previsão (puro)

### `lib/domain/pipeline-board.ts` (novo)

```ts
export interface BoardStage {
  id: string
  key: string
  label: string
  position: number
  probability: number // 0–100
  isWon: boolean
  isLost: boolean
}

export interface BoardLead {
  id: string
  stageId: string
  status: 'open' | 'won' | 'lost'
  title: string
  companyName: string        // contacts.company_name ?? contacts.full_name
  contactFirstName: string   // primeiro token de contacts.full_name
  contactPhone: string | null
  valueCents: number
  temperature: 'cold' | 'warm' | 'hot' | null
  nextActionAt: string | null
  lastContactAt: string | null
  closedAt: string | null
  sourceName: string | null
  digitalScore: number | null
}

export interface BoardColumn {
  stage: BoardStage
  leads: BoardLead[]      // ordenados: ver regra abaixo
  totalCents: number
  weightedCents: number   // soma de weightedCents() dos leads da coluna
  /** Só Ganho/Perdido: total de leads fechados fora da janela (não exibidos). */
  hiddenCount: number
}

export const CLOSED_WINDOW_DAYS = 30

export function weightedCents(valueCents: number, probability: number): number
// Math.round(valueCents * clamp(probability, 0, 100) / 100)

export function buildBoardColumns(
  leads: readonly BoardLead[],
  stages: readonly BoardStage[],
  now: Date,
  options: { closedWindowDays?: number; hiddenCountByStageId?: Readonly<Record<string, number>> } = {},
): BoardColumn[]
// - uma coluna por estágio, na ordem de `position` (inclui Ganho e Perdido)
// - lead em estágio desconhecido é ignorado (não lança)
// - colunas de estágio isWon/isLost mostram só leads com closedAt dentro da
//   janela (padrão CLOSED_WINDOW_DAYS); hiddenCount = leads recebidos fora da
//   janela + hiddenCountByStageId[stage.id] (a query não manda os antigos)
// - ordenação nas colunas abertas: nextActionAt asc (nulos por último), depois
//   valueCents desc; nas fechadas: closedAt desc

export function moveLeadOnBoard(
  columns: readonly BoardColumn[],
  leadId: string,
  toStageId: string,
  now: Date,
): BoardColumn[]
// Atualização otimista, imutável: tira o lead da coluna de origem e põe na de
// destino com stageId novo, status derivado do estágio (won/lost/open) e
// closedAt = now.toISOString() se fechou, null se reabriu. Recalcula
// totalCents/weightedCents das duas colunas e reaplica a ordenação.
// leadId inexistente ou destino igual à origem → devolve `columns` inalterado.

export function matchesBoardSearch(lead: BoardLead, query: string): boolean
// Busca sem acento e sem caixa em companyName, title e contactFirstName.
// query vazia (após trim) → true.
```

### `lib/domain/whatsapp.ts` (novo)

```ts
export function buildWhatsappUrl(phone: string | null, text?: string): string | null
// normalizePhoneBR(phone) → null se inválido/ausente.
// `https://wa.me/55DDDNNNNNNNN` (só dígitos, sem +) e, se `text` não vazio,
// `?text=${encodeURIComponent(text)}`.

export function buildGreeting(input: { contactFirstName: string | null; orgName: string }): string
// "Olá, {nome}! Tudo bem? Aqui é da {orgName}." — sem nome: "Olá! Tudo bem? Aqui é da {orgName}."
```

### `lib/domain/analytics.ts` (alterar)

- `AnalyticsStage` ganha `probability: number`.
- Novo:

```ts
export interface ForecastStage { key: string; label: string; probability: number; openCents: number; weightedCents: number; count: number }
export interface Forecast { openCents: number; weightedCents: number; byStage: ForecastStage[] }
export function computeForecast(leads: readonly AnalyticsLead[], stages: readonly AnalyticsStage[]): Forecast
// Só leads status 'open'. byStage na ordem de position, só estágios não
// won/lost, incluindo os com count 0. Usa weightedCents() de pipeline-board.ts.
```

- Atualizar `STAGES` de `tests/domain/analytics.test.ts` com `probability`
  (novo 5, contatado 15, qualificado 30, proposta_enviada 50, negociacao 75,
  ganho 100, perdido 0 — mesmos valores de `seed_org_defaults`).

### Testes
`tests/domain/pipeline-board.test.ts`, `tests/domain/whatsapp.test.ts` e casos
novos em `analytics.test.ts`. Cobrir: janela de fechados (dentro/fora/hiddenCount),
estágio desconhecido, ordenação com nulos, mover aberto→aberto, aberto→ganho,
perdido→aberto (closedAt volta a null), lead inexistente, mesmo estágio,
busca com acento (`"sao"` casa `"São"`), telefone inválido, texto vazio,
`encodeURIComponent` com acento/quebra de linha, probabilidade fora de 0–100.

**Pronto quando:** `npm run test:coverage` verde com os três arquivos a 100%.

---

## 8.2 Motivo de perda obrigatório ao mover para Perdido

Hoje `moveStageCore` aceita ir para o estágio `is_lost` sem motivo, e o
`lost_reason` nunca é limpo ao reabrir. O Kanban tornaria isso um clique — por
isso a regra entra antes dele.

### Validação — `lib/validation/leads.ts`
```ts
export const lostReasonSchema = z.string().trim()
  .min(3, 'Informe o motivo da perda.')
  .max(200, 'Motivo muito longo (máx. 200 caracteres).')
```

### Core — `lib/actions/leads-core.ts`
```ts
export async function moveStageCore(
  supabase: SalesClient, orgId: string, leadId: string, stageId: string,
  options: { lostReason?: string | null } = {},
): Promise<StageActionResult>
```
- Depois de carregar o estágio: se `stage.is_lost`, validar `options.lostReason`
  com `lostReasonSchema`; falhou → `{ error: <mensagem do zod> }` **antes** de
  qualquer `update` (nada muda no banco).
- No `update` de `leads`: `lost_reason: stage.is_lost ? reason : null`.
- Nenhuma outra mudança de comportamento (follow-ups, cache seguem iguais).

### Wrapper — `lib/actions/leads.ts`
`moveStage(leadId, stageId, lostReason?: string | null)` repassa em `options`.

### Sugestões — `lib/queries/catalogs.ts`
```ts
export async function listLostReasonSuggestions(): Promise<string[]>
// lost_reason distintos da org (status 'lost', não nulos), ordenados por
// frequência desc, máx. 12. select('lost_reason') com .limit(500) e contagem
// em JS — é sugestão, não precisa varrer tudo nem de RPC.
```

### UI compartilhada — `components/leads/LostReasonDialog.tsx` (novo, client)
Props: `{ open: boolean; leadTitle: string; suggestions: string[]; pending: boolean; error: string | null; onConfirm(reason: string): void; onCancel(): void }`.
- `<dialog>` nativo (`showModal()`/`close()` via ref), foco inicial no input,
  `Esc` cancela, `Enter` confirma.
- Input de texto com `<datalist>` das sugestões + chips clicáveis das 5
  primeiras. Botão "Marcar como perdido" desabilitado com < 3 caracteres.
- Erro do servidor exibido abaixo do input (`text-danger`).

### `components/leads/StageMover.tsx` (alterar)
Recebe `lostStageId: string | null` e `lostReasonSuggestions: string[]`. Clique
no estágio perdido abre o `LostReasonDialog`; confirmação chama
`moveStage(leadId, stageId, reason)`. Página `/leads/[leadId]` passa as props
(`listLostReasonSuggestions()` no `Promise.all` que já existe).

### Testes (suíte RLS, `tests/actions/leads.test.ts`)
- mover para perdido sem motivo → erro, `stage_id`/`status`/`lost_reason` intactos;
- com motivo `"  Adiado  "` → `status 'lost'`, `lost_reason 'Adiado'`, `closed_at` preenchido;
- perdido → aberto → `lost_reason null`, `closed_at null`;
- motivo com 201 caracteres → erro.

**Pronto quando:** `npm run test:rls` verde e, no browser, marcar um lead como
perdido pela página do lead exige o motivo.

---

## 8.3 Kanban `/pipeline`

### Dependência
`npm install @dnd-kit/core@^6.3.1` (só o core — sem `sortable`: a ordem dentro
da coluna é derivada, não manual).

### Query — `lib/queries/pipeline.ts` (novo, `server-only`)
```ts
export interface PipelineBoardData { stages: BoardStage[]; leads: BoardLead[]; hiddenCountByStageId: Record<string, number>; lostReasonSuggestions: string[] }
export async function getPipelineBoard(now: Date): Promise<PipelineBoardData>
```
- Leads: `status = 'open'` **ou** `closed_at >= now - CLOSED_WINDOW_DAYS`
  (duas queries ou `.or(...)`), sempre `.eq('org_id', orgId)`.
- `hiddenCount`: contar os fechados fora da janela por estágio fechado
  (`select('id', { count: 'exact', head: true })` com `.eq('stage_id', …)` e
  `.lt('closed_at', limite)` — são só 2 estágios) e devolver como
  `hiddenCountByStageId`, passado a `buildBoardColumns`. Leads antigos nunca
  vão para o cliente.
- Contatos, fontes e score do dossiê mais recente: mesmo padrão de
  `lib/queries/analytics.ts` (queries simples por `org_id`, `in('id', ids)`,
  mapas em memória). Sem embedded select.

### Página — `app/(app)/pipeline/page.tsx`
Server component: `getCurrentOrg()` (redirect `/onboarding` se nulo), `now =
new Date()`, `getPipelineBoard(now)`, `buildBoardColumns(...)`, renderiza
cabeçalho ("Pipeline", nome da org, total aberto e previsão ponderada em mono) +
`<PipelineBoard initialColumns orgName lostReasonSuggestions nowIso />`.

### Componentes — `components/pipeline/`
- **`PipelineBoard.tsx`** (client)
  - Estado: `columns` (useState, inicial das props). `DndContext` com
    `PointerSensor` (`activationConstraint: { distance: 6 }`, para clique no card
    continuar abrindo o lead) e `KeyboardSensor`.
  - `accessibility.announcements` em pt-BR ("Lead X movido para Proposta enviada").
  - `onDragEnd`: destino = coluna sob o card. Se destino é `isLost` → guarda
    `pendingMove` e abre `LostReasonDialog`; senão aplica
    `moveLeadOnBoard(columns, leadId, toStageId, new Date())` (otimista) e chama `moveStage`. Erro → restaura o
    snapshot anterior e mostra a mensagem num aviso fixo no topo do quadro
    (some em 5s). Sucesso → `router.refresh()` (traz follow-ups gerados,
    `next_action_at` novo etc.).
  - Busca: input no topo filtra cards com `matchesBoardSearch` (não altera
    totais das colunas — totais são do funil, não da busca).
  - Layout: `flex gap-3 overflow-x-auto pb-4`, colunas `w-72 shrink-0`. A
    página não pode rolar na horizontal — só o quadro.
- **`PipelineColumn.tsx`** — `useDroppable({ id: stage.id })`. Cabeçalho:
  label, contagem (mono), `formatCompactBRL(totalCents)` e, em estágio aberto,
  `≈ {formatCompactBRL(weightedCents)} ({probability}%)` em `text-content-muted`.
  Ganho/Perdido: subtítulo "últimos 30 dias" + "+{hiddenCount} anteriores"
  quando > 0. Destaque de drop (`isOver`): `ring-1 ring-brand-400/50`.
  Barra de cor no topo: `success` em ganho, `danger` em perdido, neutra nas demais.
- **`PipelineCard.tsx`** — `useDraggable({ id: lead.id })`. Conteúdo, nesta ordem:
  empresa (`font-medium`, truncado), título (`text-xs text-content-secondary`,
  2 linhas máx.), linha de rodapé com valor (`font-mono`), bolinha de
  temperatura (hot `danger`, warm `warning`, cold `content-muted`, com
  `aria-label`), próxima ação relativa (`formatRelativeDateBR`; vencida em
  `text-danger`), chip de score digital se houver, e `WhatsappLink` ícone
  (8.4). Card inteiro é `Link` para `/leads/[id]`; o `WhatsappLink` faz
  `stopPropagation` em `onPointerDown`/`onClick`. Durante o arraste:
  `opacity-60` no original + `DragOverlay` com o card.

### Navegação
`lib/navigation.ts`: item `{ label: 'Pipeline', href: '/pipeline' }` entre Hoje e Leads.

**Pronto quando:** no browser (org demo), arrastar um lead de Contatado para
Proposta enviada move o card na hora, persiste após recarregar e cria os 3
follow-ups automáticos em Ações de hoje; soltar em Perdido pede motivo e cancelar
devolve o card; teclado (Tab até o card, Espaço, setas, Espaço) também move.

---

## 8.4 Botão de WhatsApp

### `components/ui/WhatsappLink.tsx` (novo)
Props: `{ phone: string | null; text?: string; variant?: 'icon' | 'button'; label?: string }`.
`buildWhatsappUrl` → `null` não renderiza nada. `<a target="_blank"
rel="noopener noreferrer">` com `WhatsappLogo` (Phosphor). `icon`: 28px
quadrado, `aria-label="Abrir conversa no WhatsApp"`; `button`: ícone + label
("WhatsApp"). Cor do ícone `text-success`.

### Onde entra
1. **Página do lead** (`/leads/[leadId]`): variant `button` no cabeçalho, texto
   `buildGreeting({ contactFirstName, orgName })`.
2. **Kanban** (8.3): variant `icon` no card, mesma saudação.
3. **Ações de hoje** (`components/today/ActionRow.tsx`): variant `icon` para
   atividades do tipo `whatsapp` e `followup` (a linha já tem `contact_phone`),
   sem texto pré-preenchido.
4. **`FollowupGenerator`**: com rascunho gerado, botão "Abrir no WhatsApp" ao
   lado de "Copiar", com `text` = mensagem **editada** atual. Recebe nova prop
   `contactPhone: string | null` (passar das páginas que o usam).

**Não registrar atividade automaticamente** ao clicar: o app não sabe se a
mensagem foi enviada. O fluxo de "Usar esta"/concluir continua sendo o registro.

**Pronto quando:** nos 4 pontos o link abre `wa.me` com o número certo; lead sem
telefone não mostra botão.

---

## 8.5 Previsão ponderada

1. `lib/queries/analytics.ts`: incluir `probability` no select de estágios e no
   mapeamento para `AnalyticsStage`.
2. `/analytics`:
   - Novo `StatTile` **"Previsão ponderada"** = `computeForecast().weightedCents`,
     detalhe `de {formatCompactBRL(openCents)} em aberto`. Grid dos tiles passa
     a `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`.
   - Novo card **"Previsão por etapa"** (na linha do funil, ou abaixo dele):
     `BarList` com `value = weightedCents`, `valueLabel = formatCompactBRL(weighted)`,
     `detail = "{probability}% de {formatCompactBRL(openCents)}"`,
     tooltip `"{count} leads · aberto {open} · ponderado {weighted}"`.
     Subtítulo: "Valor em aberto × probabilidade de cada etapa".
3. Cabeçalho do `/pipeline` (8.3) usa o mesmo `weightedCents` — uma fonte só.

**Pronto quando:** a soma do card "Previsão por etapa" bate com o tile e com o
cabeçalho do Pipeline.

---

## 8.6 Fechamento

1. `docs/DECISIONS.md` — acrescentar:
   - **D-043 — Kanban com `@dnd-kit/core`, ordem derivada.** Só o core (teclado +
     ponteiro + anúncios acessíveis); sem ordenação manual dentro da coluna —
     ordem é por próxima ação e valor, então não há coluna `position` em
     `leads`. Ganho/Perdido mostram só os últimos 30 dias para o quadro não
     crescer sem limite. Movimento otimista com rollback; a action é a mesma
     `moveStage` da página do lead (uma regra de transição só).
   - **D-044 — Motivo de perda obrigatório na transição.** Validado no core
     (não só na UI) e limpo ao reabrir. Texto livre com sugestões dos motivos já
     usados, sem tabela de catálogo — catálogo entra quando houver tela de
     configurações.
   - **D-045 — WhatsApp por click-to-chat (`wa.me`), sem registro automático.**
     Integração oficial (Cloud API) continua no roadmap; até lá o app não
     afirma que uma mensagem foi enviada.
   - **D-046 — Previsão ponderada = valor aberto × `pipeline_stages.probability`.**
     Função única `weightedCents` usada no Analytics e no Pipeline.
2. `docs/IMPLEMENTATION_PLAN.md` → "Fases 8+ / Fila": marcar a Fase 8 como
   **Concluída** (commit final) e deixar o resto da fila como está — a ordem
   das próximas fases é decidida no checkpoint do Opus.
3. `README.md`: rotas `/pipeline` e `/analytics` na lista de telas.
4. `npm run seed:demo` e conferir o quadro com os 107 leads da demo.
5. Gates completos: `typecheck`, `lint`, `test`, `test:coverage`, `test:rls`, `build`.
6. Commit + push. Pedir ao usuário print de `/pipeline` e `/analytics` para
   revisão visual.

## Fora de escopo (não fazer agora)
Metas mensais, ordenação manual de cards, filtros por vendedor/responsável,
integração WhatsApp Cloud API, tela de configurações, propostas em PDF.
