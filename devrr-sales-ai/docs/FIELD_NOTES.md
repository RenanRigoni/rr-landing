# Field Notes — DevRR Sales AI (Fase 6.5, uso real)

Registro de atrito do uso real, todo dia, com os leads reais da DevRR. Isto —
não o plano — é o backlog verdadeiro das Fases 7+. `IMPLEMENTATION_PLAN.md`
→ 6.5.

- **Início:** 2026-08-27
- **Fim previsto:** 2026-09-10 (duas semanas)
- **Operador:** Renan
- **Ambiente:** deploy Vercel de Production (projeto `devrr-sales-ai`, root
  `devrr-sales-ai/`). Runbook de deploy em `README.md` → Deploy.

Ao fim das duas semanas: **checkpoint Opus** para revisar o plano das Fases 7+.
Q-006 (append-only de `audit_logs`) e Q-008 (índices de cobertura de FK) entram
nesse mesmo checkpoint — **não resolver por oportunidade durante o uso**.

---

## Definição de pronto (PRODUCT_SPEC.md)

O MVP está pronto quando, **com dados reais da DevRR**, o sistema responde cada
pergunta abaixo por uma tela do produto (não por consulta manual ao banco).
Marcar `[x]` com a data e a tela onde a resposta aparece.

| # | Pergunta | Tela | OK? | Data |
|---|---|---|---|---|
| 1 | Quantos leads entraram no período? | | [ ] | |
| 2 | Quem pediu orçamento e ainda não recebeu proposta? | | [ ] | |
| 3 | Quem recebeu proposta e não respondeu? | | [ ] | |
| 4 | Quem precisa de follow-up **hoje**? | | [ ] | |
| 5 | Quanto existe em negociação aberta? | | [ ] | |
| 6 | Qual serviço puxa mais interesse? | | [ ] | |

### Fluxo completo ponta a ponta

Rodar pelo menos uma vez, com lead real, e marcar cada passo:

- [ ] criar lead
- [ ] mover para `proposta_enviada`
- [ ] follow-up agendado sozinho (nas datas certas, fuso/horário comercial)
- [ ] chega o dia → aparece em "Ações de hoje"
- [ ] IA escreve a mensagem (nasce `pending_review`)
- [ ] copiar → marcar como enviada
- [ ] cliente responde → marcar como respondido
- [ ] follow-ups futuros somem

### Job de reconciliação (6.3, D-034) em Production

URL de Production: `https://devrr-sales-ai.vercel.app` (deployment
`dpl_4SQHY3zSqEhTPWrnVvQ9yADCSfSC`, commit `b75b50d`).

- [x] `CRON_SECRET` (≥32 caracteres) presente em **Production** — verificado 2026-08-27 (len 64)
- [x] `GET /api/cron/reconcile` com `Authorization: Bearer $CRON_SECRET` → `200` + contadores — 2026-08-27: `{"orgs":2,"leadsChecked":0,"leadsFixed":0,"durationMs":1045,"errors":0}` (sem `org_id`/id de lead no corpo)
- [x] mesma rota sem header → `401` (não `307`/`302` — prova a exclusão do matcher do `proxy.ts` e que a auth rejeitou) — 2026-08-27
- [ ] após ~1 dia: run agendado (`0 9 * * *` UTC = 06:00 BRT) aparece no histórico de Cron da Vercel

> A URL de deployment `*-renanrigonis-projects.vercel.app` responde `302` para
> o SSO da Vercel (Deployment Protection do plano Hobby) — proteção de
> deployment, não a rota. O Vercel Cron chama o alias público de Production,
> que responde `401`/`200` como esperado.

---

## Log de atrito

Uma linha por incômodo real. Severidade: `bug` (quebrou / dado errado) ·
`atrito` (funciona mas irrita) · `falta` (precisei e não tinha) · `sobra`
(está aí e não uso).

| Data | Tela / fluxo | O que aconteceu | Severidade | Candidato a fase |
|---|---|---|---|---|
| | | | | |

---

## O que faltou

_Recursos que a DevRR precisou no dia a dia e não existem._

-

## O que sobrou

_Telas / campos / passos que estão no produto e ninguém usa._

-

## Bugs encontrados

_Comportamento errado. Se bloqueia o uso, abrir correção fora da 6.5 e anotar aqui._

-

---

## Fechamento (preencher no fim das duas semanas)

- **As 6 perguntas respondem com dado real?** sim / não —
- **O fluxo ponta a ponta gruda no uso manual?** sim / não —
- **Top 3 do backlog real das Fases 7+:**
  1.
  2.
  3.
- **Reordenação sugerida das Fases 7+** (vs. tabela do `IMPLEMENTATION_PLAN.md`):
