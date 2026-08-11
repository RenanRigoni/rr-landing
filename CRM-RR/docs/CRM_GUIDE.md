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
_(preenchido na Fase 7)_

## Como o versionamento de prompt funciona
_(preenchido na Fase 6/7)_

## Como bottlenecks são detectados
_(preenchido na Fase 4)_

## Como a rastreabilidade de processo funciona
_(preenchido na Fase 8)_
