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
- [ ] **Fase 2 — DB + Auth + CRUD básico**: schema `crm`, enums, companies/contacts/
      pipelines/pipeline_stages/lost_reasons/lead_sources, RLS, Supabase Auth,
      middleware, CRUD companies/contacts.
      Pronto quando: login funciona, CRUD real persiste, RLS bloqueia acesso anônimo.
- [ ] **Fase 3 — Pipeline/Deals/Activities/Stage History**: migration deals/
      deal_stage_history/activities + triggers, Kanban dnd-kit, LostReasonModal,
      `/deals/[id]`, `/my-day`.
      Pronto quando: criar deal → mover 3+ estágios → registrar atividades → perder
      com lost_reason obrigatório funciona ponta a ponta com histórico correto.
- [ ] **Fase 4 — Dashboard/Analytics**: views (exceto ai_quality), `/dashboard` com
      Recharts, `/analytics/sql-learning`.
      Pronto quando: gráficos refletem dados reais do pipeline, não mock.
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
