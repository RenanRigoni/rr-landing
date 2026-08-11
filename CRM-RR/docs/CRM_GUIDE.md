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
_(preenchido na Fase 5)_

## Como a conversão é calculada
_(preenchido na Fase 4)_

## Como a análise de lost reason funciona
_(preenchido na Fase 4)_

## Como a saúde de follow-up funciona
_(preenchido na Fase 4)_

## Como o feedback de IA funciona
_(preenchido na Fase 7)_

## Como o versionamento de prompt funciona
_(preenchido na Fase 6/7)_

## Como bottlenecks são detectados
_(preenchido na Fase 4)_

## Como a rastreabilidade de processo funciona
_(preenchido na Fase 8)_
