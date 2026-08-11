# Guia do CRM-RR

> Documento vivo — cresce a cada fase. Nesta etapa (Fase 1) só a estrutura existe;
> as seções abaixo são preenchidas conforme cada fase é concluída.

## Como o pipeline funciona

Cada oportunidade (`deal`) pertence a um pipeline e está sempre em exatamente um
estágio (`pipeline_stage`). O board em `/pipeline` mostra os estágios como colunas;
arrastar um card move a oportunidade — isso atualiza `deals.stage_id` e, por trigger
de banco, grava automaticamente uma linha em `deal_stage_history` com a duração que
o deal ficou no estágio anterior. Isso nunca depende do código da aplicação lembrar
de gravar; é garantido no nível do Postgres.

Mover para um estágio marcado como "Ganho" define `status='won'`. Mover para um
estágio marcado como "Perdido" exige selecionar um motivo estruturado (modal
`LostReasonModal`) — o banco rejeita a gravação se `status='lost'` e não houver
`lost_reason_id`, então mesmo um bug na UI não conseguiria burlar essa regra.

A página de cada deal (`/deals/[id]`) reúne: atividades pendentes com ações de
concluir/excluir, formulário para adicionar nova atividade, timeline cronológica
combinando mudanças de estágio e atividades, e um seletor de estágio equivalente ao
drag-and-drop do board.

`/my-day` lista o que precisa de atenção: atividades atrasadas, atividades de hoje,
deals abertos sem nenhuma atividade pendente, e deals sem interação há mais de 14
dias (limiar configurável futuramente).

## Como a qualificação funciona

Qualificação nunca é um número solto. Cada deal pode ser pontuado em 6 dimensões
(`crm.qualification_criteria`, seed inicial: Fit com ICP, Necessidade, Acesso ao
decisor, Orçamento, Timing, Engajamento), cada uma de 0 a 5, e **cada pontuação
exige uma justificativa** — o banco rejeita gravar uma nota sem `rationale`.

O score geral (0-100) é a média ponderada das dimensões pontuadas
(`lib/domain/qualification-score.ts::computeOverallScore`), usando o peso
configurado em cada critério. Critérios não pontuados nessa rodada simplesmente não
entram na conta; se nenhum critério foi pontuado ainda, o score é `null` (não
zero — "não qualificado" é um estado diferente de "qualificado com nota mínima").

O painel do deal também classifica automaticamente cada dimensão pontuada como
"fator forte" (nota ≥ 80% do máximo) ou "risco" (nota ≤ 40% do máximo) — é assim que
a interface explica o PORQUÊ do score, não só o número.

Toda vez que a qualificação é salva, um snapshot completo vai para
`crm.qualification_history` — mesmo requalificando um deal, a avaliação anterior
não se perde.

## Como a conversão é calculada

`crm.v_funnel_conversion` conta, por estágio, quantos deals já ENTRARAM nele (via
`deal_stage_history.to_stage_id`, não o status atual do deal — um deal que já
avançou continua contando no estágio anterior). A conversão para o próximo estágio
é `next_stage_deals_reached / deals_reached`, calculada com a função de janela
`lead()`. Isso é diferente de "quantos deals estão HOJE em cada estágio" (isso é só
o board do Kanban) — conversão é sobre o histórico completo de passagens.

## Como a análise de lost reason funciona

`crm.v_lost_reason_summary` agrupa deals com `status='lost'` pelo `lost_reason_id`.
Isso só é confiável porque a Regra 2 torna `lost_reason_id` obrigatório no banco —
não existe deal perdido sem motivo, então a análise nunca fica incompleta por
preguiça de preenchimento.

## Como a saúde de follow-up funciona

`crm.v_followup_health` classifica cada deal aberto em 4 estados: `overdue` (tem
atividade pendente com `due_at` no passado), `due_soon` (vence nos próximos 3 dias),
`no_next_action` (nenhuma atividade pendente) ou `healthy`. É a mesma lógica usada
em `/my-day` e nos indicadores do topo do `/dashboard`.

## Como o feedback de IA funciona

