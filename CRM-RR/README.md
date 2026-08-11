# CRM-RR

CRM operacional para prospecção B2B freelance. Projeto Next.js standalone (não faz
parte do workspace da raiz do repositório) — pipeline, qualificação estruturada,
follow-up, análise de perdas, e um módulo de IA assistiva com human-in-the-loop.

## Primeiros 30 minutos

1. **Rode localmente** (ver seção abaixo) e faça login com o usuário criado no
   Supabase Auth.
2. Vá em **Empresas → Nova empresa** e cadastre uma empresa real que você está
   prospectando. Repita para 2-3 empresas.
3. Em cada empresa, adicione o **contato** principal (Contatos → Novo contato).
4. Vá em **Pipeline → Nova oportunidade** e crie um deal real vinculado a uma
   dessas empresas, com valor estimado e fonte de aquisição.
5. Abra o deal criado e:
   - Preencha a **qualificação** (6 dimensões, com justificativa em cada uma).
   - Adicione uma **atividade** com data de follow-up.
   - Opcionalmente, clique em **"Analisar qualificação com IA"** para ver uma
     segunda opinião (exige `AI_GATEWAY_API_KEY` configurada — ver abaixo).
6. Arraste o card no **Kanban** (`/pipeline`) para o próximo estágio.
7. Abra **Meu Dia** (`/my-day`) — deve aparecer sua atividade se a data for hoje,
   ou o deal na seção "sem próxima ação" se você ainda não agendou nada.
8. Depois de ter 3+ deals com histórico, abra **Dashboard** para ver funil,
   duração por estágio e KPIs — tudo calculado dos seus dados reais, nada mockado.

A partir daqui é uso normal: toda prospecção nova vira empresa → contato → deal.

## Rodando localmente

```bash
cd CRM-RR
npm install
cp .env.example .env.local   # preencher com as credenciais abaixo
npm run dev
```

### Variáveis de ambiente (`.env.local`)

| Variável | Onde conseguir |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API Keys (só necessário para scripts server-only, não para rodar a aplicação) |
| `AI_GATEWAY_API_KEY` | Vercel Dashboard → Team Settings → AI Gateway → API Keys (necessário só para os botões de IA) |
| `CRON_SECRET` | Qualquer string aleatória (só necessário se/quando rotas `app/api/cron/*` forem usadas) |

**Passos únicos já feitos no Supabase** (projeto `fvgbbixxcapltudonxqx`, schema
`crm`, isolado do resto do projeto): schema `crm` exposto na Data API, usuário
único criado em Authentication → Users. Se precisar recriar o usuário: Dashboard →
Authentication → Users → Add user (marcar "Auto confirm user").

## Deploy

Projeto Vercel dedicado (`crm-rr`), separado do `rr-landing`:

1. No dashboard Vercel: **Add New → Project**, importar o mesmo repositório Git.
2. Em **Root Directory**, selecionar `CRM-RR`.
3. Adicionar as variáveis de ambiente da tabela acima em **Settings → Environment
   Variables**.
4. Deploy. Builds subsequentes disparam automaticamente a cada push que altere
   arquivos dentro de `CRM-RR/`.

## Como remover dados de demonstração

Este projeto **não vem com dados fictícios pré-carregados** — todo dado que
existir no banco é real, inserido por você. Ainda assim, toda tabela transacional
tem uma coluna `is_demo` e existe um botão em **Settings → Dados de demonstração**
(`purgeDemoData()`) que remove qualquer registro que eventualmente seja marcado
como demo, sem tocar em configuração real (pipeline, motivos de perda, critérios
de qualificação, prompts de IA, fontes de lead).

## Como funciona a análise de IA

Cada deal tem 3 ações de IA (via Vercel AI Gateway, modelo `anthropic/claude-sonnet-5`):
**Analisar qualificação**, **Resumir** e **Rascunhar e-mail de follow-up**. Nenhuma
delas aplica nada ao CRM sozinha — toda sugestão fica pendente até você clicar
"Aplicar"/"Útil" ou "Rejeitar" (nesse caso, categorizando o erro). Toda execução
fica registrada em `crm.ai_runs`, com métricas visíveis em `/ai-quality`.

## Como funciona o versionamento de prompt

Prompts vivem em `crm.ai_prompts`, nunca são sobrescritos — cada edição cria uma
nova versão. `/prompt-lab` permite criar uma nova versão, ativá-la, e comparar
duas versões lado a lado rodando o mesmo input real antes de decidir qual usar.

## Métricas já disponíveis

`/dashboard`: oportunidades ativas, valor em pipeline/ganho/perdido, win rate,
ticket médio, funil de conversão por estágio, duração média por estágio, motivos
de perda, performance por fonte de aquisição, e detecção automática de possíveis
gargalos (dado + interpretação separados). `/ai-quality`: taxa de aceitação e
erros de IA por categoria. `/analytics/sql-learning`: o SQL real por trás de cada
métrica, com explicação.

## O que falta / próximos passos sugeridos

- Testar o fluxo completo (definition of done da spec original) com dados reais
  de prospecção, incluindo os botões de IA (precisa de `AI_GATEWAY_API_KEY`).
- Criar o projeto Vercel `crm-rr` e fazer o primeiro deploy real.
- Popular o CRM com o histórico real de prospecção do usuário (import em lote,
  combinado separadamente).
- Considerar UI de edição para pipeline/critérios de qualificação/motivos de
  perda/fontes (hoje são editáveis via SQL — visíveis mas não editáveis em
  `/settings`).

## Docs

- [`docs/CRM_ARCHITECTURE.md`](docs/CRM_ARCHITECTURE.md) — arquitetura e stack
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — schema completo do Postgres
- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) — regras de negócio e enforcement
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — fases e progresso
- [`docs/CRM_GUIDE.md`](docs/CRM_GUIDE.md) — guia de uso completo
- [`docs/SALES_OPS_LEARNING.md`](docs/SALES_OPS_LEARNING.md) — conceitos de Sales Ops por feature
- [`docs/INTERVIEW_NOTES.md`](docs/INTERVIEW_NOTES.md) — registro do que foi de fato construído e usado

Status atual: Fases 1-9 implementadas — ver `docs/IMPLEMENTATION_PLAN.md`.
