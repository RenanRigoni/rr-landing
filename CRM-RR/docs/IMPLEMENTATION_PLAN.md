# Plano de Implementação — CRM-RR

Espelha `~/.claude/plans/quero-criar-um-crm-cozy-globe.md` (plano aprovado). Checklist
atualizado ao fim de cada fase — critério de "pronto quando" só é marcado quando o
fluxo correspondente foi testado manualmente no browser, não só quando o código
compila.

- [x] **Fase 1 — Arquitetura & Docs**: scaffold `CRM-RR/` (Next.js 16 + React 19 +
      Tailwind 3 + tokens replicados), 7 docs criados. `npm run build`/`lint`/
      `tsc --noEmit` limpos, `npm run dev` confirmado servindo tema dark nas 16
      rotas reais (200 OK). Falta apenas criar o projeto Vercel `crm-rr` (root
      directory `CRM-RR/`) quando o usuário autorizar.
- [x] **Fase 2 — DB + Auth + CRUD básico**: schema `crm` criado no projeto Supabase
      existente (`fvgbbixxcapltudonxqx`, isolado do schema `public` da clínica —
      confirmado sem alteração nenhuma nas tabelas/linhas existentes), companies/
      contacts/pipelines/pipeline_stages/lost_reasons/lead_sources com RLS,
      Supabase Auth com usuário único, proxy (`proxy.ts`, ex-middleware no Next 16)
      protegendo o grupo `(app)`. CRUD completo de companies e contacts com Server
      Actions + Zod, testado ponta a ponta no browser pelo usuário: login real,
      criação de empresa persistida e listada, criação de contato vinculado.
- [x] **Fase 3 — Pipeline/Deals/Activities/Stage History**: migration deals/
      deal_stage_history/activities/audit_log + triggers `fn_enforce_lost_reason`
      (Regra 2) e `fn_log_stage_change` (Regra 5), Kanban drag-and-drop (`@dnd-kit`),
      `LostReasonModal` reaproveitado no Kanban e no `StageMover` da página de deal,
      `/deals/new`, `/deals/[id]` (timeline unificada de estágio+atividades,
      atividades pendentes com concluir/excluir), `/my-day` (atrasado, hoje, sem
      próxima ação, sem interação há 14+ dias). Build/lint/typecheck limpos.
      **Pendente de verificação manual pelo usuário** (sessão em pausa): criar deal
      real, arrastar entre estágios, mover para "Perdido" exigindo motivo, adicionar
      e concluir atividade, conferir `/my-day`.
- [x] **Fase 4 — Dashboard/Analytics**: 5 views (`v_funnel_conversion`,
      `v_deal_stage_duration`, `v_lost_reason_summary`, `v_source_performance`,
      `v_followup_health`) criadas com `security_invoker = true` (achado de
      segurança corrigido na hora: views por padrão rodam com permissão do dono e
      bypassam RLS — corrigido antes de qualquer teste). `/dashboard` com KPIs +
      Recharts (funil, duração por estágio, motivos de perda, performance por
      fonte). `/analytics/sql-learning` com 5 perguntas de negócio + SQL real +
      contagem de registros ao vivo. Build/lint/typecheck limpos.
      **Pendente de verificação manual** junto com a Fase 3 (dados ainda zerados —
      sem deals reais criados até o momento).
- [x] **Fase 5 — Qualificação estruturada**: `qualification_criteria` (seed 6
      dimensões BANT+: fit_icp, need, authority, budget, timing, engagement, pesos
      diferenciados), `qualifications`, `qualification_scores` (`rationale NOT
      NULL` — Regra 7), `qualification_history` (snapshot a cada save).
      `lib/domain/qualification-score.ts` (`computeOverallScore`,
      `classifyQualificationFactors`) com 11 testes Vitest passando.
      `DealQualificationPanel` no detail do deal: score 0-100, fatores fortes/riscos
      explicados, formulário de (re)pontuação por critério. Score também aparece no
      card do Kanban e alimenta a seção "Alta prioridade" do `/my-day`. Build, lint,
      typecheck e testes limpos.
      **Pendente de verificação manual** junto com Fases 3/4.
- [x] **Fase 6 — Infra IA**: `ai_prompts` (versionado, unique parcial 1 ativo por
      slug) + `ai_runs`, seed real de 3 prompts v1 (`qualify-deal`,
      `summarize-deal`, `draft-followup-email`, modelo `anthropic/claude-sonnet-5`
      via AI Gateway — slug confirmado contra `GET ai-gateway.vercel.sh/v1/models`,
      não veio de memória). `lib/ai/gateway.ts` (`runAiPrompt`, único ponto de
      chamada, loga toda execução inclusive erro) usando `generateText` +
      `Output.object()` do `ai@7` (API nova — `generateObject` está deprecated).
      3 botões reais na página do deal (Analisar qualificação / Resumir / Rascunhar
      e-mail), cada um com Aplicar/Rejeitar — `applyQualificationSuggestion` só
      grava em `qualification_scores` após clique humano explícito (Regra 3).
      `/ai-quality` com execuções recentes e taxa de aceitação básica (view
      `v_ai_quality_summary` completa vem na Fase 7 com feedback estruturado).
      Build/lint/typecheck/testes limpos.
      **Bloqueado para teste real**: falta `AI_GATEWAY_API_KEY` no `.env.local`
      (Vercel Dashboard → Team Settings → AI Gateway → API Keys — projeto ainda
      não está linkado a um projeto Vercel, então OIDC automático não se aplica
      ainda). Sem a chave, os 3 botões de IA retornam erro de autenticação — todo
      o resto (schema, UI, fluxo de aceitar/rejeitar) está pronto e será testado
      assim que a chave for adicionada.
