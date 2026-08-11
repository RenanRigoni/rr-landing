# Interview Notes — CRM-RR

Registro do que o usuário pode dizer com verdade sobre este projeto, depois de
efetivamente usá-lo — não uma lista de features planejadas. Uma entrada só é
adicionada aqui quando a feature está implementada, testada ponta a ponta, e usada
com dados reais (não só seed demo).

Formato de cada entrada:

```
AFIRMAÇÃO: "..."
O QUE FOI CONSTRUÍDO: <componentes/tabelas/rotas concretas>
PROBLEMA DE NEGÓCIO QUE RESOLVE: <...>
MÉTRICA QUE PROVA: <número real do próprio uso>
ONDE DEMONSTRAR NA APLICAÇÃO: <rota/tela>
```

```
AFIRMAÇÃO: "Implementei CRUD completo de empresas e contatos com Server Actions,
validação Zod no servidor e RLS no Postgres."
O QUE FOI CONSTRUÍDO: crm.companies/crm.contacts, lib/actions/companies.ts e
contacts.ts, formulários com useActionState.
PROBLEMA DE NEGÓCIO QUE RESOLVE: manter um cadastro confiável de empresas e
contatos prospectados, com validação de dados na entrada.
MÉTRICA QUE PROVA: testado ao vivo pelo usuário em 2026-08-11 — criou empresa e
contato reais, confirmou persistência e listagem corretas.
ONDE DEMONSTRAR NA APLICAÇÃO: /companies, /contacts.
```

_(demais entradas — pipeline/deals, qualificação, IA, processos — pendentes até o
usuário testar esses fluxos com dados reais no browser; código e testes
automatizados já passam, mas essa verificação manual é o critério para entrar
aqui.)_