Todo output de IA rejeitado passa por `RejectFeedbackModal`, que exige uma categoria
de erro (classificação de ICP, porte da empresa, interpretação de necessidade,
timing, orçamento, cargo do contato, informação alucinada, contexto insuficiente,
recomendação errada, outro) antes de gravar em `crm.ai_feedback`. Aceitar também
grava feedback (`is_useful=true`), mas sem exigir categoria — o objetivo é entender
POR QUE a IA erra, não só QUANTO erra.

`/ai-quality` agrupa feedback rejeitado por categoria (`getErrorCategoryBreakdown`) —
é assim que fica visível se o problema recorrente é, por exemplo, a IA errando
sistematicamente a classificação de porte de empresa, o que sinaliza que o prompt
(ou o contexto passado a ele) precisa melhorar especificamente nesse ponto.

## Como o versionamento de prompt funciona

`crm.ai_prompts` nunca é atualizado no conteúdo — cada mudança de prompt é uma nova
linha (`slug` + `version` incrementado). Um índice único parcial garante que só
existe 1 versão `is_active=true` por slug, e é essa versão ativa que
`lib/ai/gateway.ts::runAiPrompt` busca em toda chamada — o código nunca referencia
um prompt hardcoded, só a slug (`qualify-deal`, `summarize-deal`,
`draft-followup-email`). O template usa `{{placeholders}}` renderizados por
`lib/ai/render-template.ts`. Comparar versões lado a lado é o Prompt Lab (Fase 7).

Toda chamada de IA passa por esse único ponto (`runAiPrompt`), que grava em
`crm.ai_runs` mesmo quando a chamada falha (`status='error'`) — não existe execução
de IA "invisível". Nenhum resultado é aplicado ao CRM automaticamente: os botões de
IA na página do deal (Analisar qualificação / Resumir / Rascunhar e-mail) sempre
terminam em "Aplicar"/"Rejeitar" — a aplicação real (ex: gravar
`qualification_scores`) só acontece depois desse clique humano.

## Como bottlenecks são detectados

`/dashboard` calcula até 3 insights automáticos a partir de dados reais já
carregados para os outros gráficos (`lib/queries/analytics.ts::getBottleneckInsights`
— função pura, sem query própria):

1. **Estágio mais lento**: se o estágio com maior tempo médio for pelo menos 1.5x
   mais lento que a média dos demais, aparece como possível gargalo.
2. **Follow-up esquecido**: se 20%+ das oportunidades abertas não tiverem nenhuma
   atividade pendente, aparece como possível falha de cadência.
3. **Motivo de perda concentrado**: se um único motivo responder por 30%+ das
   perdas (com pelo menos 3 perdas no total), aparece como possível padrão.

Cada insight separa explicitamente **DADO** (o número observado) de
**INTERPRETAÇÃO** (uma hipótese, nunca uma afirmação categórica como "seu preço
está errado") — é assim que a spec original pede que bottlenecks sejam
apresentados. Sem dado suficiente, a seção simplesmente não aparece — nunca mostra
um insight inventado.

## Como a rastreabilidade de processo funciona

Cada processo documentado (`/processes/[slug]`) tem um conteúdo AS-IS (como
funciona hoje, na prática) e um TO-BE (como deveria funcionar). Isso já é
rastreabilidade em prosa. O passo além é comparar o TO-BE contra dado real: o
processo "Cadência de Follow-up" declara que espera 100% dos deals abertos com
próxima ação — e a página desse processo calcula, ao vivo, o percentual observado
via `crm.v_followup_health` (`getFollowupProcessGap`). O gap entre 100% esperado e
o percentual real observado aparece como um número, não uma opinião — é a mesma
lógica que "Meu Dia" e o dashboard usam, aplicada ao contexto do processo
específico. Esse padrão pode ser estendido a outros processos conforme fizer
sentido, sem exigir mudança de schema.

Feedback operacional (`process_feedback`) fica anexado ao processo — friction,
ideia, "funcionou bem" ou bug do CRM — criando um histórico de observações reais de
quem executa o processo, separado da documentação formal.