- [x] **Fase 7 — Feedback IA + Prompt Lab**: `ai_feedback` (rating, is_useful,
      `error_category` de 10 categorias, `correction_notes`) + `prompt_lab_comparisons`
      + view `v_ai_quality_summary` (por slug+version: runs, %aceitação, rating
      médio, latência média). Todo fluxo de rejeição nos 3 botões de IA agora abre
      `RejectFeedbackModal` pedindo categoria do erro antes de gravar — feedback
      estruturado desde o primeiro uso.
      `/prompt-lab`: lista de versões por slug com "Ativar" (nunca sobrescreve —
      só troca qual está `is_active`), formulário de nova versão pré-preenchido com
      a versão mais recente, ferramenta de comparação A/B que roda as duas versões
      no mesmo input JSON real e grava o vencedor. `/ai-quality` atualizado com
      tabela de performance por versão de prompt + erros agrupados por categoria.
      `lib/domain/ai-feedback-aggregation.ts` com 5 testes Vitest (16 no total).
      Build/lint/typecheck/testes limpos. Mesma pendência da Fase 6: precisa de
      `AI_GATEWAY_API_KEY` pra testar de verdade.
- [x] **Fase 8 — Processos/Docs/Playbooks/Glossário**: `process_docs` (AS-IS/TO-BE,
      steps, KPIs, exceções) + `process_feedback` + `playbooks` + `glossary_terms`.
      Seed real: 3 processos (Qualificação de Lead, Cadência de Follow-up,
      Fechamento de Proposta), 4 playbooks, 20 termos de glossário.
      Rastreabilidade de processo real (seção 22 da spec) implementada no processo
      "Cadência de Follow-up": compara o esperado (100% dos deals abertos com
      próxima ação) contra o observado de verdade via `v_followup_health`
      (`getFollowupProcessGap`) — não é um exemplo estático, recalcula a cada
      acesso com dados reais do pipeline.
      `/processes`, `/processes/[slug]` (com formulário de feedback operacional
      real), `/playbooks`, `/playbooks/[slug]`, `/glossary`.
      Build/lint/typecheck/testes limpos.
- [x] **Fase 9 — Polish/Testes/Seed removal**: 6 suítes Vitest / 37 testes
      (qualification-score, ai-feedback-aggregation, conversion, stage-duration,
      lost-reason-rules, next-action). As 10 regras de negócio revisadas e
      fechadas em `BUSINESS_RULES.md` (Regra 10 completada nesta fase —
      `logAudit()` agora cobre companies/contacts/deals/activities). Seção
      "Possíveis gargalos" no dashboard (seção 11 da spec). `/settings` real
      (pipeline, critérios, motivos de perda, fontes, purga de dados demo).
      README.md final com setup, deploy, guia de 30 minutos.
      Build/lint/typecheck/testes limpos em todas as fases.
      **Pendente** (requer o usuário, fora do que dá pra automatizar): testar o
      fluxo e2e completo com dados reais no browser (só companies/contacts foi
      verificado ao vivo até agora), configurar `AI_GATEWAY_API_KEY` pra testar os
      botões de IA de verdade, criar o projeto Vercel `crm-rr` e fazer o primeiro
      deploy, e importar o histórico real de prospecção quando estruturado.

## Log de decisões

- **2026-08-11** — `CRM-RR/` como pasta irmã independente, não workspace (raiz não
  tem tooling de monorepo; evita risco no build de produção do `rr-landing`).
- **2026-08-11** — Schema Postgres dedicado `crm` no projeto Supabase existente
  `fvgbbixxcapltudonxqx`, em vez de projeto novo ou tabelas prefixadas em `public`.
- **2026-08-11** — IA via Vercel AI Gateway (strings `"provider/model"`), não SDK
  direto de provider.
- **2026-08-11** — Deploy em projeto Vercel novo `crm-rr`, root directory `CRM-RR/`.
- **2026-08-11** — Confirmado com o usuário: schema `crm` no projeto Supabase
  `fvgbbixxcapltudonxqx` é seguro porque é um namespace isolado do `public`
  (onde vive o app da clínica). Nenhum comando tocou tabelas `public.*` — validado
  comparando contagem de linhas antes/depois da migration (idêntico). Exposição do
  schema `crm` na Data API e criação do usuário Auth único foram feitas manualmente
  pelo usuário no dashboard (únicos passos que não têm equivalente via MCP/SQL).
