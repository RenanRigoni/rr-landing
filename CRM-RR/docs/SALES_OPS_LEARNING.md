# Sales Ops Learning — CRM-RR

> Para cada feature relevante: o conceito de Sales Ops por trás e por que importa.
> Preenchido progressivamente a partir da Fase 4 (primeira feature analítica real).

Formato de cada entrada:

```
FEATURE: <nome>
CONCEITO DE SALES OPS: <nome do conceito>
POR QUE IMPORTA: <explicação prática, sem jargão gratuito>
```

```
FEATURE: deal_stage_history (registro automático de transição de estágio)
CONCEITO DE SALES OPS: Pipeline velocity / stage duration analysis
POR QUE IMPORTA: Sem histórico de quando cada deal entrou e saiu de cada estágio,
é impossível saber ONDE o processo comercial está travando. Um deal "parado" em
Proposta por 40 dias é invisível se você só olha o estágio atual — só aparece
quando você mede a duração de cada passagem. Essa é a base de qualquer análise de
bottleneck (Fase 4) e é por isso que a gravação acontece via trigger de banco, não
como uma responsabilidade opcional da UI.
```

```
FEATURE: my-day (visão "sem próxima ação" / "sem interação há 14+ dias")
CONCEITO DE SALES OPS: Follow-up management / pipeline hygiene
POR QUE IMPORTA: A causa mais comum de deals perdidos por "sem resposta" não é o
cliente ter sumido — é o vendedor não ter agendado o próximo contato. Tornar
visível quais oportunidades estão sem uma próxima ação agendada transforma uma
falha invisível de processo em um item acionável todo dia.
```

```
FEATURE: v_source_performance (win rate e ticket médio por fonte de aquisição)
CONCEITO DE SALES OPS: Channel attribution / CAC-adjacent analysis
POR QUE IMPORTA: Nem todo lead vale o mesmo. Uma fonte que gera muito volume mas
converte pouco pode estar consumindo mais tempo de qualificação do que retorna em
receita. Sem medir win rate POR FONTE (não só win rate geral), a decisão de "onde
investir esforço de prospecção" é um chute.
```

```
FEATURE: v_lost_reason_summary
CONCEITO DE SALES OPS: Loss analysis / win-loss review
POR QUE IMPORTA: Motivo de perda agregado revela se o problema é de processo
(ex: "sem resposta" alto = falha de follow-up), de produto/oferta (ex: "preço" alto
= possível desalinhamento de posicionamento) ou de qualificação (ex: "ICP incorreto"
alto = triagem de entrada fraca). Cada categoria aponta para uma ação diferente.
```
