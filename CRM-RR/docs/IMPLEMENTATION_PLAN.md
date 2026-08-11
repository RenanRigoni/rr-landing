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
- [ ] **Fase 5 — Qualificação estruturada**: qualification_criteria (seed 6
      dimensões)/qualifications/qualification_scores/history, domain de score,
      `DealQualificationPanel`.
      Pronto quando: qualificar grava nas 3 tabelas, score recalcula, requalificação
      preserva histórico.
- [ ] **Fase 6 — Infra IA**: Vercel AI Gateway, ai_prompts/ai_runs, seed 3 prompts v1,
      `lib/ai/gateway.ts`, `/ai-quality`.
      Pronto quando: IA real gera resposta via Gateway, loga tokens/custo, fica
      pendente de revisão.
- [ ] **Fase 7 — Feedback IA + Prompt Lab**: ai_feedback/prompt_lab_comparisons +
      view ai_quality, `/prompt-lab`.
      Pronto quando: v2 comparada com v1 no mesmo input real, vencedor registrado,
      reflete em ai-quality.
- [ ] **Fase 8 — Processos/Docs/Playbooks/Glossário**: process_docs/process_feedback/
      playbooks/glossary_terms, seed 3 processos + 3-5 playbooks + 15-20 termos.
      Pronto quando: páginas navegáveis, feedback anexável a partir de deal real.
- [ ] **Fase 9 — Polish/Testes/Seed removal**: 6 suítes Vitest, checklist das 10
      regras de negócio, `purgeDemoData()`, docs finalizados, deploy produção.
      Pronto quando: fluxo e2e de 26 passos (definition of done) funciona em produção
      com dados reais.

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
