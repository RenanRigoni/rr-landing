# CRM-RR

CRM operacional para prospecção B2B freelance. Projeto Next.js standalone (não faz
parte do workspace da raiz do repositório).

## Rodando localmente

```bash
cd CRM-RR
npm install
cp .env.example .env.local   # preencher com credenciais do Supabase/AI Gateway
npm run dev
```

## Docs

- [`docs/CRM_ARCHITECTURE.md`](docs/CRM_ARCHITECTURE.md) — arquitetura e stack
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — schema completo do Postgres
- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) — regras de negócio e enforcement
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — fases e progresso
- [`docs/CRM_GUIDE.md`](docs/CRM_GUIDE.md) — guia de uso (cresce por fase)
- [`docs/SALES_OPS_LEARNING.md`](docs/SALES_OPS_LEARNING.md) — conceitos de Sales Ops por feature
- [`docs/INTERVIEW_NOTES.md`](docs/INTERVIEW_NOTES.md) — registro do que foi de fato construído e usado

Status atual: Fase 1 (scaffold) em andamento — ver `docs/IMPLEMENTATION_PLAN.md`.
