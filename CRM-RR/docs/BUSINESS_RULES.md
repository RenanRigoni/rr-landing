# Regras de Negócio — CRM-RR

As 10 regras exigidas pela especificação original, com o mecanismo concreto de
enforcement em cada uma. Regra sem enforcement mecânico documentado é considerada
não implementada.

## Regra 1 — Deals ativos devem ter próxima atividade
**Enforcement**: não bloqueante no banco (é um estado válido, só indesejável).
Detectado por `lib/domain/next-action.ts::detectNextAction()` e exposto em `/my-day`
("Deals sem próxima ação") e na view `crm.v_followup_health` (flag `no_next_action`).
Implementado na Fase 3/4.

## Regra 2 — Deal não pode ser marcado LOST sem lost_reason
**Enforcement em duas camadas**:
- UI: `LostReasonModal` bloqueia a transição de estágio até o motivo ser selecionado.
- Banco: trigger `crm.fn_enforce_lost_reason()` (`BEFORE INSERT OR UPDATE ON
  crm.deals`) lança exceção se `status='lost'` e `lost_reason_id IS NULL` — não
  contornável mesmo se a UI falhar. Implementado na Fase 3.

## Regra 3 — Outputs de IA relevantes exigem revisão humana
**Enforcement**: toda execução de IA grava em `crm.ai_runs` com
`status='pending_review'` e `applied=false` por padrão. Nenhum código do app aplica
`parsed_output` a `qualification_scores`/`deals` automaticamente — só a ação humana
explícita "Aceitar" no `AiRunCard` seta `applied=true` e `reviewed_by`. Implementado
na Fase 6/7.

## Regra 4 — Versões de prompt não podem sobrescrever histórico
**Enforcement**: `crm.ai_prompts` tem `unique(slug, version)` e nenhuma Server Action
expõe `UPDATE` de `system_prompt`/`user_prompt_template` — só `INSERT` de nova
versão. Um índice único parcial (`WHERE is_active = true`) garante só 1 versão ativa
por `slug`, ativação é um `UPDATE` isolado que não toca no conteúdo. Implementado na
Fase 6/7.

## Regra 5 — Transições de estágio devem ser historicamente registradas
**Enforcement**: trigger `crm.fn_log_stage_change()` (`AFTER UPDATE OF stage_id ON
crm.deals`) grava em `deal_stage_history` automaticamente — não depende de nenhum
Server Action lembrar de fazer isso. Implementado na Fase 3.

## Regra 6 — Execuções de IA devem ser historicamente registradas
**Enforcement**: `lib/ai/gateway.ts` é o único ponto de chamada ao Vercel AI Gateway;
todo Server Action/Route Handler que usa IA passa por ele, que grava em `crm.ai_runs`
antes de retornar o resultado à UI (inclusive em caso de erro, `status='error'`).
Implementado na Fase 6.

## Regra 7 — Qualificação deve explicar seus fatores
**Enforcement**: `crm.qualification_scores.rationale` é `NOT NULL` — não é possível
gravar uma pontuação por dimensão sem justificativa. `qualification_score` (score
único, cache em `deals`) nunca é editável diretamente pela UI; é sempre derivado das
dimensões via `lib/domain/qualification-score.ts`. Implementado na Fase 5.

## Regra 8 — Analytics devem derivar de dados reais armazenados
**Enforcement**: todo número em `/dashboard`, `/ai-quality`, `/my-day` vem de query a
`crm.*`/`crm.v_*` — zero constante hardcoded no frontend. `is_demo=true` mantém isso
verdadeiro mesmo em desenvolvimento (os números refletem seed real, não mock
inventado). Implementado nas Fases 4, 6, 7.

## Regra 9 — Documentação de processo deve ter versão/timestamp
**Enforcement**: `crm.process_docs.last_reviewed_at` e `crm.playbooks.version` +
`updated_at`, atualizados por Server Action a cada edição salva. Implementado na
Fase 8.

## Regra 10 — Registros comerciais devem ser rastreáveis
**Enforcement**: `crm.audit_log` grava mudanças relevantes (mudança de estágio, deal
marcado lost, lost_reason alterado, qualificação alterada, sugestão de IA
aceita/rejeitada, versão de prompt alterada, documentação de processo atualizada) com
`actor`, `diff` (old/new) e `created_at`. Toda `lib/actions/*.ts` que muta estado
grava uma linha em `audit_log` como parte da mesma operação. Implementado
progressivamente a partir da Fase 3.

## Status de implementação

| Regra | Fase | Status |
|---|---|---|
| 1 | 3/4 | implementado (query `/my-day`; visão "dashboard" completa na Fase 4) |
| 2 | 3 | implementado (UI `LostReasonModal` + trigger `fn_enforce_lost_reason`) |
| 3 | 6/7 | implementado (`ai_runs.applied=false` por padrão; `applyQualificationSuggestion`/`acknowledgeAiRun` só rodam em clique humano) |
| 4 | 6/7 | implementado (`ai_prompts` só recebe INSERT de nova versão; índice único parcial garante 1 ativo por slug) |
| 5 | 3 | implementado (trigger `fn_log_stage_change`) |
| 6 | 6 | implementado (`runAiPrompt` é o único ponto de chamada à IA; loga sucesso e erro em `ai_runs`) |
| 7 | 5 | implementado (`qualification_scores.rationale NOT NULL` no banco + `computeOverallScore`/`classifyQualificationFactors` testados) |
| 8 | 4,6,7 | implementado (views `crm.v_*` são a única fonte de números em `/dashboard`, `/analytics/sql-learning` e `/ai-quality`, incluindo `v_ai_quality_summary`) |
| 9 | 8 | pendente |
| 10 | 3+ | implementado parcialmente (`audit_log` gravado em mudanças de estágio/won/lost via `moveDealStage`; cobertura de companies/contacts/activities fica para revisão na Fase 9) |

Atualizado ao fim de cada fase (`docs/IMPLEMENTATION_PLAN.md` referencia esta tabela).
