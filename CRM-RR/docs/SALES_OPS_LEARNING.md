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

```
FEATURE: qualificação estruturada multi-dimensional (BANT+)
CONCEITO DE SALES OPS: Lead scoring / lead qualification framework
POR QUE IMPORTA: Um score único e opaco ("esse lead é 78") não ajuda a decidir o
que fazer a seguir. Score por dimensão (ICP, necessidade, acesso ao decisor,
orçamento, timing, engajamento) diz exatamente ONDE a oportunidade é fraca —
"score baixo porque não confirmamos orçamento" pede uma ação diferente de "score
baixo porque não temos acesso ao decisor". Isso é a diferença entre pontuar um
lead e efetivamente qualificá-lo.
```

```
FEATURE: assistente de IA com Aplicar/Rejeitar (ai_runs.applied, human-in-the-loop)
CONCEITO DE SALES OPS: Human-in-the-loop AI / AI-assisted qualification
POR QUE IMPORTA: IA em processo comercial erra de forma diferente de um humano —
alucina contexto que não foi dado, é overconfident quando falta informação. Nunca
aplicar output de IA direto no CRM (sempre exigir Aplicar/Rejeitar) não é
burocracia: é o mecanismo que torna possível medir depois se a IA estava certa
(Fase 7) e é o que evita que um erro de IA vire dado "oficial" do pipeline sem
ninguém perceber.
```

```
FEATURE: Prompt Lab (comparação A/B de versões de prompt)
CONCEITO DE SALES OPS: Prompt engineering iterativo com avaliação empírica
POR QUE IMPORTA: "Melhorar o prompt" sem comparar contra a versão anterior no
mesmo input é só achismo. Prompt Lab roda as duas versões sobre o mesmo caso real
e obriga uma decisão explícita (A/B/empate) — é o mesmo princípio de um teste A/B
de copy ou de landing page, aplicado a prompts de IA. Sem isso, não dá pra saber
se uma mudança de prompt realmente melhorou algo ou só mudou.
```

```
FEATURE: rastreabilidade de processo (esperado vs. observado, seção 22)
CONCEITO DE SALES OPS: Process adherence measurement / AS-IS vs TO-BE gap analysis
POR QUE IMPORTA: Documentar um processo (TO-BE) não garante que ele é seguido.
Medir a aderência real — "esperávamos 100%, temos 68%" — é o que diferencia
documentação decorativa de gestão de processo de verdade. O gap numérico aponta
onde investigar; ele não diz automaticamente o porquê (pode ser processo ruim,
treinamento insuficiente, ou uma exceção legítima) — só torna a pergunta possível.
```
